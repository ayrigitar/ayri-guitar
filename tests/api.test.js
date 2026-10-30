'use strict';
/* Perilaku dasar Layanan.api terhadap GitHub palsu: servis, stok, jual, kas, absen, opname, tebus, artikel, offline, pemindahan data. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, jualContoh, servisContoh, hariIni } = require('./helper');

async function mulai(o) {
    o = o || {};
    const gh = siapkanRepo(bikinGitHub(o.gh), { data: o.data, owner: o.owner, situs: o.situs });
    const d = bikinPerangkat(gh, o.perangkat);
    await d.masuk();
    return { gh, d, A: d.A, L: d.L };
}

test('servis: simpan baru, ubah, halaman pelanggan terenkripsi, hapus', async () => {
    const { gh, A } = await mulai();
    const r = await A.simpanServis(servisContoh('Budi', '081234567890'), []);
    assert.match(r.kode, /^AYR-[A-Z0-9]{6}$/);
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 1);
    let pub = await A.cekPublik(r.kode, '7890');
    assert.equal(pub.nama, 'Budi'); assert.equal(pub.status, 'menunggu_dp');
    assert.equal(await A.cekPublik(r.kode, '0000'), null, '4 digit HP yang salah tidak boleh membuka');
    const r2 = await A.simpanServis(Object.assign({}, r, { status: 'dikerjakan', bayar: [{ id: 'b1', tgl: hariIni(), jumlah: 50000, jenis: 'dp', metode: 'tunai' }] }), []);
    assert.equal(r2.id, r.id);
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 1);
    pub = await A.cekPublik(r.kode, '7890'); assert.equal(pub.status, 'dikerjakan');
    await A.hapusServis(r2);
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 0);
    assert.equal(await A.cekPublik(r.kode, '7890'), null);
});

test('stok: modal hanya di repo owner, katalog publik tanpa modal', async () => {
    const { gh, A } = await mulai();
    const r = await A.simpanStok(stokContoh(null, 2, { id: undefined, kode: undefined, created_at: undefined }), []);
    assert.match(r.kode, /^STK-/);
    const s = gh.json('ayri-toko-data', 'stok.json')[0];
    assert.equal(s.harga_beli, undefined, 'modal tidak boleh ada di repo bersama');
    assert.equal(gh.json('ayri-servis-data', 'stok-rahasia.json')[r.id].harga_beli, 600000);
    const kat = gh.json('ayri-guitar', 'data/katalog.json');
    assert.equal(kat.item.length, 1); assert.equal(kat.item[0].harga, 1000000);
    assert.equal(JSON.stringify(kat).includes('harga_beli'), false);
    assert.equal(JSON.stringify(kat).includes('masuk'), false, 'tanggal masuk barang tidak dipublikasikan');
    await A.hapusStok(r);
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.length, 0);
});

test('stok: aksesoris selalu tersimpan sebagai baru, tanpa tingkat kondisi', async () => {
    const { gh, A } = await mulai();
    await A.simpanStok(stokContoh(null, 3, { id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', sub: 'Senar', nama: 'Orphee NX35', warna: 'Nylon Klasik Hard Tension', kondisi: 'bekas', tingkat: 'mint' }), []);
    const s = gh.json('ayri-toko-data', 'stok.json')[0], k = gh.json('ayri-guitar', 'data/katalog.json').item[0];
    assert.equal(s.kondisi, 'baru');
    assert.equal(k.kondisi, 'baru'); assert.equal(k.tingkat, undefined); assert.equal(k.warna, 'Nylon Klasik Hard Tension');
});

test('stok: tiap barang di katalog punya halaman pratinjau unit/<kode>.html (tag WhatsApp), terhapus saat barang tidak lagi tampil', async () => {
    const { gh, A, L } = await mulai();
    const r = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, gitar_jenis: 'Bass', gitar_merk: 'Fender Aerodyne', warna: 'Hitam', tingkat: 'excellent', deskripsi: 'Jazz "Bass" <2003>' }), []);
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').v, 2);
    const halaman = gh.isi('ayri-guitar', 'unit/' + r.kode + '.html');
    assert.ok(halaman, 'halaman unit dibuat');
    assert.ok(halaman.includes('<meta property="og:title" content="Bass Fender Aerodyne – Rp1.000.000">'), 'judul tanpa kata Gitar untuk bass + harga');
    assert.ok(halaman.includes('Used Excellent') && halaman.includes('<link rel="canonical" href="' + L.urlUnit(r.kode) + '">'));
    assert.ok(halaman.includes('"@type":"Product"') && !halaman.includes('<2003>'), 'data produk ada, teks bebas di-escape');
    assert.ok(halaman.includes('unit.html?k=' + r.kode), 'diteruskan ke halaman unit');
    assert.ok(!halaman.includes('harga_beli'));
    /* ubah harga: halaman diperbarui; ditarik dari katalog: halaman dihapus */
    const r2 = await A.simpanStok(Object.assign({}, r, { harga_jual: 1250000 }), []);
    assert.ok(gh.isi('ayri-guitar', 'unit/' + r.kode + '.html').includes('Rp1.250.000'));
    await A.simpanStok(Object.assign({}, r2, { tampil: false }), []);
    assert.equal(gh.isi('ayri-guitar', 'unit/' + r.kode + '.html'), null, 'halaman unit dihapus bila barang keluar dari katalog');
});

