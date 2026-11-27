'use strict';
/* Halaman servis-gitar-bogor.html: judul, data terstruktur, tautan, peta situs, dan harga/alamat/jam yang selalu mengikuti beranda. */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

const halaman = baca('servis-gitar-bogor.html').replace(/\r\n/g, '\n'), beranda = baca('index.html').replace(/\r\n/g, '\n');

test('servis-gitar-bogor: judul, deskripsi, kanonik, satu h1, tanpa penanda templat tersisa', () => {
    const judul = /<title>([^<]*)<\/title>/.exec(halaman)[1], desk = /name="description" content="([^"]*)"/.exec(halaman)[1];
    assert.match(judul, /^Servis Gitar Bogor/); assert.ok(judul.length <= 70, 'judul terlalu panjang: ' + judul.length);
    assert.ok(desk.length >= 100 && desk.length <= 170, 'deskripsi ' + desk.length + ' huruf');
    assert.match(halaman, /<link rel="canonical" href="https:\/\/ayrigitar\.com\/servis-gitar-bogor\.html">/);
    assert.equal((halaman.match(/<h1[\s>]/g) || []).length, 1);
    assert.ok(!halaman.includes('{{'), 'penanda templat tersisa');
    assert.ok(!/noindex/.test(halaman), 'halaman ini harus bisa diindeks');
});

test('servis-gitar-bogor: data terstruktur sah, tanpa harga yang bisa basi', () => {
    const m = /<script type="application\/ld\+json">\n([\s\S]*?)\n    <\/script>/.exec(halaman);
    assert.ok(m, 'blok JSON-LD tidak ditemukan');
    const ld = JSON.parse(m[1]), tipe = ld['@graph'].map((x) => x['@type']);
    assert.deepEqual(tipe, ['BreadcrumbList', 'Service']);
    assert.ok(!/price|"Offer"/i.test(m[1]), 'harga tidak boleh ada di data terstruktur (bisa berbeda dari beranda)');
});

test('servis-gitar-bogor: setiap data-dari menunjuk butir yang ada di beranda, dan isi cadangan sama dengan beranda sekarang', () => {
    const kunci = [...halaman.matchAll(/data-dari="([^"]+)"/g)].map((x) => x[1]);
    assert.ok(kunci.length >= 20, 'terlalu sedikit butir yang mengikuti beranda');
    const dibuang = (s) => s.replace(/&amp;/g, '&');
    for (const k of new Set(kunci)) {
        const pola = 'data-edit="' + k.replace(/\./g, '\\.') + '"', nilai = new RegExp(pola + '[^>]*value="(\\d+)"').exec(beranda), teksAsal = new RegExp(pola + '[^>]*>([^<]*)<').exec(beranda);
        assert.ok(teksAsal, 'beranda tidak punya ' + k); const asal = [null, nilai && nilai[1], teksAsal[1]];
        const tujuan = new RegExp('data-dari="' + k.replace(/\./g, '\\.') + '">([^<]*)<').exec(halaman);
        assert.ok(tujuan, 'halaman tidak punya ' + k);
        if (/\.harga$/.test(k)) assert.equal(tujuan[1].replace(/\./g, ''), asal[1], 'harga ' + k + ' berbeda dari beranda; jalankan ulang pembuatan halaman');
        else assert.equal(dibuang(tujuan[1]).trim(), dibuang(asal[2]).trim(), 'isi ' + k + ' berbeda dari beranda');
    }
});

test('servis-gitar-bogor: ada di peta situs dan ditautkan dari beranda; judul beranda memuat kata kunci servis', () => {
    assert.match(baca('sitemap.xml'), /<loc>https:\/\/ayrigitar\.com\/servis-gitar-bogor\.html<\/loc>/);
    assert.match(beranda, /<a href="servis-gitar-bogor\.html" class="service-card__more">/);
    assert.match(beranda, /<a href="servis-gitar-bogor\.html" class="footer__link">Servis Gitar Bogor<\/a>/);
    assert.match(/<title>([^<]*)<\/title>/.exec(beranda)[1], /Servis Gitar Bogor/);
    assert.match(/name="description" content="([^"]*)"/.exec(beranda)[1], /Servis gitar di Bogor/);
});

