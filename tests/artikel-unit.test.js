'use strict';
/* Artikel profil unit stok: foto produk disalin jadi foto artikel (tetap ada setelah unit terjual), kotak ketersediaan, permintaan AI, skrip kotak. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub());
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, d, A: d.A, L: d.L };
}
const foto = (n) => ({ tahap: 'gitar', hasil: { besar: new Blob([Buffer.from('besar-' + n)], { type: 'image/webp' }), kecil: new Blob([Buffer.from('kecil-' + n)], { type: 'image/webp' }) } });

test('artikel unit: foto stok disalin ke foto/artikel saat terbit, kotak unit ada, tetap tayang setelah stok dihapus', async () => {
    const { gh, A } = await mulai();
    const s = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, gitar_jenis: 'Akustik', gitar_merk: 'Yamaha F310', harga_jual: 1500000 }), [foto(1)]);
    const art = await A.simpanArtikel({ judul: 'Akustik Yamaha F310: Spesifikasi', slug: 'akustik-yamaha-f310', tag: 'Profil Gitar', ringkasan: 'r', isi: '## Spek\n\nisi', status: 'terbit',
        stok_id: s.id, stok_kode: s.kode, foto: [{ stok: s.id, foto: s.foto[0].id, alt: 'Akustik Yamaha F310 – foto 1', poster: 'gitar' }] });
    assert.match(art.foto[0].path, /^foto\/artikel\/akustik-yamaha-f310-gitar-[0-9a-f]{6}\.webp$/, 'foto stok diganti salinan di foto/artikel');
    assert.ok(gh.daftarFile('ayri-guitar').includes(art.foto[0].path));
    const html = gh.isi('ayri-guitar', 'artikel-akustik-yamaha-f310.html');
    assert.ok(html.includes('data-unit="' + s.kode + '"'), 'kotak ketersediaan memuat kode unit');
    assert.ok(html.includes('Tertarik dengan unit ini?') && !html.includes('{{'), 'tawaran khusus unit, tanpa penanda tersisa');
    assert.ok(html.includes('artikel-unit.js'));
    await A.hapusStok(s); /* foto stok terhapus, salinan di artikel tetap */
    assert.ok(!gh.daftarFile('ayri-guitar').some((p) => p.startsWith('foto/stok/')));
    assert.ok(gh.daftarFile('ayri-guitar').includes(art.foto[0].path));
    assert.ok(gh.isi('ayri-guitar', 'artikel-akustik-yamaha-f310.html'));
});

test('artikel servis biasa: tanpa kotak unit, tawaran servis tetap', async () => {
    const { gh, A } = await mulai();
    await A.simpanArtikel({ judul: 'Setup Gitar', slug: 'setup-gitar', tag: 'Tips', ringkasan: 'r', isi: '## Bagian\n\nisi', foto: [], status: 'terbit' });
    const html = gh.isi('ayri-guitar', 'artikel-setup-gitar.html');
    assert.ok(!html.includes('data-unit='));
    assert.ok(html.includes('Gitar Anda mengalami masalah serupa?') && !html.includes('{{'));
});

test('kode unit berbahaya tidak masuk halaman', () => {
    const sb = { console }; sb.window = sb; vm.createContext(sb);
    ['util.js', 'artikel-md.js', 'artikel-builder.js'].forEach((f) => vm.runInContext(baca(f), sb, { filename: f }));
    const h = sb.ArtikelBuilder.halaman(baca('scripts/artikel-template.html'), { judul: 'T', slug: 't', isi: 'x', foto: [], stok_kode: '"><script>x</script>' }, 'https://ayrigitar.com/');
    assert.ok(!h.includes('data-unit=') && !h.includes('<script>x'));
});

test('permintaan AI artikel unit: gitar vs aksesoris, fakta unit dari catatan toko, tanpa harga', async () => {
    const { L } = await mulai();
    const g = L.ai.artikel({ judul: 'Akustik Yamaha F310' }, null, stokContoh('s1', 1, { gitar_jenis: 'Akustik', merek: 'Yamaha', gitar_merk: 'F310', kondisi: 'bekas', deskripsi: 'lecet kecil di body', harga_jual: 1500000, harga_beli: 900000 }));
    assert.match(g.sistem, /FAKTA UNIT INI/); assert.match(g.sistem, /tanpa kesan endorsement/);
    assert.match(g.prompt, /Tentang merek Yamaha/); assert.match(g.prompt, /jangan diulang/); assert.doesNotMatch(g.prompt, /Sejarah singkat/); assert.match(g.prompt, /Kalau membeli bekas/); assert.match(g.prompt, /lecet kecil di body/);
    assert.ok(!/1500000|900000|1\.500\.000/.test(g.prompt), 'harga tidak dikirim ke AI');
    const a = L.ai.artikel({ judul: 'Senar' }, null, stokContoh('s2', 3, { kategori: 'aksesoris', sub: 'Senar', nama: 'Orphee NX35' }));
    assert.match(a.prompt, /Cara memilih/); assert.doesNotMatch(a.prompt, /Tentang merek/);
    assert.match(L.ai.artikel({ judul: 'x' }, null, null).sistem, /artikel blog/, 'tanpa stok: artikel servis seperti biasa');
});

