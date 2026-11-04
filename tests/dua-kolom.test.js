'use strict';
/* Form edit POS 2 kolom di PC: susunDua dipanggil di semua form edit, CSS-nya ada, dan HP tetap satu kolom (kolom "melebur" + urutan semula). */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

test('susunDua dipakai di semua form edit dan CSS-nya benar', () => {
    const adm = baca('admin.js'), css = baca('layanan.css');
    assert.equal((adm.match(/\n\s+susunDua\(\[/g) || []).length, 9, 'servis, tebus, titip, jual baru, jual detail, sewa baru, sewa detail, stok, artikel');
    assert.match(adm, /function susunDua\(kananJudul\)/);
    assert.match(adm, /el\.style\.order = i/, 'urutan semula dijaga untuk HP');
    assert.match(adm, /w\.style\.order = kartu\[0\]\.style\.order/, 'pembungkus 2 kolom berurutan setelah judul, bukan sebelumnya');
    assert.match(css, /\.ly-dua, \.ly-dua__kiri, \.ly-dua__kanan \{ display: contents; \}/, 'HP: kolom melebur, tetap satu kolom');
    assert.match(css, /@media \(min-width: 1000px\) \{\s+\.ly-main:has\(\.ly-dua\)/, 'lebar halaman & 2 kolom hanya di layar lebar');
    assert.match(css, /\.ly-dua__kanan > \.ly-save \{\s+order: -1 !important; position: sticky/, 'Simpan menempel di atas kolom kanan');
});

test('isian ringkas: ikon penjelasan (i) menggantikan paragraf bantuan, dan isian pendek berdampingan di PC', () => {
    const adm = baca('admin.js'), css = baca('layanan.css');
    assert.match(adm, /bantu\('tip-merek'\)/);
    assert.match(adm, /tip\('tip-seri',/);
    assert.match(adm, /bantu\('tip-tingkat'\)/);
    assert.ok(!adm.includes('Merek dipisah dari model, supaya satu artikel merek bisa dipakai semua unit merek itu.</span>'), 'bantuan merek tidak lagi paragraf yang selalu terlihat');
    assert.ok((adm.match(/ly-card ly-f ly-grid/g) || []).length >= 10, 'kartu isian di form stok dan form lain memakai grid ringkas');
    assert.match(css, /@media \(min-width: 1000px\) \{\s+\.ly-grid \{ grid-template-columns: repeat\(6/, 'berdampingan hanya di layar lebar');
    assert.match(css, /\.ly-tip\[hidden\] \{ display: none; \}/);
});
