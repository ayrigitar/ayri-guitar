'use strict';
/* Tukar unit 1x24 jam: sudah bayar penuh = uang tidak dikembalikan, jadi kredit tukar; potongan 10% hanya untuk DP/cicil yang dibatalkan pembeli. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca, hariIni } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, A: d.A, L: d.L };
}
const hari = hariIni();
const jualLunas = (s, harga) => ({ nama: '', hp: '', tgl: hari, catatan: 'Kasir', status: 'selesai', items: [{ stok_id: s.id, kode: s.kode, nama: 'Cort AD810', qty: 1, harga }], bayar: [{ id: 'b1', tgl: hari, jumlah: harga, jenis: 'pelunasan', metode: 'tunai' }] });

test('hitungan: ditukar = tanpa potongan dan tanpa uang kembali; batal pembeli biasa tetap 10%', async () => {
    const { L } = await mulai();
    const dasar = { items: [{ harga: 1000000, qty: 1 }], bayar: [{ jumlah: 900000, jenis: 'pelunasan' }] };
    const tukar = L.hitungJual(Object.assign({}, dasar, { batal_oleh: 'tukar' }));
    assert.equal(tukar.potongan, 0); assert.equal(tukar.harusKembali, 0);
    const pembeli = L.hitungJual(Object.assign({}, dasar, { batal_oleh: 'pembeli' }));
    assert.equal(pembeli.potongan, 100000); assert.equal(pembeli.harusKembali, 800000);
    assert.equal(L.hitungJual(Object.assign({}, dasar, { batal_oleh: 'toko' })).harusKembali, 900000);
});

test('tukar unit: barang kembali ke stok, uang jadi kredit, kredit dipakai membeli unit lain', async () => {
    const { A, L } = await mulai();
    const cort = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, gitar_merk: 'Cort AD810', harga_jual: 900000 }), []);
    const lain = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, gitar_merk: 'Yamaha F310', harga_jual: 1100000 }), []);
    let j = await A.simpanJual(jualLunas(cort, 900000));
    assert.equal(A.daftar('stok').filter((x) => x.id === cort.id)[0].status, 'terjual');
    /* tukar: batal tanpa uang kembali, kredit tercatat */
    j = await A.simpanJual(Object.assign({}, j, { status: 'batal', batal_oleh: 'tukar', kredit: { jumlah: 900000, tgl: hari, dipakai: [] } }));
    const stokCort = A.daftar('stok').filter((x) => x.id === cort.id)[0];
    assert.equal(stokCort.status, 'tersedia'); assert.equal(stokCort.jumlah, 1); assert.equal(stokCort.penjualan.length, 0);
    assert.ok(!j.bayar.some((b) => b.jenis === 'refund'), 'tidak ada uang dikembalikan');
    assert.deepEqual({ ...L.kreditTukar(j) }, { jumlah: 900000, dipakai: 0, sisa: 900000, tgl: hari });
    /* unit lain Rp1.100.000: kredit 900.000 + tunai 200.000 */
    const baru = await A.simpanJual({ nama: '', hp: '', tgl: hari, catatan: 'Kasir', status: 'selesai', items: [{ stok_id: lain.id, kode: lain.kode, nama: 'Yamaha F310', qty: 1, harga: 1100000 }],
        bayar: [{ id: 'k1', tgl: hari, jumlah: 900000, jenis: 'pelunasan', metode: 'tukar' }, { id: 'k2', tgl: hari, jumlah: 200000, jenis: 'pelunasan', metode: 'tunai' }] });
    assert.equal(L.hitungJual(baru).lunas, true, 'kredit + tunai = lunas');
    const asal = await A.simpanJual(Object.assign({}, j, { kredit: Object.assign({}, j.kredit, { dipakai: [{ kode: baru.kode, jumlah: 900000, tgl: hari }] }) }));
    assert.equal(L.kreditTukar(asal).sisa, 0, 'kredit habis terpakai');
    assert.equal(L.kreditTukar(Object.assign({}, asal, { batal_oleh: 'pembeli' })), null, 'hanya transaksi ditukar yang punya kredit');
});

test('antarmuka: tombol Tukar unit untuk yang sudah bayar penuh, kredit di Kasir, tanpa uang masuk ganda', () => {
    const kode = baca('admin.js');
    const jual = kode.slice(kode.indexOf('function gambarJual2()'), kode.indexOf('function gambarBayarJual()'));
    assert.match(jual, /j\.status === 'dp' \? '<button type="button" class="ly-btn" id="jl-batal-p">Batal \(pembeli\)<\/button>/, 'potongan 10% (Batal pembeli) hanya untuk DP');
    assert.match(jual, /id="jl-tukar">Tukar unit \(1x24 jam\)<\/button><button type="button" class="ly-btn" id="jl-batal-t">Dibatalkan toko/);
    assert.match(jual, /Sudah bayar penuh: uang tidak dikembalikan/);
    assert.match(kode, /j\.batal_oleh = 'tukar'; j\.kredit = \{ jumlah: h\.dibayar/);
    assert.match(kode, /if \(b\.metode === 'tukar'\) return;/, 'kredit tukar bukan uang masuk baru di rekap/kas');
    assert.match(kode, /id="km-pakai-kredit"/); assert.match(kode, /metode: 'tukar' \}\);/);
    assert.match(kode, /g: 'Kredit tukar'/);
    assert.match(baca('nota-jual.html'), /Menjadi kredit tukar \(tidak dikembalikan\)/);
});