test('skrip kotak unit: tersedia, dipesan, tidak tersedia, dan gagal memuat', async () => {
    const kode = baca('artikel-unit.js');
    async function jalankan(respons) {
        const el = (t) => ({ t, attrs: {}, children: [], textContent: '', setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, insertBefore(c) { this.children.unshift(c); }, get firstChild() { return this.children[0]; } });
        const kotak = el('aside'), teks = el('p'), aksi = el('div'); kotak.attrs['data-unit'] = 'STK-001';
        kotak.querySelector = (q) => (q === '[data-unit-teks]' ? teks : aksi);
        const sb = { document: { querySelector: () => kotak, createElement: el }, window: {}, fetch: () => respons(), encodeURIComponent, Number, Error, console };
        sb.window.fetch = sb.fetch; vm.createContext(sb); vm.runInContext(kode, sb);
        await new Promise((ok) => setTimeout(ok, 20));
        return { kotak, teks, aksi };
    }
    const ok = (item) => () => Promise.resolve({ ok: true, json: () => Promise.resolve({ item }) });
    let r = await jalankan(ok([{ kode: 'STK-001', harga: 1500000, status: 'tersedia' }]));
    assert.equal(r.kotak.attrs['data-status'], 'tersedia'); assert.match(r.teks.textContent, /masih tersedia/); assert.match(r.aksi.children[0].href, /^unit\/STK-001\.html$/);
    r = await jalankan(ok([{ kode: 'STK-001', harga: 1500000, status: 'dipesan' }]));
    assert.equal(r.kotak.attrs['data-status'], 'dipesan');
    r = await jalankan(ok([{ kode: 'STK-002', harga: 1, status: 'tersedia' }]));
    assert.equal(r.kotak.attrs['data-status'], 'tidak-tersedia'); assert.match(r.teks.textContent, /sudah tidak tersedia/);
    r = await jalankan(() => Promise.reject(new Error('offline')));
    assert.equal(r.kotak.attrs['data-status'], undefined, 'gagal memuat: teks bawaan dibiarkan'); assert.equal(r.teks.textContent, '');
});

test('merek dan model dipisah: nama stok tidak menggandakan merek, stok lama tetap sama', async () => {
    const { L } = await mulai();
    assert.equal(L.namaStok({ kategori: 'gitar', merek: 'Fender', gitar_merk: 'Aerodyne' }), 'Fender Aerodyne');
    assert.equal(L.namaStok({ kategori: 'gitar', merek: 'Yamaha', gitar_merk: 'Yamaha F310' }), 'Yamaha F310', 'model lama yang sudah memuat merek tidak digandakan');
    assert.equal(L.namaStok({ kategori: 'gitar', gitar_merk: 'Yamaha F310' }), 'Yamaha F310', 'stok lama tanpa merek tidak berubah');
    assert.equal(L.namaStok({ kategori: 'gitar', merek: 'Cort', gitar_merk: '', gitar_jenis: 'Akustik' }), 'Cort');
    assert.equal(L.namaStok({ kategori: 'aksesoris', merek: 'Elixir', nama: 'Nanoweb 11-52' }), 'Elixir Nanoweb 11-52');
    assert.equal(L.judulStok({ kategori: 'gitar', gitar_jenis: 'Akustik', merek: 'Yamaha', gitar_merk: 'F310' }), 'Gitar Akustik Yamaha F310');
    assert.equal(L.kunciMerek('Yamaha '), 'yamaha');
});

