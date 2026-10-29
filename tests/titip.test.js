'use strict';
/* Titip jual (konsinyasi), Tahap 1: komisi, data hanya di repo owner, karyawan tidak bisa melihat atau menulis, stok titipan terkunci dari penjualan. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, hariIni } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub(), {});
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, d, A: d.A, L: d.L };
}
const titipContoh = (ekstra) => Object.assign({
    nama: 'Bu Sari Wulandari', hp: '081355550001', nik: '', gitar_jenis: 'Elektrik', gitar_merk: 'Ibanez RG', warna: 'Hitam', no_seri: 'SN-RAHASIA-777', kelengkapan: 'lecet kecil, softcase',
    tgl_masuk: hariIni(), harga_jual: 6000000, harga_min: 5200000, komisi_persen: 15, komisi_min: 150000, batas_mahal: 10000000, persen_mahal: 10,
    status: 'aktif', disetujui: null, catatan_admin: 'titipan teman', foto: [], pengingat: []
}, ekstra || {});
const foto = (tahap) => ({ tahap, hasil: { besar: new Blob([Buffer.from('foto-besar-' + tahap)], { type: 'image/webp' }), kecil: new Blob([Buffer.from('foto-kecil-' + tahap)], { type: 'image/webp' }) } });

test('komisi: 15% dari harga jual yang sebenarnya, minimal Rp150 ribu, 10% bila di atas Rp10 juta', async () => {
    const { L } = await mulai();
    const t = titipContoh();
    const k = (h) => L.hitungKomisiTitip(t, h);
    assert.equal(k(6000000).komisi, 900000); assert.equal(k(6000000).bagianPemilik, 5100000);
    assert.equal(k(900000).komisi, 150000, 'harga murah: komisi minimal berlaku (15% = 135 ribu)');
    assert.equal(k(100000).komisi, 100000, 'komisi tidak pernah melebihi harga jual'); assert.equal(k(100000).bagianPemilik, 0);
    assert.equal(k(10000000).komisi, 1500000, 'tepat Rp10 juta masih 15%');
    assert.equal(k(10100000).komisi, 1010000, 'di atas Rp10 juta: 10%');
    assert.equal(k(5400000).komisi, 810000, 'laku setelah ditawar: komisi mengikuti harga yang sebenarnya');
    assert.equal(k(0).komisi, 0);
});

test('komisi memakai angka yang tersimpan di catatan, bukan pengaturan hari ini', async () => {
    const { L } = await mulai();
    const t = titipContoh({ komisi_persen: 20, komisi_min: 300000 });
    assert.equal(L.hitungKomisiTitip(t, 2000000).komisi, 400000);
    assert.equal(L.hitungKomisiTitip(t, 1000000).komisi, 300000);
    assert.equal(JSON.stringify(L.komisiBawaanTitip()), JSON.stringify({ komisi_persen: 15, komisi_min: 150000, batas_mahal: 10000000, persen_mahal: 10 }));
    assert.match(L.ringkasKomisiTitip(t), /20% dari harga jual \(minimal Rp300\.000\), dan 10% bila harga jual di atas Rp10\.000\.000/);
});

test('owner menyimpan titipan: data, KTP (opsional) dan foto hanya di repo owner', async () => {
    const { gh, A } = await mulai();
    const t = await A.simpanTitip(titipContoh({ nik: '3201019999000011' }), [foto('gitar'), foto('ktp')]);
    assert.match(t.kode, /^TTP-/);
    assert.equal(t.foto.length, 2);
    assert.equal(gh.json('ayri-servis-data', 'titip.json').length, 1);
    assert.ok(gh.daftarFile('ayri-servis-data').filter((p) => p.startsWith('foto/')).length >= 4, 'foto besar + kecil di repo owner');
    for (const repo of ['ayri-toko-data', 'ayri-guitar']) {
        assert.ok(!gh.daftarFile(repo).some((p) => p.startsWith('foto/') && p.endsWith('.bin')), repo + ' tidak boleh berisi foto titipan');
        assert.equal(gh.isi(repo, 'titip.json'), null, repo + ' tidak punya titip.json');
        const semua = gh.daftarFile(repo).map((p) => gh.isi(repo, p) || '').join('\n');
        for (const rahasia of ['Sari Wulandari', '081355550001', '3201019999000011', '5200000', 'SN-RAHASIA-777']) assert.ok(!semua.includes(rahasia), repo + ' membocorkan ' + rahasia);
    }
});

test('KTP opsional: titipan tanpa NIK dan tanpa foto KTP tersimpan, dan boleh diubah lagi', async () => {
    const { gh, A } = await mulai();
    const t = await A.simpanTitip(titipContoh(), []);
    assert.equal(t.nik, ''); assert.equal(t.foto.length, 0);
    const ubah = Object.assign({}, t, { harga_jual: 5800000 });
    const t2 = await A.simpanTitip(ubah, []);
    assert.equal(t2.kode, t.kode); assert.equal(gh.json('ayri-servis-data', 'titip.json').length, 1);
    assert.equal(gh.json('ayri-servis-data', 'titip.json')[0].harga_jual, 5800000);
});

test('diambil pemilik: tanggal terisi; hapus titipan ikut menghapus fotonya', async () => {
    const { gh, A } = await mulai();
    const t = await A.simpanTitip(titipContoh(), [foto('gitar')]);
    const s = await A.simpanTitip(Object.assign({}, t, { status: 'diambil' }), []);
    assert.equal(s.tgl_diambil, hariIni());
    await A.hapusTitip(s);
    assert.equal(gh.json('ayri-servis-data', 'titip.json').length, 0);
    assert.equal(gh.daftarFile('ayri-servis-data').filter((p) => p.startsWith('foto/')).length, 0);
});

test('karyawan: tidak melihat titipan, tidak ada di cadangan, dan tidak bisa menulis', async () => {
    const { gh, A } = await mulai();
    await A.simpanTitip(titipContoh(), []);
    const k = bikinPerangkat(gh, { token: 'tok-karyawan' }); await k.masuk();
    assert.equal(k.A.peran(), 'karyawan');
    const d = await k.A.muat();
    assert.deepEqual(d.titip, []);
    assert.ok(!('titip' in k.A.cadangan()), 'cadangan karyawan tanpa titipan');
    await assert.rejects(k.A.simpanTitip(titipContoh(), []), /owner/i);
    assert.equal(gh.json('ayri-servis-data', 'titip.json').length, 1, 'data owner tidak berubah');
});

test('stok titipan: terkunci dari penjualan, penanda tidak bocor ke katalog publik', async () => {
    const { gh, A, L } = await mulai();
    const t = await A.simpanTitip(titipContoh(), []);
    const s = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, harga_jual: 6000000, harga_beli: 0, sumber_titip: t.id, asal: 'Titip jual ' + t.kode }), []);
    assert.equal(s.sumber_titip, t.id);
    assert.equal(L.titipanTerkunci(s), true);
    assert.equal(L.titipanTerkunci({ id: 'x' }), false);
    const kat = gh.isi('ayri-guitar', 'data/katalog.json');
    assert.ok(kat.includes(s.kode), 'gitar titipan tetap tampil di katalog');
    for (const bocor of [t.id, 'sumber_titip', 'Sari', '081355550001', t.kode]) assert.ok(!kat.includes(bocor), 'katalog membocorkan ' + bocor);
    const stokBersama = gh.json('ayri-toko-data', 'stok.json')[0];
    assert.ok(!('nama' in stokBersama) && !JSON.stringify(stokBersama).includes('081355550001') && !JSON.stringify(stokBersama).includes('5200000'));
});

test('tinjau harga: muncul setelah 60 hari belum terjual, lalu menunggu 60 hari sejak pengingat terakhir', async () => {
    const { L } = await mulai();
    const h = hariIni();
    const t = titipContoh({ tgl_masuk: L.tambahHari(h, -59) });
    assert.equal(L.perluTinjauTitip(t, h), false);
    assert.equal(L.perluTinjauTitip(Object.assign({}, t, { tgl_masuk: L.tambahHari(h, -60) }), h), true);
    assert.equal(L.perluTinjauTitip(Object.assign({}, t, { tgl_masuk: L.tambahHari(h, -90), pengingat: [L.tambahHari(h, -10)] }), h), false);
    assert.equal(L.perluTinjauTitip(Object.assign({}, t, { tgl_masuk: L.tambahHari(h, -90), status: 'diambil' }), h), false);
});

test('surat titip: ketentuan terisi angka kesepakatan, struk tidak memuat harga minimum', async () => {
    const { L } = await mulai();
    const t = Object.assign({ kode: 'TTP-ABC123' }, titipContoh());
    const wa = L.pesanTitip.konfirmasi(t);
    assert.match(wa, /Rp6\.000\.000/); assert.match(wa, /Rp5\.200\.000/); assert.match(wa, /15% dari harga jual/); assert.match(wa, /SETUJU/);
    assert.ok(!/\{[a-z]+\}/.test(wa), 'tidak ada penanda {..} yang tersisa');
    assert.match(wa, /rusak atau hilang karena kelalaian toko/);
    const struk = L.strukTitip(t).map((b) => b.t).join('\n');
    assert.match(struk, /TTP-ABC123/); assert.match(struk, /\*\*\*\*0001/);
    assert.ok(!struk.includes('5.200.000') && !struk.includes('5200000'), 'harga minimum tidak dicetak di bukti');
    assert.ok(!struk.includes('081355550001'));
});
