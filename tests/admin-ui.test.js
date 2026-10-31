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
    assert.match(kode, /\(a\.status === 'terbit' \? '<span class="ly-item__b"><button type="button" class="ly-btn ly-btn--sm" data-link-ar=/, 'tombol hanya di artikel terbit');
    assert.match(kode, /function bagikanLinkArtikel\(a\)/); assert.match(kode, /navigator\.share\(\{ title: a\.judul, url: url \}\)/, 'tautan saja, tanpa gambar');
    assert.match(kode, /id: 'ar-link'/);
    assert.match(kode, /var PERAN_POSTER = \{ gitar: '', sebelum: 'SEBELUM', sesudah: 'SESUDAH' \};/); assert.doesNotMatch(kode, /GITAR UTUH|gitar utuh/i, 'poster & editor tanpa tulisan "gitar utuh"'); assert.match(kode, /\/sebelum\|before\/i/, 'foto sebelum/sesudah dikenali dari keterangan bila belum dipilih');
    assert.match(kode, /Math\.min\(sel\.w \/ foto\.width, sel\.h \/ foto\.height\)/, 'foto utuh di dalam sel (contain), tidak dipotong');
    assert.doesNotMatch(kode.slice(kode.indexOf('function buatPosterArtikel'), kode.indexOf('function bagikanLinkArtikel')), /Math\.max\(w0 \/ foto/, 'tidak ada pemotongan (cover) di poster artikel');
    assert.match(kode, /data-poster=/); assert.match(kode, /if \(!peranPoster\[t\]\) \{ peranPoster\[t\] = 1; o\.poster = t; \}/, 'draf dari servis memberi peran gitar, sebelum & sesudah otomatis');
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

test('poster SOLD: hanya gitar terjual berfoto publik, cap SOLD tanpa harga/modal/pembeli, tombol di daftar dan halaman stok', () => {
    const kode = baca('admin.js');
    assert.match(kode, /function bisaPosterSold\(s\) \{ return s\.status === 'terjual' && s\.kategori !== 'aksesoris' && /, 'hanya gitar yang sudah terjual');
    assert.match(kode, /data-sold="' \+ E\(s\.id\) \+ '">Poster SOLD</, 'tombol di kartu daftar stok');
    assert.match(kode, /id: 'sk-sold'/, 'tombol di halaman stok');
    assert.match(kode, /bagikanPoster\(s, teksTerjual\(s\), \{ terjual: true \}, tombol\)/);
    const poster = kode.slice(kode.indexOf('function buatPoster(s, opsi)'), kode.indexOf('function blobBase64'));
    assert.match(poster, /fillText\('SOLD'/, 'cap SOLD digambar');
    assert.match(poster, /if \(sold\) \{\s*c\.fillStyle = EMAS; c\.font = '700 66px ' \+ SERIF; c\.fillText\('Sudah punya pemilik baru'/, 'poster sold mengganti harga dengan ucapan terima kasih');
    const teks = kode.slice(kode.indexOf('function teksTerjual'), kode.indexOf('function bagikanTerjual'));
    assert.ok(!/harga|modal|nama|hp|nik/i.test(teks.replace(/Tanya \/ pesan/g, '')), 'teks story tanpa harga, modal, atau data pembeli');
});