test('artikel merek: tautan di artikel unit muncul saat artikel merek terbit, hilang saat ditarik, dan prompt AI-nya khusus merek', async () => {
    const { gh, A, L } = await mulai();
    const unit = await A.simpanArtikel({ judul: 'Yamaha F310 bekas', slug: 'yamaha-f310-bekas', tag: 'Profil Gitar', ringkasan: 'r', isi: '## Spek\n\nisi', status: 'terbit', stok_kode: 'STK-AAA111', merek_nama: 'Yamaha', merek_kunci: 'yamaha', foto: [] });
    const lain = await A.simpanArtikel({ judul: 'Fender Aerodyne', slug: 'fender-aerodyne', tag: 'Profil Gitar', ringkasan: 'r', isi: '## Spek\n\nisi', status: 'terbit', stok_kode: 'STK-BBB222', merek_nama: 'Fender', merek_kunci: 'fender', foto: [] });
    const halUnit = () => gh.isi('ayri-guitar', 'artikel-yamaha-f310-bekas.html');
    assert.ok(!halUnit().includes('Baca selengkapnya tentang mereknya'), 'belum ada artikel merek: tanpa tautan');
    const merek = await A.simpanArtikel({ judul: 'Yamaha: Sejarah', slug: 'yamaha-sejarah', tag: 'Profil Merek', ringkasan: 'r', isi: '## Sejarah\n\nisi', status: 'terbit', jenis_artikel: 'merek', merek_nama: 'Yamaha', merek_kunci: 'yamaha', foto: [] });
    assert.ok(halUnit().includes('href="artikel-yamaha-sejarah.html"') && halUnit().includes('Yamaha: Sejarah'), 'artikel unit memuat tautan ke artikel merek');
    assert.ok(!gh.isi('ayri-guitar', 'artikel-fender-aerodyne.html').includes('yamaha-sejarah'), 'merek lain tidak ikut tertaut');
    const halMerek = gh.isi('ayri-guitar', 'artikel-yamaha-sejarah.html');
    assert.ok(!halMerek.includes('data-unit=') && halMerek.includes('Cari Yamaha bekas atau baru?') && !halMerek.includes('{{'));
    await A.simpanArtikel(Object.assign({}, merek, { status: 'draf' })); /* ditarik */
    assert.ok(!halUnit().includes('yamaha-sejarah'), 'artikel merek ditarik: tautan hilang');
    assert.equal(gh.isi('ayri-guitar', 'artikel-yamaha-sejarah.html'), null);
    const p = L.ai.artikel(merek, null, null);
    assert.match(p.prompt, /Merek: Yamaha/); assert.match(p.prompt, /Sejarah singkat/); assert.match(p.sistem, /fakta merek/); assert.doesNotMatch(p.prompt, /Unit ini di/);
    assert.ok(unit && lain);
});

test('artikel merek memuat tautan ke artikel semua unit merek itu, ikut berubah saat unit terbit/ditarik', async () => {
    const { gh, A } = await mulai();
    const baru = (slug, kode, kunci, status) => ({ judul: 'Unit ' + slug, slug, tag: 'Profil Gitar', ringkasan: 'r', isi: '## S\n\nisi', status: status || 'terbit', stok_kode: kode, merek_nama: kunci, merek_kunci: kunci, foto: [] });
    const halMerek = () => gh.isi('ayri-guitar', 'artikel-yamaha-sejarah.html');
    await A.simpanArtikel({ judul: 'Yamaha: Sejarah', slug: 'yamaha-sejarah', tag: 'Profil Merek', ringkasan: 'r', isi: '## Sejarah\n\nisi', status: 'terbit', jenis_artikel: 'merek', merek_nama: 'Yamaha', merek_kunci: 'yamaha', foto: [] });
    assert.ok(!halMerek().includes('<h2>Unit Yamaha di AYRI</h2>'), 'belum ada artikel unit: tanpa daftar');
    const u1 = await A.simpanArtikel(baru('f310', 'STK-AAA111', 'yamaha'));
    await A.simpanArtikel(baru('cpx600', 'STK-BBB222', 'yamaha'));
    await A.simpanArtikel(baru('aerodyne', 'STK-CCC333', 'fender'));
    const h = halMerek();
    assert.ok(h.includes('<h2>Unit Yamaha di AYRI</h2>') && h.includes('href="artikel-f310.html"') && h.includes('href="artikel-cpx600.html"'));
    assert.ok(!h.includes('aerodyne'), 'unit merek lain tidak ikut');
    await A.simpanArtikel(Object.assign({}, u1, { status: 'draf' })); /* ditarik */
    assert.ok(!halMerek().includes('artikel-f310.html') && halMerek().includes('artikel-cpx600.html'));
});

test('alamat artikel dipotong di batas kata, bukan di tengah kata', async () => {
    const { L } = await mulai();
    const sb = { console }; sb.window = sb; vm.createContext(sb);
    ['util.js', 'artikel-md.js'].forEach((f) => vm.runInContext(baca(f), sb, { filename: f }));
    const s = sb.ArtikelMd.slug('Gitar Elektrik Samick SS51 Hitam Glossy: Spesifikasi, Perawatan, dan Tips Membeli Bekas');
    assert.equal(s, 'gitar-elektrik-samick-ss51-hitam-glossy-spesifikasi-perawatan-dan-tips-membeli');
    assert.ok(s.length <= 80);
    assert.equal(sb.ArtikelMd.slug('Setup Gitar & Café'), 'setup-gitar-dan-cafe');
    assert.equal(sb.ArtikelMd.slug(''), '');
    assert.equal(sb.ArtikelMd.slug('a'.repeat(100)).length, 80, 'satu kata sangat panjang tetap dipotong');
    assert.ok(L);
});

