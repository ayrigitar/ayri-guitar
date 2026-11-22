'use strict';
/* Gitar seken: unit lain dengan merek & model yang sama dibuat lewat "Restock unit serupa" (catatan baru, kode baru),
   bukan dengan mengisi ulang catatan unit yang sudah terjual (riwayat jual, modal, foto, no. seri unit lama tetap utuh). */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, hariIni, baca } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub(), {});
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { A: d.A, L: d.L };
}
const kosong = () => ({ kategori: 'gitar', kondisi: 'bekas', tingkat: '', gitar_jenis: 'Akustik', merek: '', gitar_merk: '', fitur: [], warna: '', no_seri: '', deskripsi: '', jumlah: 1, harga_beli: 0, harga_jual: 0, tgl_masuk: '', asal: '', status: 'tersedia', tampil: true, penjualan: [], foto: [], catatan_admin: '' });
const lama = () => stokContoh('k1', 0, {
    kode: 'STK-LAMA01', status: 'terjual', merek: 'Fender', gitar_jenis: 'Bass', gitar_merk: 'Aerodyne', warna: 'Hitam Glossy', deskripsi: 'Made in Japan', fitur: ['Active PU'],
    tingkat: 'excellent', no_seri: 'JD123', harga_beli: 9000000, harga_jual: 13000000, asal: 'beli dari pelanggan', tampil: false, catatan_admin: 'catatan unit lama',
    foto: [{ id: 'f1' }], penjualan: [{ tgl: '2026-11-03', qty: 1, harga: 13000000 }]
});

test('restock unit serupa: yang sama ikut tersalin, yang khas per unit dikosongkan, unit lama tidak berubah', async () => {
    const { L } = await mulai();
    const s = lama(), asli = JSON.stringify(s);
    const r = L.salinUnitSerupa(s, kosong());
    for (const k of ['kategori', 'kondisi', 'gitar_jenis', 'merek', 'gitar_merk', 'warna', 'deskripsi', 'harga_jual']) assert.equal(r[k], s[k], k);
    assert.deepEqual(r.fitur, ['Active PU']); assert.notEqual(r.fitur, s.fitur, 'fitur disalin, bukan dibagi');
    assert.equal(r.tingkat, ''); assert.equal(r.no_seri, ''); assert.equal(r.harga_beli, 0); assert.equal(r.asal, '');
    assert.equal(r.foto.length, 0); assert.equal(r.penjualan.length, 0);
    assert.equal(r.jumlah, 1); assert.equal(r.status, 'tersedia'); assert.equal(r.tampil, true); assert.equal(r.tgl_masuk, hariIni());
    assert.equal(r.id, undefined); assert.equal(r.kode, undefined, 'kode baru dibuat saat disimpan');
    assert.match(r.catatan_admin, /Unit serupa dari STK-LAMA01\.$/);
    assert.equal(JSON.stringify(s), asli, 'unit lama tidak tersentuh');
});

test('restock unit serupa: hanya gitar seken (bukan aksesoris, barang baru, atau titipan)', async () => {
    const { L } = await mulai();
    assert.equal(L.bisaRestockSerupa(lama()), true);
    assert.equal(L.bisaRestockSerupa(stokContoh('k2', 1)), true, 'yang masih ada stoknya juga boleh (dua unit sekaligus)');
    assert.equal(L.bisaRestockSerupa(stokContoh('k3', 1, { kondisi: 'baru' })), false);
    assert.equal(L.bisaRestockSerupa(stokContoh('k4', 1, { kategori: 'aksesoris' })), false);
    assert.equal(L.bisaRestockSerupa(stokContoh('k5', 1, { sumber_titip: 't1' })), false);
    assert.equal(L.bisaRestockSerupa(null), false);
});

test('restock unit serupa: disimpan jadi catatan baru dengan kode baru; unit lama tetap Terjual dengan riwayatnya', async () => {
    const { A, L } = await mulai();
    const u1 = await A.simpanStok(Object.assign(lama(), { id: undefined, kode: undefined, foto: [] }));
    const u2 = await A.simpanStok(Object.assign(L.salinUnitSerupa(u1, kosong()), { tingkat: 'very-good', harga_beli: 8500000 }));
    assert.notEqual(u2.id, u1.id); assert.notEqual(u2.kode, u1.kode);
    assert.equal(u2.status, 'tersedia'); assert.equal(u2.jumlah, 1); assert.equal(u2.gitar_merk, 'Aerodyne');
    const lagi = A.daftar('stok').filter((x) => x.id === u1.id)[0];
    assert.equal(lagi.status, 'terjual'); assert.equal(lagi.penjualan.length, 1); assert.equal(lagi.no_seri, 'JD123');
});

test('admin: tombol Restock unit serupa di kartu Penjualan, rute #stok/baru/<id>, isian khas ditandai kuning, pesan blokir menyebutnya', () => {
    const js = baca('admin.js'), css = baca('layanan.css');
    assert.match(js, /L\.bisaRestockSerupa\(s\) \? '<div class="ly-btns" style="margin-top:10px"><button type="button" class="ly-btn' \+ \(adaStok\(s\) \? '' : ' ly-btn--pri'\) \+ '" id="sk-serupa">Restock unit serupa<\/button>/);
    assert.match(js, /else if \(b\.id === 'sk-serupa'\) \{ if \(dirty\) return toast\([^)]*\); pindah\('#stok\/baru\/' \+ s\.id\); \}/);
    assert.match(js, /bukaStok\(p\[1\] === 'baru' \? null : p\[1\], p\[1\] === 'baru' && p\[2\]\)/);
    assert.match(js, /if \(dari && !L\.bisaRestockSerupa\(dari\)\) dari = null;/, 'rute langsung ke titipan/aksesoris: form kosong biasa');
    assert.match(js, /Disalin dari <b>' \+ E\(sk\.dari\) \+ '<\/b>/);
    assert.match(js, /\['\[data-s="tingkat"\]', '\[data-s="no_seri"\]', '\[data-s="harga_beli"\]', '#sk-foto'\]/);
    assert.match(js, /t\.classList\.remove\('ly-isi-baru'\)/, 'tanda kuning hilang saat diisi');
    assert.match(css, /\.ly-isi-baru \{/);
    assert.match(js, /L\.bisaRestockSerupa\(asli\) \? '\\n\\nAda unit lain yang serupa\? Tekan Batal, lalu pakai tombol Restock unit serupa/);
});
