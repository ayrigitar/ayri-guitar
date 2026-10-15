#!/usr/bin/env node
/* Membuat halaman artikel-<slug>.html dari artikel berstatus "terbit" di database (Supabase),
   lalu memperbarui daftar artikel di index.html dan sitemap.xml.
   Dijalankan otomatis oleh GitHub Action (.github/workflows/artikel.yml) setiap jam.

   Uji tanpa database:  node scripts/build-artikel.js --fixture scripts/contoh-artikel.json --out /tmp/uji */
'use strict';
const fs = require('fs');
const path = require('path');
const md = require('../artikel-md.js');
const C = require('../layanan-config.js');

const ROOT = path.resolve(__dirname, '..');
const arg = {};
process.argv.slice(2).forEach((a, i, all) => { if (a.startsWith('--')) arg[a.slice(2)] = all[i + 1]; });
const OUT = arg.out ? path.resolve(arg.out) : ROOT;
const SITUS = (C.situsUrl || 'https://ayrigitar.com/').replace(/\/?$/, '/');
const PENANDA = '<meta name="generator" content="ayri-artikel">';
const MAKS_DI_BERANDA = 12;
const esc = md.esc;

async function ambilArtikel() {
    if (arg.fixture) return JSON.parse(fs.readFileSync(path.resolve(arg.fixture), 'utf8'));
    if (!C.supabaseUrl || /GANTI/.test(C.supabaseUrl + C.supabaseAnonKey)) {
        console.log('Supabase belum disetel di layanan-config.js; tidak ada yang dibuat.');
        return null;
    }
    const url = C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/artikel?status=eq.terbit&select=slug,judul,ringkasan,isi,tag,foto,terbit_at,updated_at&order=terbit_at.desc';
    const r = await fetch(url, { headers: { apikey: C.supabaseAnonKey, Authorization: 'Bearer ' + C.supabaseAnonKey } });
    if (!r.ok) throw new Error('Gagal mengambil artikel (' + r.status + '): ' + (await r.text()));
    return r.json();
}

function baca(nama) { return fs.readFileSync(path.join(ROOT, nama), 'utf8'); }
function tulis(nama, isi) {
    const p = path.join(OUT, nama);
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === isi) return false;
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, isi);
    return true;
}
function bulan(ts) { return new Date(ts || Date.now()).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }); }
function tanggal(ts) { return new Date(ts || Date.now()).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); } /* YYYY-MM-DD */
function amanUrl(u) { return /^https:\/\/[^\s"'<>]+$/.test(String(u || '')) ? u : ''; }
function fotoValid(a) { return (Array.isArray(a.foto) ? a.foto : []).filter((f) => f && amanUrl(f.url)); }
function deskripsi(a) {
    const d = (a.ringkasan || '').trim() || md.teksPolos(a.isi);
    return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
}

function halaman(tpl, a) {
    const url = SITUS + 'artikel-' + a.slug + '.html', foto = fotoValid(a), desk = deskripsi(a);
    const ld = {
        '@context': 'https://schema.org', '@type': 'Article', headline: a.judul.slice(0, 110), description: desk, inLanguage: 'id',
        datePublished: a.terbit_at || undefined, dateModified: a.updated_at || a.terbit_at || undefined, mainEntityOfPage: url,
        image: foto.length ? foto.map((f) => f.url) : undefined,
        author: { '@type': 'Organization', name: 'Toko Gitar AYRI', url: SITUS },
        publisher: { '@type': 'Organization', name: 'Toko Gitar AYRI', url: SITUS }
    };
    const fig = (f, kelas, lazy) => '                <figure class="' + kelas + '"><img src="' + esc(f.url) + '" alt="' + esc(f.alt || a.judul) + '"' + (lazy ? ' loading="lazy"' : '') + ' decoding="async">' +
        (f.alt ? '<figcaption>' + esc(f.alt) + '</figcaption>' : '') + '</figure>';
    const isi = {
        JUDUL: esc(a.judul),
        JUDUL_PENDEK: esc(a.judul.length > 42 ? a.judul.slice(0, 40).replace(/\s+\S*$/, '') + '…' : a.judul),
        DESKRIPSI: esc(desk),
        URL: esc(url),
        TAG: esc(a.tag || 'Hasil Servis'),
        BULAN: esc(bulan(a.terbit_at)),
        OG_IMAGE: foto.length ? '    <meta property="og:image" content="' + esc(foto[0].url) + '">\n    <meta name="twitter:card" content="summary_large_image">' : '    <meta name="twitter:card" content="summary">',
        LDJSON: JSON.stringify(ld, null, 2).replace(/</g, '\\u003c'),
        SAMPUL: foto.length ? fig(foto[0], 'article-photo container container--article', false) : '',
        ISI: md.keHtml(a.isi).split('\n').map((l) => '                ' + l).join('\n'),
        GALERI: foto.length > 1 ? '                <div class="article-gallery">\n' + foto.slice(1).map((f) => fig(f, 'article-gallery__item', true)).join('\n') + '\n                </div>' : '',
        WA_TEKS: esc('?text=' + encodeURIComponent('Halo AYRI, saya baca artikel "' + a.judul + '" dan mau konsultasi gitar saya'))
    };
    return tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in isi ? isi[k] : m));
}

