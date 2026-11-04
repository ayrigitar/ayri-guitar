'use strict';
/* Form edit POS 2 kolom di PC: susunDua dipanggil di semua form edit, CSS-nya ada, dan HP tetap satu kolom (kolom "melebur" + urutan semula). */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

test('susunDua dipakai di semua form edit dan CSS-nya benar', () => {
    const adm = baca('admin.js'), css = baca('layanan.css');
    assert.equal((adm.match(/\n\s+susunDua\(\[/g) || []).length, 9, 'servis, tebus, titip, jual baru, jual detail, sewa baru, sewa detail, stok, artikel');
    assert.match(adm, /function susunDua\(kananJudul\)/);
    assert.match(adm, /el\.style\.order = i/, 'urutan semula dijaga untuk HP');
    assert.match(css, /\.ly-dua, \.ly-dua__kiri, \.ly-dua__kanan \{ display: contents; \}/, 'HP: kolom melebur, tetap satu kolom');
    assert.match(css, /@media \(min-width: 1000px\) \{\s+\.ly-main:has\(\.ly-dua\)/, 'lebar halaman & 2 kolom hanya di layar lebar');
    assert.match(css, /\.ly-dua__kanan > \.ly-save \{\s+order: -1 !important; position: sticky/, 'Simpan menempel di atas kolom kanan');
});
