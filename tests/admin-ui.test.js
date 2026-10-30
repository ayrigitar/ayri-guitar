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

test('pilih dari kontak: tombol di form servis, tebus/titip, jual, dan sewa; hanya muncul bila browser mendukung', () => {
    const kode = baca('admin.js');
    assert.match(kode, /function bisaPilihKontak\(\) \{ return !!\(navigator\.contacts && typeof navigator\.contacts\.select === 'function' && window\.ContactsManager\); \}/);
    assert.match(kode, /return bisaPilihKontak\(\) \? '<div class="ly-btns">/, 'tanpa dukungan browser: tombol tidak ditampilkan');
    for (const pasangan of ['[data-f="nama"]', '[data-t="nama"]', '#jb-nama', '[data-w="nama"]']) assert.ok(kode.includes("tombolKontak('" + pasangan), 'tombol kontak untuk ' + pasangan);
    assert.match(kode, /navigator\.contacts\.select\(\['name', 'tel'\], \{ multiple: false \}\)/, 'hanya nama dan nomor yang diminta, satu kontak');
});