test('stok: tingkat kondisi hanya tampil di katalog untuk gitar bekas, tanpa tingkat kunci tidak ditulis', async () => {
    const { gh, A } = await mulai();
    const baru = { id: undefined, kode: undefined, created_at: undefined };
    await A.simpanStok(stokContoh(null, 1, Object.assign({ gitar_jenis: 'Bass', gitar_merk: 'Fender Aerodyne', kondisi: 'bekas', tingkat: 'excellent' }, baru)), []);
    await A.simpanStok(stokContoh(null, 1, Object.assign({ gitar_merk: 'Yamaha Baru', kondisi: 'baru', tingkat: 'mint' }, baru)), []);
    await A.simpanStok(stokContoh(null, 1, Object.assign({ gitar_merk: 'Tanpa Nilai', kondisi: 'bekas' }, baru)), []);
    const item = gh.json('ayri-guitar', 'data/katalog.json').item, per = (n) => item.find((x) => x.nama === n);
    assert.equal(per('Fender Aerodyne').tingkat, 'Excellent');
    assert.equal('tingkat' in per('Yamaha Baru'), false, 'gitar baru tidak punya tingkat');
    assert.equal('tingkat' in per('Tanpa Nilai'), false, 'belum dinilai: kunci tidak ditulis');
});

test('jual: lunas mengurangi stok, DP menahan, batal mengembalikan, hapus mengembalikan', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 2), stokContoh('s2', 1)]) } });
    const stok = () => gh.json('ayri-toko-data', 'stok.json');
    const lunas = await A.simpanJual(jualContoh('Ani', '081111111111', 's1'));
    assert.equal(stok().find((x) => x.id === 's1').jumlah, 1);
    assert.equal(lunas.status, 'selesai');
    assert.equal((await A.cekPublik(lunas.kode, '1111', 'jual')).nama, 'Ani');
    const dp = await A.simpanJual(jualContoh('Budi', '082222222222', 's2', { status: undefined, bayar: [{ id: 'b-dp', tgl: hariIni(), jumlah: 300000, jenis: 'dp', metode: 'transfer' }] }));
    assert.equal(dp.status, 'dp');
    const s2 = stok().find((x) => x.id === 's2'); assert.equal(s2.jumlah, 0); assert.equal(s2.status, 'dipesan');
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.some((x) => x.kode === 'STK-S2'), false, 'barang yang ditahan hilang dari katalog');
    const batal = await A.simpanJual(Object.assign({}, dp, { status: 'batal', batal_oleh: 'pembeli' }));
    assert.equal(batal.status, 'batal');
    const s2b = stok().find((x) => x.id === 's2'); assert.equal(s2b.jumlah, 1); assert.equal(s2b.status, 'tersedia');
    await A.hapusJual(lunas);
    assert.equal(stok().find((x) => x.id === 's1').jumlah, 2);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1);
});

