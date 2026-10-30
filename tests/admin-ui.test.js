'use strict';
/* Tampilan admin: tombol aksi seragam dan sumber foto poster (pemeriksaan statis atas admin.js dan layanan.css). */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

test('admin: tombol aksi memakai komponen seragam dan poster memuat foto lewat GitHub (bukan hanya cache situs)', () => {
    const js = baca('admin.js'), css = baca('layanan.css');
    /* semua id yang dipasangi pendengar harus tetap ada di markup tombol aksi */
    for (const id of ['sv-cetak', 'sv-artikel', 'sv-hapus', 'tb-hapus', 'tb-kestok', 'jl-hapus', 'sk-tawar', 'sk-hapus', 'ar-hapus']) assert.match(js, new RegExp("id: '" + id + "'"), id);
    assert.match(js, /A\.fotoBlob\(s, f, true\)/);
    assert.doesNotMatch(js, /muatGambar\(L\.situs\(\) \+ fp\.path\)/, 'foto poster tidak boleh hanya dari situs (cache force-cache bisa menyimpan 404)');
    assert.match(css, /\.ly-akt--del/);
});

test('artikel terbit bisa dibagikan: poster 1080x1920 + teks + tautan, tombol di daftar dan di halaman edit', () => {
    const kode = baca('admin.js');
    assert.match(kode, /function teksArtikel\(a\) \{ return a\.judul \+ '\\n\\n' \+ ringkasArtikel\(a\) \+ '\\n\\nBaca selengkapnya: ' \+ urlArtikel\(a\); \}/);
    assert.match(kode, /function urlArtikel\(a\) \{ return L\.situs\(\) \+ 'artikel-' \+ a\.slug \+ '\.html'; \}/);
    assert.match(kode, /if \(opsi && opsi\.artikel\) return buatPosterArtikel\(opsi\.artikel\);/);
    assert.match(kode, /data-bagikan-ar/); assert.match(kode, /id: 'ar-bagikan'/);
    assert.match(kode, /if \(a\.status !== 'terbit'\) return toast\('Hanya artikel yang sudah terbit/, 'draf tidak bisa dibagikan');
    assert.match(kode, /\(a\.status === 'terbit' \? '<span class="ly-item__b"><button type="button" class="ly-btn ly-btn--sm" data-bagikan-ar=/, 'tombol hanya di artikel terbit');
});

test('pilih dari kontak: tombol di form servis, tebus/titip, jual, dan sewa; hanya muncul bila browser mendukung', () => {
    const kode = baca('admin.js');
    assert.match(kode, /function bisaPilihKontak\(\) \{ return kontakAplikasi\(\) \|\| !!\(navigator\.contacts && typeof navigator\.contacts\.select === 'function' && window\.ContactsManager\); \}/);
    assert.match(kode, /\(\+m\[1\] > 1 \|\| \(\+m\[1\] === 1 && \+m\[2\] >= 4\)\)/, 'aplikasi: hanya versi 1.4.0 ke atas');
    assert.match(kode, /kirimKeAplikasi\('pilihKontak', \{\}\)/); assert.match(kode, /window\.addEventListener\('ayri-kontak'/);
    assert.match(kode, /return bisaPilihKontak\(\) \? '<div class="ly-btns">/, 'tanpa dukungan browser: tombol tidak ditampilkan');
    for (const pasangan of ['[data-f="nama"]', '[data-t="nama"]', '#jb-nama', '[data-w="nama"]']) assert.ok(kode.includes("tombolKontak('" + pasangan), 'tombol kontak untuk ' + pasangan);
    assert.match(kode, /navigator\.contacts\.select\(\['name', 'tel'\], \{ multiple: false \}\)/, 'hanya nama dan nomor yang diminta, satu kontak');
});