test('cek-servis tidak diindeks Google dan tidak ada di sitemap', () => {
    assert.match(baca('cek-servis.html'), /<meta name="robots" content="noindex, follow">/);
    assert.ok(!baca('sitemap.xml').includes('cek-servis.html'));
});

test('halaman unit statis: tautan ke artikel unit muncul saat artikel terbit dan hilang saat ditarik; peta situs unit', async () => {
    const { gh, A, L } = await mulai();
    const s = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, gitar_jenis: 'Akustik', gitar_merk: 'Yamaha F310', harga_jual: 1500000 }), []);
    const halUnit = () => gh.isi('ayri-guitar', 'unit/' + s.kode + '.html');
    assert.ok(!halUnit().includes('unit-panduan'), 'belum ada artikel');
    const art = await A.simpanArtikel({ judul: 'Akustik Yamaha F310', slug: 'akustik-yamaha-f310', tag: 'Profil Gitar', ringkasan: 'r', isi: '## S\n\nisi', status: 'terbit', stok_id: s.id, stok_kode: s.kode, foto: [] });
    assert.ok(halUnit().includes('href="../artikel-akustik-yamaha-f310.html"') && halUnit().includes('unit-panduan'), 'halaman unit menautkan ke artikel');
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item[0].artikel, 'akustik-yamaha-f310');
    await A.simpanArtikel(Object.assign({}, art, { status: 'draf' }));
    assert.ok(!halUnit().includes('unit-panduan'), 'artikel ditarik: tautan hilang');
    assert.equal(gh.json('ayri-guitar', 'data/katalog.json').item[0].artikel, undefined);
    assert.ok(gh.isi('ayri-guitar', 'sitemap-unit.xml').includes(s.kode));
    await A.simpanStok(Object.assign({}, s, { tampil: false }), []);
    assert.ok(!gh.isi('ayri-guitar', 'sitemap-unit.xml').includes(s.kode), 'barang keluar katalog: keluar dari peta situs unit');
    assert.ok(L);
});

test('skrip halaman unit statis: status terbaru, barang terjual, dan barang lainnya', async () => {
    const kode = baca('unit-statis.js');
    async function jalankan(respons, kodeUnit) {
        const el = (id) => ({ id, attrs: {}, children: [], hidden: false, className: '', textContent: '', innerHTML: '', getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {}, querySelector(q) { return q === '.unit-status' ? status : null; } });
        const status = el('status'), box = el('unit'), bar = el('unit-bar'), serupa = el('unit-serupa'); box.attrs['data-kode'] = kodeUnit; serupa.hidden = true;
        const m = { unit: box, 'unit-bar': bar, 'unit-serupa': serupa };
        const doc = { addEventListener: (_, f) => f(), getElementById: (i) => m[i] || null, querySelector: () => null };
        const esc = (x) => String(x), rupiah = (n) => 'Rp' + n;
        const sb = { document: doc, window: { AYRI_LAYANAN: { jenisTanpaGitar: ['Bass'] } }, AYRI_UTIL: { esc, rupiah }, fetch: () => respons(), encodeURIComponent, console };
        vm.createContext(sb); vm.runInContext(kode, sb); await new Promise((ok) => setTimeout(ok, 20));
        return { status, bar, serupa };
    }
    const item = (k, st) => ({ kode: k, kategori: 'gitar', kondisi: 'bekas', jenis: 'Akustik', nama: 'Yamaha', warna: '', harga: 1000, status: st || 'tersedia', foto: [] });
    const ok = (items) => () => Promise.resolve({ ok: true, json: () => Promise.resolve({ item: items }) });
    let r = await jalankan(ok([item('A'), item('B')]), 'A');
    assert.equal(r.status.textContent, '', 'masih dijual: teks statis dibiarkan'); assert.equal(r.serupa.hidden, false); assert.match(r.serupa.innerHTML, /href="B\.html"/);
    r = await jalankan(ok([item('B')]), 'A');
    assert.match(r.status.textContent, /sudah terjual/); assert.equal(r.bar.hidden, true);
    r = await jalankan(ok([item('A', 'dipesan')]), 'A');
    assert.match(r.status.textContent, /dipesan/);
    r = await jalankan(() => Promise.reject(new Error('offline')), 'A');
    assert.equal(r.status.textContent, '', 'gagal memuat: isi statis dibiarkan');
});
