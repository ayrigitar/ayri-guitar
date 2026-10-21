'use strict';
/* Dua perangkat menyimpan hampir bersamaan. Data tidak boleh saling menimpa, dan layar yang basi tidak boleh menimpa perubahan perangkat lain. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, jualContoh, servisContoh, hariIni, tidur } = require('./helper');

async function dua(o) {
    o = o || {};
    const gh = siapkanRepo(bikinGitHub({ latensi: [3, 25] }), { data: o.data, situs: o.situs });
    const a = bikinPerangkat(gh), b = bikinPerangkat(gh);
    await Promise.all([a.masuk(), b.masuk()]);
    return { gh, a, b };
}

test('dua perangkat menjual unit terakhir yang sama: satu berhasil, satu ditolak, tidak ada yang hilang', async () => {
    for (let putaran = 0; putaran < 4; putaran++) {
        const { gh, a, b } = await dua({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
        const hasil = await Promise.allSettled([a.A.simpanJual(jualContoh('A', '081111111111')), b.A.simpanJual(jualContoh('B', '082222222222'))]);
        const ok = hasil.filter((h) => h.status === 'fulfilled'), gagal = hasil.filter((h) => h.status === 'rejected');
        assert.equal(ok.length, 1, 'tepat satu penjualan berhasil (putaran ' + putaran + ')');
        assert.equal(gagal.length, 1);
        assert.match(gagal[0].reason.message, /Stok .* tinggal 0/);
        const jual = gh.json('ayri-toko-data', 'jual.json'), stok = gh.json('ayri-toko-data', 'stok.json')[0];
        assert.equal(jual.length, 1); assert.equal(jual[0].kode, ok[0].value.kode);
        assert.equal(stok.jumlah, 0); assert.equal(stok.penjualan.length, 1);
    }
});

test('dua perangkat menjual barang berbeda bersamaan: dua-duanya tersimpan dan stok konsisten', async () => {
    const { gh, a, b } = await dua({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1), stokContoh('s2', 1)]) } });
    await Promise.all([a.A.simpanJual(jualContoh('A', '081111111111', 's1')), b.A.simpanJual(jualContoh('B', '082222222222', 's2'))]);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 2);
    const stok = gh.json('ayri-toko-data', 'stok.json');
    assert.deepEqual(stok.map((s) => s.jumlah).sort(), [0, 0]);
    assert.equal(stok.every((s) => s.penjualan.length === 1), true);
    const kat = gh.json('ayri-guitar', 'data/katalog.json'); assert.equal(kat.item.length, 0);
});

test('kas: dua pengeluaran bersamaan dua-duanya tercatat', async () => {
    const { gh, a, b } = await dua(); const t = hariIni();
    await a.A.ubahKas(t, (r) => { r.saldo_awal = 0; r.buka_jam = '08:00'; });
    await Promise.all([
        a.A.ubahKas(t, (r) => { r.pengeluaran.push({ id: 'pa', ket: 'senar', jumlah: 10000, metode: 'tunai' }); }),
        b.A.ubahKas(t, (r) => { r.pengeluaran.push({ id: 'pb', ket: 'bensin', jumlah: 20000, metode: 'tunai' }); })
    ]);
    const kas = gh.json('ayri-toko-data', 'kas.json');
    assert.equal(kas.length, 1);
    assert.deepEqual(kas[0].pengeluaran.map((p) => p.id).sort(), ['pa', 'pb']);
});

test('servis berbeda disimpan bersamaan: dua-duanya ada', async () => {
    const { gh, a, b } = await dua();
    await Promise.all([a.A.simpanServis(servisContoh('A', '081111111111'), []), b.A.simpanServis(servisContoh('B', '082222222222'), [])]);
    assert.deepEqual(gh.json('ayri-toko-data', 'servis.json').map((s) => s.nama).sort(), ['A', 'B']);
});

test('absen dua karyawan bersamaan: dua-duanya ada', async () => {
    const { gh, a, b } = await dua();
    await Promise.all([a.A.simpanAbsen({ tgl: hariIni(), staf_id: 'x', nama: 'X', masuk: '12:00' }), b.A.simpanAbsen({ tgl: hariIni(), staf_id: 'y', nama: 'Y', masuk: '12:01' })]);
    assert.equal(gh.json('ayri-toko-data', 'absen.json').length, 2);
});

test('opname di satu perangkat dan penjualan barang lain di perangkat kedua: keduanya bertahan', async () => {
    const { gh, a, b } = await dua({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1), stokContoh('s2', 2)]) } });
    const item = { stok_id: 's1', kode: 'STK-S1', nama: 'Y', sistem: 1, fisik: 4, catatan: 'x' };
    await Promise.all([a.A.simpanOpname({ oleh: 'Owner', peran: 'owner', items: [item] }, true), b.A.simpanJual(jualContoh('B', '082222222222', 's2'))]);
    const stok = gh.json('ayri-toko-data', 'stok.json');
    assert.equal(stok.find((s) => s.id === 's1').jumlah, 4);
    assert.equal(stok.find((s) => s.id === 's2').jumlah, 1);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1);
});

test('layar basi tidak boleh menimpa perubahan perangkat lain pada catatan yang sama', async () => {
    const { gh, a, b } = await dua();
    const r = await a.A.simpanServis(servisContoh('Budi', '081234567890'), []);
    await b.A.muat();                                              /* perangkat B memuat catatan yang sama */
    const dariB = b.A.daftar('servis')[0];
    await a.A.simpanServis(Object.assign({}, r, { status: 'dikerjakan' }), []);   /* A mengubah dulu */
    await assert.rejects(b.A.simpanServis(Object.assign({}, dariB, { keluhan: 'diubah dari layar basi' }), []), (e) => e.bentrok === true && /perangkat lain/.test(e.message));
    const tersimpan = gh.json('ayri-toko-data', 'servis.json')[0];
    assert.equal(tersimpan.status, 'dikerjakan'); assert.equal(tersimpan.keluhan, 'Senar tinggi');
    await b.A.muat();                                              /* setelah memuat ulang, simpan berhasil */
    await b.A.simpanServis(Object.assign({}, b.A.daftar('servis')[0], { keluhan: 'baru' }), []);
    assert.equal(gh.json('ayri-toko-data', 'servis.json')[0].keluhan, 'baru');
});