test('jual: stok tidak cukup ditolak', async () => {
    const { A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
    await A.simpanJual(jualContoh('A', '081111111111', 's1'));
    await assert.rejects(A.simpanJual(jualContoh('B', '082222222222', 's1')), /Stok .* tinggal 0/);
});

test('kas: buka kasir lalu catat pengeluaran', async () => {
    const { gh, A } = await mulai();
    const t = hariIni();
    await A.ubahKas(t, (rec) => { rec.saldo_awal = 100000; rec.buka_jam = '08:00'; });
    await A.ubahKas(t, (rec) => { rec.pengeluaran.push({ id: 'p1', jam: '09:00', ket: 'senar', jumlah: 25000, kategori: 'Lainnya', metode: 'tunai' }); });
    const kas = gh.json('ayri-toko-data', 'kas.json');
    assert.equal(kas.length, 1); assert.equal(kas[0].saldo_awal, 100000); assert.equal(kas[0].pengeluaran.length, 1);
});

test('absen: masuk lalu keluar memperbarui catatan yang sama', async () => {
    const { gh, A } = await mulai();
    const a = await A.simpanAbsen({ tgl: hariIni(), staf_id: 'st1', nama: 'Rani', masuk: '12:00', keluar: null, telat: 0 });
    await A.simpanAbsen(Object.assign({}, a, { keluar: '19:00' }));
    const list = gh.json('ayri-toko-data', 'absen.json');
    assert.equal(list.length, 1); assert.equal(list[0].keluar, '19:00');
});

test('opname: owner menyesuaikan stok, karyawan hanya melapor', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
    const item = { stok_id: 's1', kode: 'STK-S1', nama: 'Yamaha', sistem: 1, fisik: 3, catatan: 'ketemu 2 lagi' };
    const lapor = await A.simpanOpname({ oleh: 'Rani', peran: 'karyawan', items: [item] }, false);
    assert.equal(lapor.status, 'menunggu');
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 1);
    const ok = await A.simpanOpname(lapor, true);
    assert.equal(ok.status, 'disesuaikan');
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 3);
    assert.equal(gh.json('ayri-toko-data', 'opname.json').length, 1);
});

test('tebus: hanya owner; surat perjanjian terenkripsi di situs', async () => {
    const { gh, A } = await mulai();
    const t = await A.simpanTebus({ nama: 'Candra', hp: '083333333333', nik: '3201010101010001', gitar_jenis: 'Akustik', gitar_merk: 'Cort', tgl_beli: hariIni(), harga_beli: 900000, batas_tebus: '2099-01-01', metode: 'tunai', status: 'aktif', foto: [] }, []);
    assert.match(t.kode, /^TBS-/);
    assert.equal(gh.json('ayri-servis-data', 'tebus.json').length, 1);
    const pub = await A.cekPublik(t.kode, '3333', 'tebus');
    assert.equal(pub.nama, 'Candra'); assert.ok(!/3201010101010001/.test(JSON.stringify(pub)), 'NIK tidak boleh terbuka');
    const k = bikinPerangkat(gh, { token: 'tok-karyawan' }); await k.masuk();
    assert.equal(k.A.peran(), 'karyawan');
    await assert.rejects(k.A.simpanTebus({ nama: 'X', hp: '08123456789', harga_beli: 1, tgl_beli: hariIni(), batas_tebus: '2099-01-01' }, []), /owner/i);
});

test('artikel: terbit membuat halaman, kartu beranda, sitemap; hapus menariknya', async () => {
    const { gh, A } = await mulai();
    const a = await A.simpanArtikel({ judul: 'Setup Gitar', slug: 'setup-gitar', tag: 'Tips', ringkasan: 'ringkas', isi: '## Bagian\n\nisi', foto: [], status: 'terbit' });
    assert.ok(gh.isi('ayri-guitar', 'artikel-setup-gitar.html').includes('Setup Gitar'));
    assert.ok(gh.isi('ayri-guitar', 'index.html').includes('artikel-setup-gitar.html'));
    assert.ok(gh.isi('ayri-guitar', 'sitemap.xml').includes('artikel-setup-gitar.html'));
    await A.hapusArtikel(a);
    assert.equal(gh.isi('ayri-guitar', 'artikel-setup-gitar.html'), null);
    assert.ok(!gh.isi('ayri-guitar', 'index.html').includes('artikel-setup-gitar.html'));
});

