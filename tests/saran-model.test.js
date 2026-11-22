'use strict';
/* Form stok: isian Model (gitar) dan Nama / model produk (aksesoris) memberi saran dari stok yang pernah disimpan; bila Merek diisi, hanya model merek itu. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { baca } = require('./helper');

const ADMIN = baca('admin.js');
function ambilFungsi(nama) {
    const i = ADMIN.indexOf('function ' + nama + '(');
    assert.ok(i >= 0, nama);
    let n = 0;
    for (let j = ADMIN.indexOf('{', i); j < ADMIN.length; j++) {
        if (ADMIN[j] === '{') n++;
        else if (ADMIN[j] === '}' && --n === 0) return ADMIN.slice(i, j + 1);
    }
    throw new Error(nama);
}
function siapkan(stok) {
    const ctx = { cache: { stok } };
    vm.createContext(ctx);
    vm.runInContext(['saranDariStok', 'modelSaran'].map(ambilFungsi).join('\n'), ctx);
    return ctx;
}
const stok = [
    { kategori: 'gitar', merek: 'Cort', gitar_merk: 'AD810 OP' }, { kategori: 'gitar', merek: 'Cort', gitar_merk: 'AD810 OP' },
    { kategori: 'gitar', merek: 'Cort', gitar_merk: 'Earth 70' }, { kategori: 'gitar', merek: 'Yamaha', gitar_merk: 'F310' },
    { kategori: 'gitar', merek: '', gitar_merk: 'Fender Aerodyne' }, { kategori: 'aksesoris', merek: 'Orphee', nama: 'QA140' }
];

test('saran model: dari stok tersimpan, yang paling sering dulu; disaring menurut merek; gitar dan aksesoris terpisah', () => {
    const c = siapkan(stok);
    assert.deepEqual([...c.modelSaran({ kategori: 'gitar', merek: '' })], ['AD810 OP', 'Earth 70', 'F310', 'Fender Aerodyne']);
    assert.deepEqual([...c.modelSaran({ kategori: 'gitar', merek: ' cort ' })], ['AD810 OP', 'Earth 70'], 'merek tanpa beda huruf besar/spasi');
    assert.deepEqual([...c.modelSaran({ kategori: 'gitar', merek: 'Ibanez' })], [], 'merek baru: belum ada saran');
    assert.deepEqual([...c.modelSaran({ kategori: 'aksesoris', merek: '' })], ['QA140']);
});

test('form stok: isian Model & Nama produk memakai daftar saran, diperbarui saat Merek atau kategori berubah', () => {
    assert.match(ADMIN, /<input data-s="gitar_merk" autocomplete="off" list="dl-model"/);
    assert.match(ADMIN, /<input data-s="nama" autocomplete="off" list="dl-model"/);
    assert.match(ADMIN, /<datalist id="dl-model"><\/datalist>/);
    assert.match(ADMIN, /if \(k === 'merek'\) gambarSaranModel\(\);/);
    assert.match(ADMIN, /if \(d\.kategori\) setTimeout\(function \(\) \{ gambarSampulSk\(\); gambarSaranModel\(\); \}\);/);
});
