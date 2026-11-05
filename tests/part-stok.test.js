'use strict';
/* Part servis dari stok (mis. senar): stok berkurang saat servis disimpan, dalam SATU commit dengan servis.json;
   kembali bila part dihapus, servis dibatalkan, atau servis dihapus. Isian rupiah bertitik ribuan. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, servisContoh, baca } = require('./helper');

async function mulai(o) {
    const gh = siapkanRepo(bikinGitHub(), { data: o && o.data });
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, A: d.A, L: d.L };
}
const senar = () => stokContoh('sn', 3, { kategori: 'aksesoris', sub: 'Senar', nama: 'Senar Elixir 10', harga_jual: 185000 });
const part = (qty) => ({ jenis: 'part', nama: 'Senar Elixir 10', harga: 185000, qty, stok_id: 'sn', kode: 'STK-SN' });

test('part dari stok: berkurang saat simpan, simpan ulang aman, kembali saat dihapus / batal / servis dihapus', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([senar()]) } });
    const stok = () => gh.json('ayri-toko-data', 'stok.json')[0];
    let r = await A.simpanServis(Object.assign(servisContoh('Budi', '081234567890'), { items: [{ jenis: 'jasa', nama: 'Setup', harga: 100000, qty: 1 }, part(2)] }), []);
    assert.equal(stok().jumlah, 1, 'stok berkurang 2');
    assert.equal(stok().penjualan.length, 1); assert.equal(stok().penjualan[0].servis_id, r.id); assert.equal(stok().penjualan[0].qty, 2);
    r = await A.simpanServis(Object.assign({}, r, { catatan_publik: 'ok' }), []);
    assert.equal(stok().jumlah, 1, 'simpan ulang tanpa ubah part: stok tetap');
    r = await A.simpanServis(Object.assign({}, r, { items: [r.items[0], part(1)] }), []);
    assert.equal(stok().jumlah, 2, 'jumlah part dikurangi: stok kembali 1');
    await assert.rejects(A.simpanServis(Object.assign({}, r, { items: [r.items[0], part(5)] }), []), /Stok Senar Elixir 10 tinggal 2/);
    assert.equal(stok().jumlah, 2, 'ditolak: tidak berubah');
    r = await A.simpanServis(Object.assign({}, r, { status: 'batal' }), []);
    assert.equal(stok().jumlah, 3, 'servis batal: stok kembali penuh'); assert.equal(stok().penjualan.length, 0);
    r = await A.simpanServis(Object.assign({}, r, { status: 'antri' }), []);
    assert.equal(stok().jumlah, 2, 'dibuka lagi: part terpakai lagi');
    await A.hapusServis(r);
    assert.equal(stok().jumlah, 3, 'servis dihapus: stok kembali');
    assert.equal(gh.json('ayri-toko-data', 'servis.json').length, 0);
});

test('servis tanpa part stok tidak menyentuh stok.json', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([senar()]) } });
    const sebelum = gh.isi('ayri-toko-data', 'stok.json');
    await A.simpanServis(servisContoh('Ani', '082222222222'), []);
    assert.equal(gh.isi('ayri-toko-data', 'stok.json'), sebelum);
});

test('layar: isian rupiah bertitik, pilihan part dari stok, Rekap & halaman stok mengenali part servis', () => {
    const adm = baca('admin.js');
    assert.match(adm, /function titikRp\(v\)/);
    assert.match(adm, /Object\.defineProperty\(el, 'value'/, '.value tetap angka polos untuk kode lain');
    assert.ok(!/type="number" inputmode="numeric" min="0" step="\d{4,}"/.test(adm), 'semua isian rupiah sudah bertitik');
    assert.ok((adm.match(/data-rp/g) || []).length >= 28);
    assert.match(adm, /id="sv-stok" aria-label="Tambah part dari stok"/);
    assert.match(adm, /function tambahPartStok\(id\)/);
    assert.match(adm, /if \(p\.servis_id\) return '<div><span>'/, 'catatan penjualan dari servis ditautkan ke servisnya');
    assert.match(adm, /if \(!p\.servis_id \|\| String\(p\.tgl\)\.slice\(0, 7\) !== bln\) return;/, 'Rekap: part servis ikut dihitung');
});