function kartu(a) {
    const foto = fotoValid(a)[0];
    const thumb = foto ? '<img src="' + esc(foto.thumb_url && amanUrl(foto.thumb_url) ? foto.thumb_url : foto.url) + '" alt="" loading="lazy" decoding="async">'
        : '<svg class="nut" viewBox="0 0 240 64"><use href="#nut" fill="url(#g-bone)"/></svg>';
    return '                <a href="artikel-' + a.slug + '.html" class="article-card" data-reveal>\n' +
        '                    <div class="article-card__thumb" aria-hidden="true">' + thumb + '</div>\n' +
        '                    <div class="article-card__body">\n' +
        '                        <span class="tag">' + esc(a.tag || 'Hasil Servis') + '</span>\n' +
        '                        <h3 class="article-card__title">' + esc(a.judul) + '</h3>\n' +
        '                        <p class="article-card__excerpt">' + esc(deskripsi(a)) + '</p>\n' +
        '                        <span class="article-card__more" aria-hidden="true">Baca artikel <svg class="ic"><use href="#i-arrow"/></svg></span>\n' +
        '                    </div>\n                </a>';
}

function gantiBlok(teks, isiBaru, namaFile) {
    const re = /(<!-- ARTIKEL-OTOMATIS:MULAI[^>]*-->)[\s\S]*?(\n[ \t]*<!-- ARTIKEL-OTOMATIS:SELESAI -->)/;
    if (!re.test(teks)) throw new Error('Penanda ARTIKEL-OTOMATIS tidak ditemukan di ' + namaFile);
    return teks.replace(re, (m, a, b) => a + (isiBaru ? '\n' + isiBaru : '') + b);
}

async function main() {
    const data = await ambilArtikel();
    if (!data) return;
    const tpl = baca('scripts/artikel-template.html');
    const list = [], dipakai = new Set();
    for (const a of data) {
        if (!a || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug || '') || !a.judul) { console.warn('Dilewati (slug/judul tidak valid):', a && a.slug); continue; }
        const nama = 'artikel-' + a.slug + '.html', lama = path.join(ROOT, nama);
        if (fs.existsSync(lama) && !baca(nama).includes(PENANDA)) { console.warn('Dilewati: ' + nama + ' adalah halaman buatan tangan, tidak ditimpa.'); continue; }
        if (dipakai.has(nama)) continue;
        dipakai.add(nama); list.push(a);
        if (tulis(nama, halaman(tpl, a))) console.log('Ditulis: ' + nama);
    }

    /* hapus halaman otomatis yang artikelnya sudah tidak terbit/dihapus */
    for (const f of fs.readdirSync(OUT)) {
        if (/^artikel-.+\.html$/.test(f) && !dipakai.has(f) && fs.readFileSync(path.join(OUT, f), 'utf8').includes(PENANDA)) {
            fs.unlinkSync(path.join(OUT, f)); console.log('Dihapus: ' + f);
        }
    }

    const beranda = gantiBlok(baca('index.html'), list.slice(0, MAKS_DI_BERANDA).map(kartu).join('\n'), 'index.html');
    if (tulis('index.html', beranda)) console.log('Diperbarui: index.html');
    const peta = gantiBlok(baca('sitemap.xml'), list.map((a) => '  <url>\n    <loc>' + esc(SITUS + 'artikel-' + a.slug + '.html') + '</loc>\n    <lastmod>' + tanggal(a.updated_at || a.terbit_at) + '</lastmod>\n  </url>').join('\n'), 'sitemap.xml');
    if (tulis('sitemap.xml', peta)) console.log('Diperbarui: sitemap.xml');
    console.log(list.length + ' artikel terbit.');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
