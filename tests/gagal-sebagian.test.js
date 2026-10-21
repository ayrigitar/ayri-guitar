'use strict';
/* Gagal di tengah jalan: langkah pertama sudah tersimpan, langkah kedua gagal. Simpan ulang harus menuntaskan tanpa menggandakan apa pun.
   Dan antrian offline berisi beberapa jenis transaksi harus terkirim berurutan dan utuh begitu internet kembali. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, jualContoh, servisContoh, hariIni } = require('./helper');

async function mulai(o) {
    const gh = siapkanRepo(bikinGitHub(), o), d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, d, A: d.A };
}
/* membuat satu permintaan yang cocok dengan syarat gagal (500) satu kali saja */
function gagalSekali(gh, cocok) {
    let sudah = false;
    gh.hook = async (method, u, body, token, res) => { if (!sudah && cocok(method, u)) { sudah = true; return res({ message: 'Server Error' }, 500); } };
}
const patchRepo = (nama) => (m, u) => m === 'PATCH' && u.pathname.includes('/' + nama + '/git/refs');

test('penjualan: katalog di situs gagal diperbarui -> data sudah tersimpan; Simpan ulang menuntaskan katalog tanpa menggandakan penjualan atau mengurangi stok dua kali', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 2)]) } });
    gagalSekali(gh, patchRepo('ayri-guitar'));
    const galat = await A.simpanJual(jualContoh('Ani', '081111111111', 's1')).then(() => null, (e) => e);
    assert.ok(galat && galat.sebagian === true, 'galat harus ditandai "sebagian"');
    assert.match(galat.message, /Data tersimpan.*Tekan Simpan sekali lagi/);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 1);
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json'), null, 'katalog di situs belum diperbarui');

    const ulang = await A.simpanJual(galat.rec);
    assert.equal(ulang.kode, galat.rec.kode);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1, 'penjualan tidak digandakan');
    const s = gh.json('ayri-toko-data', 'stok.json')[0];
    assert.equal(s.jumlah, 1, 'stok tidak dikurangi dua kali'); assert.equal(s.penjualan.length, 1);
    const kat = gh.json('ayri-guitar', 'data/katalog.json');
    assert.ok(kat && kat.item.length === 1 && kat.item[0].kode === s.kode, 'katalog sekarang sesuai stok terbaru');
});

test('penjualan terakhir: stok habis tetapi katalog gagal diperbarui -> ulangan Simpan menghapus barang dari katalog', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
    await A.simpanStok(Object.assign({}, A.daftar('stok')[0]), []);          /* terbitkan barang di katalog */
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.length, 1);
    gagalSekali(gh, patchRepo('ayri-guitar'));
    const galat = await A.simpanJual(jualContoh('Ani', '081111111111', 's1')).then(() => null, (e) => e);
    assert.ok(galat && galat.sebagian);
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.length, 1, 'masih tampil karena langkah situs gagal');
    await A.simpanJual(galat.rec);
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.length, 0, 'barang yang sudah terjual hilang dari katalog');
});

test('hapus penjualan terakhir: katalog gagal diperbarui -> ulangan hapus memunculkan barang kembali di katalog, stok kembali hanya sekali', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
    await A.simpanStok(Object.assign({}, A.daftar('stok')[0]), []);
    const j = await A.simpanJual(jualContoh('Ani', '081111111111', 's1'));
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.length, 0, 'terjual habis: hilang dari katalog');
    gagalSekali(gh, patchRepo('ayri-guitar'));
    const galat = await A.hapusJual(j).then(() => null, (e) => e);
    assert.ok(galat && galat.sebagian);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 0);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 1);
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.length, 0, 'katalog belum diperbarui karena langkah situs gagal');
    await A.hapusJual(j);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 1, 'stok tidak bertambah lagi');
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item.length, 1, 'barang tampil lagi di katalog');
});

test('servis baru: halaman pelanggan sudah terbit tetapi data utama gagal -> ulangan Simpan menghasilkan satu servis saja', async () => {
    const { gh, A } = await mulai();
    gagalSekali(gh, patchRepo('ayri-toko-data'));
    const galat = await A.simpanServis(servisContoh('Budi', '081234567890'), []).then(() => null, (e) => e);
    assert.ok(galat && galat.rec, 'galat membawa catatan untuk disimpan ulang');
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 0);
    const ulang = await A.simpanServis(galat.rec, []);
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 1, 'tepat satu servis');
    assert.equal(ulang.kode, galat.rec.kode, 'kode servis sama dengan yang sempat ditampilkan');
    assert.equal((await A.cekPublik(ulang.kode, '7890')).nama, 'Budi');
});

test('antrian offline berisi penjualan + pengeluaran kas + servis: terkirim berurutan, utuh, tanpa gagal', async () => {
    const { gh, d, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 3)]) } });
    const t = hariIni();
    await A.ubahKas(t, (r) => { r.saldo_awal = 100000; r.buka_jam = '08:00'; });
    d.offline(true);
    const j = await A.simpanJual(jualContoh('Ani', '081111111111', 's1'));
    const k = await A.ubahKas(t, (r) => { r.pengeluaran.push({ id: 'p1', ket: 'senar', jumlah: 5000, metode: 'tunai' }); });
    const sv = await A.simpanServis(servisContoh('Budi', '081234567890'), []);
    assert.ok(j._antri && k._antri && sv._antri);
    assert.equal(A.statusOffline().antri, 3);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 0, 'belum ada yang terkirim');
    assert.equal(A.daftar('stok')[0].jumlah, 2, 'stok di perangkat sudah berkurang supaya tidak terjual dua kali');

    d.offline(false);
    assert.equal(await A.kirimAntrian(), 3);
    const st = A.statusOffline();
    assert.equal(st.antri, 0); assert.deepEqual(st.gagal, []);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 2);
    assert.deepEqual(gh.json('ayri-toko-data', 'kas.json')[0].pengeluaran.map((p) => p.id), ['p1']);
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 1);
    assert.equal((await A.cekPublik(j.kode, '1111', 'jual')).nama, 'Ani');
});

test('antrian offline berhenti saat internet putus lagi di tengah pengiriman, lalu dilanjutkan tanpa menggandakan', async () => {
    const { gh, d, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 3)]) } });
    d.offline(true);
    await A.simpanJual(jualContoh('Ani', '081111111111', 's1'));
    await A.simpanServis(servisContoh('Budi', '081234567890'), []);
    d.offline(false);
    let n = 0;                                                                  /* putus tepat saat servis dikirim */
    gh.hook = async (method, u, body, token, res) => { if (method === 'PATCH' && u.pathname.includes('/ayri-toko-data/') && ++n === 2) { d.putus(true); } };
    await A.kirimAntrian().catch(() => {});
    d.putus(false); gh.hook = null;
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1);
    await A.kirimAntrian();
    assert.equal(A.statusOffline().antri, 0);
    assert.equal(gh.json('ayri-toko-data', 'jual.json').length, 1, 'penjualan tidak terkirim dua kali');
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 1);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 2);
});
