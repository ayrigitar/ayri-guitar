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
    assert.match(kode, /\(a\.status === 'terbit' \? '<span class="ly-item__b">' \+ tombolIkon\('link-ar', a\.id, 'tautan', /, 'tombol ikon hanya di artikel terbit');
    assert.match(kode, /tombolIkon\('bagikan-ar', a\.id, 'kirim', 'Bagikan poster Story'\)/);
    assert.match(kode, /function bagikanLinkArtikel\(a\)/); assert.match(kode, /navigator\.share\(\{ title: judul, url: url \}\)/, 'tautan saja, tanpa gambar');
    const tautan = kode.slice(kode.indexOf('function bagikanLinkArtikel'), kode.indexOf('function bagikanArtikel'));
    assert.match(tautan, /kirimKeAplikasi\('bagikanTeks'/, 'aplikasi baru: menu bagikan Android');
    assert.match(tautan, /navigator\.share\(\{ title: judul, url: url \}\)/, 'browser: menu bagikan bawaan');
    assert.match(tautan, /else salinLink\(url\)/, 'tanpa menu bagikan: tautan disalin');
    assert.doesNotMatch(tautan, /bukaWa/, 'tidak lagi memaksa WhatsApp');
    assert.match(kode, /\+m\[2\] === 4 && \+\(m\[3\] \|\| 0\) >= 1/, 'bagikanTeks: aplikasi 1.4.1 ke atas (1.4.0 belum punya op itu)');
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
    assert.match(kode, /tombolIkon\('sold', s\.id, 'kirim', 'Bagikan poster SOLD'\)/, 'tombol ikon di kartu daftar stok');
    assert.match(kode, /id: 'sk-sold'/, 'tombol di halaman stok');
    assert.match(kode, /bagikanPoster\(s, teksTerjual\(s\), \{ terjual: true \}, tombol\)/);
    const poster = kode.slice(kode.indexOf('function buatPoster(s, opsi)'), kode.indexOf('function blobBase64'));
    assert.match(poster, /fillText\('SOLD'/, 'cap SOLD digambar');
    assert.match(poster, /if \(sold\) \{\s*c\.fillStyle = EMAS; c\.font = '700 66px ' \+ SERIF; c\.fillText\('Sudah punya pemilik baru'/, 'poster sold mengganti harga dengan ucapan terima kasih');
    const teks = kode.slice(kode.indexOf('function teksTerjual'), kode.indexOf('function bagikanTerjual'));
    assert.ok(!/harga|modal|nama|hp|nik/i.test(teks.replace(/Tanya \/ pesan/g, '')), 'teks story tanpa harga, modal, atau data pembeli');
});

test('tombol ikon: berlabel untuk pembaca layar, tetap berikon saat sibuk, ikon kirim & tautan ada', () => {
    const kode = baca('admin.js'), css = baca('layanan.css');
    assert.match(kode, /function tombolIkon\(atr, id, nama, label\) \{ return '<button type="button" class="ly-btn ly-btn--sm ly-btn--ikon" data-' \+ atr \+ '="' \+ E\(id\) \+ '" aria-label="' \+ E\(label\) \+ '" title="'/);
    assert.match(kode, /if \(!btn\.classList\.contains\('ly-btn--ikon'\)\) btn\.textContent = teks/, 'tombol ikon tidak diganti teks saat sibuk');
    assert.match(kode, /\n {8}kirim: '<path/); assert.match(kode, /\n {8}tautan: '<path/);
    assert.match(css, /\.ly-btn--ikon \{ width: 40px;/);
    assert.ok(!/>Story<\/button>|>Link<\/button>|>Poster SOLD<\/button>/.test(kode), 'tidak ada lagi tombol bertulisan Link/Story/Poster SOLD di daftar');
});

test('menu bawah Servis rapi (kartu aksi, tanpa Muat ulang data ganda) dan tombol link unit di daftar stok', () => {
    const kode = baca('admin.js'), servis = kode.slice(kode.indexOf('function daftarServis()'), kode.indexOf('function gambarDaftar()'));
    assert.ok(!/Muat ulang data|b-muat/.test(servis), 'muat ulang sudah ada di tombol segarkan header');
    for (const id of ['b-cadang', 'b-buka-cad', 'b-pin', 'b-lupa']) assert.match(servis, new RegExp("id: '" + id + "'"), id);
    assert.match(servis, /<legend>Cadangan &amp; keamanan<\/legend>/);
    assert.match(servis, /id: 'b-lupa', ikon: 'hapus', teks: 'Hapus token dari perangkat ini', kelas: 'ly-akt--del'/, 'tombol berbahaya terpisah dan merah');
    assert.match(kode, /L\.diKatalog\(s\) \? tombolIkon\('tautan-sk', s\.id, 'tautan', 'Bagikan link unit'\)/, 'link unit hanya untuk stok yang tampil di katalog');
    assert.match(kode, /bagikanTautan\(L\.judulStok\(st\), L\.urlUnit\(st\.kode\)\)/, 'memakai pembagi tautan universal yang sama dengan artikel');
});

test('tab Jual: struk bisa dicetak ulang/dibagikan tanpa nomor WA; transaksi selesai bisa dibatalkan; stok terjual tidak diubah diam-diam', () => {
    const kode = baca('admin.js');
    const jual = kode.slice(kode.indexOf('function gambarJual2()'), kode.indexOf('function gambarBayarJual()'));
    for (const id of ['jl-cetak', 'jl-pdf', 'jl-bagikan']) assert.match(jual, new RegExp("id: '" + id + "'"), id);
    assert.match(jual, /\(j\.status !== 'batal' \? '<fieldset class="ly-card"><legend>Struk &amp; nota<\/legend>'/, 'kartu struk tidak bergantung pada nomor WA');
    assert.match(jual, /aktif \|\| j\.status === 'selesai' \? '<fieldset class="ly-card"><legend>Status<\/legend>/, 'transaksi selesai juga bisa dibatalkan (barang dikembalikan)');
    assert.match(jual, /bagikanTeks\(teksStruk\(strukDariJual\(j\)\)\)/);
    assert.match(kode, /function strukDariJual\(j\)/); assert.match(kode, /function bagikanTeks\(teks\)/);
    const stok = kode.slice(kode.indexOf('function simpanStok()'), kode.indexOf('function simpanStok()') + 1400);
    assert.match(stok, /asli\.status === 'terjual' && aktifJ\.length/, 'barang terjual lewat transaksi: diarahkan ke transaksinya');
    assert.match(stok, /s\.status === 'tersedia' && !\(\+s\.jumlah > 0\)\) return toast\(/, 'tersedia dengan jumlah 0 tidak lagi diam-diam jadi Terjual');
    assert.match(kode, /id="sk-status-info"/);
});