test('servis-gitar-bogor: skrip penyegar mengisi harga dari beranda dan tidak merusak bila beranda tak terbaca', () => {
    const vm = require('node:vm'), js = /<script>\n    \/\* harga, alamat[\s\S]*?\n    <\/script>/.exec(halaman)[0].replace(/^<script>|<\/script>$/g, '');
    const el = (kunci) => ({ k: kunci, getAttribute: () => kunci, textContent: 'lama' });
    const els = [el('harga.0.harga'), el('lokasi.alamat')];
    const sumber = { 'harga.0.harga': { getAttribute: () => '125000', textContent: 'Rp 125.000' }, 'lokasi.alamat': { getAttribute: () => null, textContent: ' Alamat Baru ' } };
    const jalankan = (respon) => {
        const sb = { document: { querySelectorAll: () => els }, window: { fetch: true }, DOMParser: function () { this.parseFromString = () => ({ querySelector: (q) => sumber[/"(.*)"/.exec(q)[1]] || null }); }, fetch: () => respon };
        sb.window.fetch = sb.fetch; vm.createContext(sb); vm.runInContext(js, sb); return new Promise((r) => setTimeout(r, 20));
    };
    return jalankan(Promise.resolve({ ok: true, text: () => Promise.resolve('<html>') })).then(() => {
        assert.equal(els[0].textContent, (125000).toLocaleString('id-ID')); assert.equal(els[1].textContent, 'Alamat Baru');
        els.forEach((e) => { e.textContent = 'lama'; });
        return jalankan(Promise.reject(new Error('putus')));
    }).then(() => { assert.equal(els[0].textContent, 'lama', 'gagal memuat: isi cadangan tetap'); });
});

test('servis-gitar-bogor: footer semua halaman artikel, unit, seri, katalog, dan kedua templat menautkan halaman servis; prompt AI dan judul merek memakai kata yang dicari orang', () => {
    const fs = require('node:fs'), path = require('node:path'), akar = path.join(__dirname, '..');
    const daftar = [...fs.readdirSync(akar).filter((f) => f.endsWith('.html')).map((f) => f), ...fs.readdirSync(path.join(akar, 'unit')).map((f) => 'unit/' + f), 'scripts/artikel-template.html', 'scripts/unit-template.html'];
    let diperiksa = 0;
    for (const f of daftar) {
        const s = fs.readFileSync(path.join(akar, f), 'utf8');
        if (!/footer__link">Harga Servis<\/a>/.test(s) || f === 'index.html' || f === 'servis-gitar-bogor.html') continue;
        diperiksa++; assert.match(s, /servis-gitar-bogor\.html" class="footer__link">Servis Gitar Bogor<\/a>/, f + ' belum menautkan halaman servis');
        if (f.startsWith('unit/') || f === 'scripts/unit-template.html') assert.match(s, /href="\.\.\/servis-gitar-bogor\.html" class="footer__link"/, f + ': tautan harus relatif ke ../');
    }
    assert.ok(diperiksa >= 70, 'terlalu sedikit halaman yang diperiksa: ' + diperiksa);
    assert.match(baca('scripts/artikel-template.html'), /<a href="servis-gitar-bogor\.html">servis gitar di Bogor<\/a>/);
    assert.match(baca('layanan.js'), /berasal dari mana\?/); assert.match(baca('layanan.js'), /subjudul berupa pertanyaan yang sering dicari/);
    assert.match(baca('admin.js'), /': Asal Negara, Sejarah, Ciri Khas, dan Pilihan '/);
});