test('stok yang sedang dibuka owner tidak boleh menimpa penjualan yang terjadi sesudahnya', async () => {
    const { gh, a, b } = await dua({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 3)]) } });
    await a.A.muat();
    const form = a.A.daftar('stok')[0];                           /* owner membuka form stok (jumlah 3) */
    await b.A.simpanJual(jualContoh('B', '082222222222', 's1'));   /* terjual 1 unit dari perangkat lain */
    await assert.rejects(a.A.simpanStok(Object.assign({}, form, { harga_jual: 1200000 }), []), (e) => e.bentrok === true);
    const s = gh.json('ayri-toko-data', 'stok.json')[0];
    assert.equal(s.jumlah, 2); assert.equal(s.penjualan.length, 1);
});

test('penerbitan artikel tidak menimpa perubahan index.html yang masuk sesaat sebelumnya', async () => {
    const { gh, a } = await dua();
    let sudah = false;
    gh.hook = async (method, u) => {
        if (method === 'PATCH' && u.pathname.includes('/ayri-guitar/') && !sudah) {
            sudah = true;                                         /* perubahan lain masuk ke index.html tepat sebelum commit kita */
            const r = gh.repo('ayri-guitar'), dasar = Object.assign({}, r.commits[r.head].files), s = 'e'.repeat(40);
            r.blobs[s] = Buffer.from(gh.isi('ayri-guitar', 'index.html') + '\n<!-- PERUBAHAN-LUAR -->'); dasar['index.html'] = s;
            const c = 'f'.repeat(40); r.commits[c] = { parent: r.head, files: dasar, pesan: 'perubahan luar' }; r.head = c;
        }
    };
    await a.A.simpanArtikel({ judul: 'Tes', slug: 'tes', tag: 't', ringkasan: 'r', isi: 'isi', foto: [], status: 'terbit' });
    const idx = gh.isi('ayri-guitar', 'index.html');
    assert.ok(idx.includes('PERUBAHAN-LUAR'), 'perubahan luar harus tetap ada');
    assert.ok(idx.includes('artikel-tes.html'), 'kartu artikel baru harus ada');
});

test('antrian offline yang bentrok dengan perubahan perangkat lain masuk daftar gagal, tidak menimpa', async () => {
    const { gh, a, b } = await dua();
    const r = await a.A.simpanServis(servisContoh('Budi', '081234567890'), []);
    await b.A.muat();
    a.offline(true);
    const q = await a.A.simpanServis(Object.assign({}, r, { keluhan: 'diubah offline' }), []);
    assert.equal(q._antri, true);
    await b.A.simpanServis(Object.assign({}, b.A.daftar('servis')[0], { status: 'dikerjakan' }), []);   /* B online mengubah lebih dulu */
    a.offline(false);
    await a.A.kirimAntrian();
    const st = a.A.statusOffline();
    assert.equal(st.antri, 0); assert.equal(st.gagal.length, 1); assert.match(st.gagal[0].pesan, /perangkat lain/);
    const tersimpan = gh.json('ayri-toko-data', 'servis.json')[0];
    assert.equal(tersimpan.status, 'dikerjakan'); assert.equal(tersimpan.keluhan, 'Senar tinggi');
});

test('pengaturan karyawan: simpanan kedua dari salinan basi ditolak', async () => {
    const { gh, a, b } = await dua();
    await a.A.simpanPengaturan({ staf: [{ id: 's', nama: 'A', aktif: true }], toleransi: 5 });
    await a.A.muat(); await b.A.muat();
    const dariA = a.A.pengaturan(), dariB = b.A.pengaturan();
    dariA.toleransi = 10; dariB.toleransi = 15;
    await a.A.simpanPengaturan(dariA);
    await assert.rejects(b.A.simpanPengaturan(dariB), (e) => e.bentrok === true);
    assert.equal(gh.json('ayri-toko-data', 'pengaturan.json').toleransi, 10);
});

test('setelah penjualan DP dibatalkan, barang kembali tersedia (bukan tetap "dipesan")', async () => {
    const { gh, a } = await dua({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
    const dp = await a.A.simpanJual(jualContoh('Budi', '082222222222', 's1', { status: undefined, bayar: [{ id: 'b', tgl: hariIni(), jumlah: 300000, jenis: 'dp', metode: 'transfer' }] }));
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].status, 'dipesan');
    await a.A.simpanJual(Object.assign({}, dp, { status: 'batal', batal_oleh: 'pembeli' }));
    const s = gh.json('ayri-toko-data', 'stok.json')[0];
    assert.equal(s.jumlah, 1); assert.equal(s.status, 'tersedia');
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item[0].status, 'tersedia', 'di katalog tidak boleh berlabel Dipesan');
});