test('pengaturan: hanya owner', async () => {
    const { gh, A } = await mulai();
    await A.simpanPengaturan({ staf: [{ id: 'st1', nama: 'Rani', aktif: true }], toleransi: 5 });
    assert.equal(gh.json('ayri-toko-data', 'pengaturan.json').staf[0].nama, 'Rani');
    const k = bikinPerangkat(gh, { token: 'tok-karyawan' }); await k.masuk();
    await assert.rejects(k.A.simpanPengaturan({ staf: [] }), /owner/i);
});

test('offline: penjualan masuk antrian lalu terkirim saat online', async () => {
    const { gh, d, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 2)]) } });
    d.offline(true);
    const r = await A.simpanJual(jualContoh('Dewi', '084444444444', 's1'));
    assert.equal(r._antri, true);
    assert.equal(A.statusOffline().antri, 1);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 0, 'belum terkirim');
    d.offline(false);
    const n = await A.kirimAntrian();
    assert.equal(n, 1);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 1);
    assert.equal(A.statusOffline().antri, 0);
});

test('bentrok sesaat (422) dicoba ulang; hapus file yang sudah tidak ada tidak menggagalkan', async () => {
    const { gh, A } = await mulai();
    const r = await A.simpanServis(servisContoh('Eko', '085555555555'), []);
    let gagalSekali = true;
    gh.hook = async (method, u, body, token, res) => { if (method === 'PATCH' && gagalSekali) { gagalSekali = false; return res({ message: 'Update is not a fast forward', status: '422' }, 422); } };
    await A.simpanServis(Object.assign({}, r, { keluhan: 'baru' }), []);
    assert.equal(gh.log.filter((x) => x.startsWith('PATCH')).length >= 2, true);
    assert.equal(gh.json('ayri-toko-data', 'servis.json')[0].keluhan, 'baru');
    gh.hook = null;
    /* file publik sudah hilang dari situs, tetapi catatan masih menunjuknya: penghapusan tetap berhasil */
    const g = bikinGitHub(); siapkanRepo(g);
    const d2 = bikinPerangkat(g); await d2.masuk();
    const s2 = await d2.A.simpanServis(servisContoh('Fani', '086666666666'), []);
    const pubPath = g.daftarFile('ayri-guitar').find((p) => p.startsWith('data/servis/'));
    const rr = g.repo('ayri-guitar'); const dasar = Object.assign({}, rr.commits[rr.head].files); delete dasar[pubPath];
    const c = 'c'.repeat(40); rr.commits[c] = { parent: rr.head, files: dasar, pesan: 'hapus manual' }; rr.head = c;
    await d2.A.hapusServis(s2);
    assert.equal(g.json('ayri-toko-data', 'servis.json').length, 0);
});

test('pindahkanData: repo owner lama dipecah ke repo bersama + modal rahasia', async () => {
    const gh = bikinGitHub();
    siapkanRepo(gh, { data: {}, owner: { 'servis.json': '[{"id":"v1","kode":"AYR-AAAAAA","created_at":"2026-01-01"}]', 'stok.json': JSON.stringify([stokContoh('s1', 1)]), 'jual.json': '[]', 'artikel.json': '[]' } });
    /* repo bersama belum berisi data: kosongkan */
    const r = gh.repo('ayri-toko-data'); r.commits[r.head].files = {};
    const d = bikinPerangkat(gh); await d.A.pasangToken(d.token, '123456'); await d.A.muat();
    assert.equal(d.A.statusPisah(), 'pindah');
    await d.A.pindahkanData();
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 1);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].harga_beli, undefined);
    assert.equal(gh.json('ayri-servis-data', 'stok-rahasia.json').s1.harga_beli, 600000);
    assert.equal(gh.isi('ayri-servis-data', 'servis.json'), null);
    assert.ok(gh.isi('ayri-servis-data', 'PINDAH.md'));
});
