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
    const g = L.ai.artikel({ judul: 'Akustik Yamaha F310' }, null, stokContoh('s1', 1, { gitar_jenis: 'Akustik', gitar_merk: 'Yamaha F310', kondisi: 'bekas', deskripsi: 'lecet kecil di body', harga_jual: 1500000, harga_beli: 900000 }));
    assert.match(g.sistem, /FAKTA UNIT INI/); assert.match(g.sistem, /tanpa kesan endorsement/);
    assert.match(g.prompt, /Sejarah singkat merek/); assert.match(g.prompt, /Kalau membeli bekas/); assert.match(g.prompt, /lecet kecil di body/);
    assert.ok(!/1500000|900000|1\.500\.000/.test(g.prompt), 'harga tidak dikirim ke AI');
    const a = L.ai.artikel({ judul: 'Senar' }, null, stokContoh('s2', 3, { kategori: 'aksesoris', sub: 'Senar', nama: 'Orphee NX35' }));
    assert.match(a.prompt, /Cara memilih/); assert.doesNotMatch(a.prompt, /Sejarah singkat merek/);
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
    assert.equal(r.kotak.attrs['data-status'], 'tersedia'); assert.match(r.teks.textContent, /masih tersedia/); assert.match(r.aksi.children[0].href, /^unit\.html\?k=STK-001$/);
    r = await jalankan(ok([{ kode: 'STK-001', harga: 1500000, status: 'dipesan' }]));
    assert.equal(r.kotak.attrs['data-status'], 'dipesan');
    r = await jalankan(ok([{ kode: 'STK-002', harga: 1, status: 'tersedia' }]));
    assert.equal(r.kotak.attrs['data-status'], 'tidak-tersedia'); assert.match(r.teks.textContent, /sudah tidak tersedia/);
    r = await jalankan(() => Promise.reject(new Error('offline')));
    assert.equal(r.kotak.attrs['data-status'], undefined, 'gagal memuat: teks bawaan dibiarkan'); assert.equal(r.teks.textContent, '');
});
