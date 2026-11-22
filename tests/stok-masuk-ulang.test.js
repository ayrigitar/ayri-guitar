'use strict';
/* Aksesoris/barang baru yang habis terjual boleh diisi lagi (restock) tanpa membatalkan penjualannya; barang bekas tetap harus lewat pembatalan transaksi. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub(), {});
    const d = bikinPerangkat(gh);
    await d.masuk();
    return d.L;
}
const terjual = (e) => Object.assign({ id: 'k1', status: 'terjual', jumlah: 0, kategori: 'aksesoris', kondisi: 'baru' }, e || {});
const jual = [{ id: 'j1', kode: 'JUL-AAA' }];

test('aksesoris habis terjual: menaikkan jumlah = stok masuk (ditanya, tidak diblokir)', async () => {
    const L = await mulai();
    assert.equal(L.ubahStokTerjual(terjual(), { jumlah: 5, status: 'tersedia' }, jual), 'tambah');
    assert.equal(L.ubahStokTerjual(terjual({ kategori: 'gitar', kondisi: 'baru' }), { jumlah: 3, status: 'terjual' }, jual), 'tambah');
});

test('barang bekas yang terjual tetap diblokir: batalkan transaksinya dulu', async () => {
    const L = await mulai();
    assert.equal(L.ubahStokTerjual(terjual({ kategori: 'gitar', kondisi: 'bekas' }), { jumlah: 1, status: 'tersedia' }, jual), 'blokir');
    assert.equal(L.ubahStokTerjual(terjual({ kategori: 'gitar', kondisi: 'bekas' }), { jumlah: 0, status: 'dipesan' }, jual), 'blokir');
});

test('tanpa perubahan yang berarti, atau tanpa penjualan aktif, tidak ada yang dicegah', async () => {
    const L = await mulai();
    assert.equal(L.ubahStokTerjual(terjual(), { jumlah: 0, status: 'terjual' }, jual), null);
    assert.equal(L.ubahStokTerjual(terjual(), { jumlah: 5, status: 'tersedia' }, []), null);
    assert.equal(L.ubahStokTerjual(terjual({ status: 'tersedia', jumlah: 2 }), { jumlah: 5, status: 'tersedia' }, jual), null);
    assert.equal(L.ubahStokTerjual(null, { jumlah: 5, status: 'tersedia' }, jual), null);
});
