'use strict';
/* Jasa cepat di Kasir: jasa (pekerjaan sambil menunggu, tanpa garansi) ikut satu transaksi jual dengan barang, tidak menyentuh stok,
   tidak masuk menu Servis, dan dihitung terpisah di Rekap. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca, hariIni } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, A: d.A, L: d.L };
}
const hari = hariIni();
const senar = (o) => stokContoh(null, 1, Object.assign({ id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', kondisi: 'baru', sub: 'Senar', merek: 'Orphee', nama: 'QA140', jumlah: 3, harga_jual: 90000 }, o));
const jasa = (nama, harga, qty) => ({ jenis: 'jasa', kode: '', nama, qty: qty || 1, harga });

test('jasa cepat + barang dalam satu transaksi: hanya barang mengurangi stok, jasa ikut di total dan nota', async () => {
    const { A, L } = await mulai();
    const s = await A.simpanStok(senar({}), []);
    const j = await A.simpanJual({ nama: '', hp: '', tgl: hari, catatan: 'Kasir', status: 'selesai',
        items: [{ stok_id: s.id, kode: s.kode, nama: 'Senar Orphee QA140', qty: 1, harga: 90000 }, jasa('Pasang senar', 25000)],
        bayar: [{ id: 'b1', tgl: hari, jumlah: 115000, jenis: 'pelunasan', metode: 'tunai' }] });
    assert.equal(L.hitungJual(j).total, 115000);
    assert.equal(L.hitungJual(j).lunas, true);
    const stok = A.daftar('stok').filter((x) => x.id === s.id)[0];
    assert.equal(stok.jumlah, 2, 'hanya satu unit senar berkurang');
    assert.equal(stok.penjualan.length, 1, 'jasa tidak dicatat sebagai penjualan barang');
    assert.equal(A.daftar('servis').length, 0, 'tidak ada catatan servis');
    assert.deepEqual(j.items.map((i) => i.jenis || 'stok'), ['stok', 'jasa']);
    assert.equal(L.namaJual(j), 'Senar Orphee QA140, Pasang senar');

    /* batal: stok kembali, jasa tidak membuat galat */
    const b = await A.simpanJual(Object.assign({}, j, { status: 'batal', batal_oleh: 'pembeli' }));
    assert.equal(A.daftar('stok').filter((x) => x.id === s.id)[0].jumlah, 3);
    assert.equal(b.status, 'batal');
    await A.hapusJual(b);
    assert.equal(A.daftar('jual').length, 0);
});

test('jasa cepat saja (tanpa barang): tersimpan sebagai transaksi, stok tidak disentuh', async () => {
    const { A, L } = await mulai();
    const s = await A.simpanStok(senar({}), []);
    const j = await A.simpanJual({ nama: 'Budi', hp: '', tgl: hari, catatan: 'Kasir', status: 'selesai', items: [jasa('Ganti baterai', 15000, 2)],
        bayar: [{ id: 'b1', tgl: hari, jumlah: 30000, jenis: 'pelunasan', metode: 'tunai' }] });
    assert.equal(L.hitungJual(j).total, 30000);
    assert.equal(A.daftar('stok').filter((x) => x.id === s.id)[0].jumlah, 3);
    assert.equal(A.daftar('jual').length, 1);
});

test('kode: tombol Jasa cepat di Kasir, jasa ikut transaksi jual, rekap & detail aman, logo di kop nota', () => {
    const adm = baca('admin.js'), lay = baca('layanan.js'), css = baca('layanan.css');
    assert.match(adm, /class="ly-btn ks-jasa" data-jasa aria-haspopup="dialog">\+ Jasa cepat/);
    assert.match(adm, /function bukaJasaCepat\(\)/);
    assert.match(adm, /kr\.items\.push\(\{ jenis: 'jasa'/);
    assert.match(adm, /i\.jenis === 'stok' \|\| i\.jenis === 'jasa'/, 'jasa ikut transaksi jual');
    assert.match(adm, /if \(i\.jenis === 'jasa'\) \{ r\.jasa \+= /, 'rekap: jasa terpisah dari unit barang');
    assert.match(adm, /it\.stok_id \? '<a href="#stok\//, 'detail penjualan: jasa tanpa tautan stok');
    assert.match(lay, /if \(it\.jenis === 'jasa'\) return;/);
    assert.match(lay, /class="nota-logo" src="logo\/ayri-logo\.svg"/);
    assert.match(css, /\.nota-logo \{/);
});
