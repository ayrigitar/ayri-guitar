'use strict';
/* Beranda: urutan seksi (artikel di bawah, setelah lokasi), hanya 3 artikel terbaru + tombol "Lihat semua", halaman daftar artikel.html berisi semua. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, baca } = require('./helper');

const idxSeksi = (h, id) => h.indexOf('<section id="' + id + '"');
const kartu = (h) => (h.match(/class="article-card"/g) || []).length;

test('beranda: artikel di bawah setelah Lokasi, 3 kartu, grid, tombol Lihat semua; CTA booking di bawah estimasi', () => {
    const h = baca('index.html');
    ['layanan', 'harga', 'lokasi', 'artikel'].reduce((sebelum, id) => { const i = idxSeksi(h, id); assert.ok(i > sebelum, id + ' harus setelah seksi sebelumnya'); return i; }, idxSeksi(h, 'beranda'));
    assert.ok(idxSeksi(h, 'artikel') > idxSeksi(h, 'lokasi') && idxSeksi(h, 'artikel') > idxSeksi(h, 'marketplace') && idxSeksi(h, 'artikel') > idxSeksi(h, 'tuner'), 'artikel paling bawah, sebelum footer');
    assert.ok(h.indexOf('<footer id="kontak"') > idxSeksi(h, 'artikel'));
    const art = h.slice(idxSeksi(h, 'artikel'), h.indexOf('</section>', idxSeksi(h, 'artikel')));
    assert.equal(kartu(art), 3, 'beranda hanya menampilkan 3 artikel');
    assert.match(art, /class="articles articles--beranda"/);
    assert.match(art, /href="artikel\.html"[^>]*>Lihat Semua Artikel/);
    assert.match(h, /class="harga-cta"[\s\S]*Booking Servis Sekarang/);
    assert.ok(h.indexOf('class="harga-cta"') > h.indexOf('id="harga"') && h.indexOf('class="harga-cta"') < idxSeksi(h, 'lokasi'), 'CTA booking tepat setelah estimasi biaya');
    assert.match(h, /<a href="artikel\.html" class="nav__link">Artikel<\/a>/);
    const css = baca('style-index.css');
    assert.match(css, /\.article-card__thumb \{[^}]*aspect-ratio: 16 \/ 9/, 'foto kartu satu rasio');
    assert.match(css, /\.articles--beranda \{[^}]*scroll-snap-type/, 'HP: kartu berjajar ke samping');
    assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/);
});

test('artikel.html: halaman daftar semua artikel (ada penanda otomatis, kartu buatan tangan, di sitemap, tautan menu)', () => {
    const a = baca('artikel.html'), peta = baca('sitemap.xml');
    assert.match(a, /<link rel="canonical" href="https:\/\/ayrigitar\.com\/artikel\.html">/);
    assert.match(a, /<h1 id="artikel-judul" class="section-title">Artikel &amp; Tips Edukasi<\/h1>/);
    assert.match(a, /articles articles--semua/);
    assert.ok(/ARTIKEL-OTOMATIS:MULAI/.test(a) && /ARTIKEL-OTOMATIS:SELESAI/.test(a));
    assert.ok(kartu(a) >= 4, 'semua artikel + artikel buatan tangan');
    assert.match(a, /href="artikel-custom-nut\.html" class="article-card"/);
    assert.match(a, /aria-current="page">Artikel<\/a>/);
    assert.match(peta, /<loc>https:\/\/ayrigitar\.com\/artikel\.html<\/loc>/);
});

test('terbit artikel: beranda 3 terbaru, artikel.html semua; menarik artikel memperbarui keduanya', async () => {
    const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh);
    await d.masuk();
    const A = d.A;
    const slugs = ['satu', 'dua', 'tiga', 'empat'];
    const hasil = [];
    for (const s of slugs) hasil.push(await A.simpanArtikel({ judul: 'Artikel ' + s, slug: 'uji-' + s, tag: 'Tips', ringkasan: 'r', isi: '## Bagian\n\nisi', foto: [], status: 'terbit' }));
    const idx = gh.isi('ayri-guitar', 'index.html'), arsip = gh.isi('ayri-guitar', 'artikel.html');
    const bagian = idx.slice(idx.indexOf('<section id="artikel"'), idx.indexOf('</section>', idx.indexOf('<section id="artikel"')));
    assert.equal(kartu(bagian), 3, 'beranda tetap 3 kartu walau 4 artikel terbit');
    slugs.forEach((s) => assert.ok(arsip.includes('artikel-uji-' + s + '.html'), 'artikel.html memuat ' + s));
    assert.ok(kartu(arsip) >= 4);
    assert.match(arsip, /href="artikel-custom-nut\.html"/, 'kartu buatan tangan tetap ada');
    assert.ok(bagian.includes('artikel-uji-empat.html') && !bagian.includes('artikel-uji-satu.html'), 'yang tampil di beranda adalah 3 terbaru');
    /* tarik artikel terbaru: hilang dari keduanya, beranda terisi artikel berikutnya */
    await A.simpanArtikel(Object.assign({}, hasil[3], { status: 'draf' }));
    const idx2 = gh.isi('ayri-guitar', 'index.html'), arsip2 = gh.isi('ayri-guitar', 'artikel.html');
    assert.ok(!arsip2.includes('artikel-uji-empat.html'));
    const bagian2 = idx2.slice(idx2.indexOf('<section id="artikel"'), idx2.indexOf('</section>', idx2.indexOf('<section id="artikel"')));
    assert.ok(bagian2.includes('artikel-uji-satu.html') && !bagian2.includes('artikel-uji-empat.html'));
});
