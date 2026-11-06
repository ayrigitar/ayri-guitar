'use strict';
/* Diskon di Kasir: satu potongan (Rp) per transaksi untuk barang & jasa cepat. Total, sisa DP, nota, struk, catatan penjualan stok,
   dan untung di Rekap semuanya memakai harga setelah diskon. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca, hariIni } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, A: d.A, L: d.L };
}
const hari = hariIni();
const senar = (o) => stokContoh(null, 1, Object.assign({ id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', kondisi: 'baru', sub: 'Senar', merek: 'Orphee', nama: 'QA140', jumlah: 3, harga_jual: 100000, harga_beli: 60000 }, o));

test('hitungJual: diskon mengurangi total, tidak pernah melebihi harga barang', () => {
    const { L } = require('./helper').bikinPerangkat(siapkanRepo(bikinGitHub()));
    const h = L.hitungJual({ items: [{ harga: 100000, qty: 2 }], diskon: 20000, bayar: [{ jumlah: 100000 }] });
    assert.equal(h.subtotal, 200000); assert.equal(h.diskon, 20000); assert.equal(h.total, 180000); assert.equal(h.sisa, 80000);
    assert.equal(L.hitungJual({ items: [{ harga: 50000, qty: 1 }], diskon: 90000 }).total, 0, 'diskon dibatasi sebesar harga');
    assert.equal(L.hitungJual({ items: [{ harga: 50000, qty: 1 }] }).diskon, 0, 'transaksi lama tanpa diskon tetap sama');
    assert.equal(L.faktorDiskon({ items: [{ harga: 200000, qty: 1 }], diskon: 50000 }), 0.75);
});

test('transaksi berdiskon: lunas dengan total setelah diskon, catatan penjualan stok memakai harga setelah diskon', async () => {
    const { A, L } = await mulai();
    const s = await A.simpanStok(senar({}), []);
    const j = await A.simpanJual({ nama: 'Budi', hp: '081234567890', tgl: hari, catatan: 'Kasir', status: 'selesai', diskon: 20000,
        items: [{ stok_id: s.id, kode: s.kode, nama: 'Senar Orphee QA140', qty: 2, harga: 100000 }],
        bayar: [{ id: 'b1', tgl: hari, jumlah: 180000, jenis: 'pelunasan', metode: 'tunai' }] });
    const h = L.hitungJual(j);
    assert.equal(h.total, 180000); assert.equal(h.lunas, true); assert.equal(h.sisa, 0);
    const st = A.daftar('stok').filter((x) => x.id === s.id)[0];
    assert.equal(st.jumlah, 1);
    assert.equal(st.penjualan[0].harga, 90000, 'untung per unit dihitung dari harga setelah diskon');
    assert.match(L.pesanJual.lunas(j), /LUNAS/);
    assert.match(L.pesanJual.dp(Object.assign({}, j, { batas_lunas: hari })), /• Diskon – -Rp\s?20\.000/);
    const struk = L.strukThermal({ waktu: new Date(), items: j.items, total: h.total, diskon: h.diskon, metode: 'tunai', dibayar: h.total, diterima: 180000, kode: [j.kode], nota: [] }).map((b) => b.t).join('\n');
    assert.match(struk, /Subtotal\s+Rp\s?200\.000/); assert.match(struk, /Diskon\s+-Rp\s?20\.000/); assert.match(struk, /TOTAL\s+Rp\s?180\.000/);
});

test('admin & nota: kolom diskon di kasir, tersimpan di transaksi, tampil di nota online, rekap memakai harga setelah diskon', () => {
    const kode = baca('admin.js'), nota = baca('nota-jual.html');
    assert.match(kode, /id="ks-diskon" type="text" inputmode="numeric" autocomplete="off" data-rp/);
    assert.match(kode, /\[5, 10\]\.map\(function \(p\) \{ return '<button type="button" class="ly-btn ly-btn--sm" data-persen="' \+ p/);
    assert.match(kode, /function diskonKr\(\) \{ return Math\.min\(barangKr\(\),/, 'diskon hanya untuk barang & jasa cepat, tidak melebihi harganya');
    assert.match(kode, /if \(diskon\) rec\.diskon = diskon;/);
    assert.match(kode, /- diskon, dibayar = bayar\.dp/, 'jumlah bayar transaksi = harga barang − diskon');
    assert.match(kode, /var fk = L\.faktorDiskon\(j\);/, 'rekap: untung & omzet setelah diskon');
    assert.match(nota, /h\.diskon \? '<div><span>Subtotal<\/span>/);
    assert.match(baca('layanan.js'), /diskon: \+j\.diskon \|\| 0,/, 'diskon ikut ke nota publik');
});
