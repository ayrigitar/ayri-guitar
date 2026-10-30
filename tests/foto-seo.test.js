'use strict';
/* SEO foto: nama file deskriptif untuk foto publik baru (stok & artikel), alt, data gambar terstruktur, dan sitemap gambar. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub());
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, d, A: d.A, L: d.L };
}
const foto = (n) => ({ tahap: 'gitar', hasil: { besar: new Blob([Buffer.from('besar-' + n)], { type: 'image/webp' }), kecil: new Blob([Buffer.from('kecil-' + n)], { type: 'image/webp' }) } });
function muatBuilder() {
    const sb = { console }; sb.window = sb; vm.createContext(sb);
    ['util.js', 'artikel-md.js', 'artikel-builder.js'].forEach((f) => vm.runInContext(baca(f), sb, { filename: f }));
    return sb.ArtikelBuilder;
}

test('slugFoto: huruf kecil, tanda minus, tanpa aksen/simbol, dipotong di batas kata', async () => {
    const { L } = await mulai();
    assert.equal(L.slugFoto('Bass Fender Aerodyne (Hitam Glossy) ★'), 'bass-fender-aerodyne-hitam-glossy');
    assert.equal(L.slugFoto('  Café  Müller__2'), 'cafe-muller-2');
    assert.equal(L.slugFoto(''), '');
    const panjang = L.slugFoto('Basic Setup Akustik Yamaha F310 nut rusak buzzing senar nomer 6 dan 5 sudah diperbaiki', 40);
    assert.ok(panjang.length <= 40 && !panjang.endsWith('-') && /^[a-z0-9-]+$/.test(panjang), panjang);
    assert.equal(panjang, 'basic-setup-akustik-yamaha-f310-nut', 'kata yang terpotong dibuang, bukan dipenggal');
});

test('foto stok baru diberi nama dari merk/model, warna, dan kode; tanpa nomor seri, harga, atau modal', async () => {
    const { gh, A, L } = await mulai();
    const r = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, gitar_jenis: 'Bass', gitar_merk: 'Fender Aerodyne', warna: 'Hitam Glossy', no_seri: 'SN-RAHASIA-777', harga_beli: 777777, harga_jual: 13000000 }), [foto(1), foto(2)]);
    const kode = r.kode.toLowerCase();
    assert.equal(r.foto.length, 2);
    const nama = new RegExp('^foto/stok/bass-fender-aerodyne-hitam-glossy-' + kode + '-[0-9a-f]{6}\\.webp$');
    r.foto.forEach((f) => { assert.match(f.path, nama); assert.match(f.thumb_path, new RegExp(f.path.replace(/\.webp$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-k\\.webp$')); });
    assert.notEqual(r.foto[0].path, r.foto[1].path, 'dua foto tidak boleh bernama sama');
    const berkas = gh.daftarFile('ayri-guitar').filter((p) => p.startsWith('foto/stok/'));
    assert.equal(berkas.length, 4, 'foto besar + kecil, dua foto');
    assert.ok(!berkas.join(' ').match(/rahasia|777|13000000/i), 'nama file tidak memuat data pribadi/harga');
    const kat = gh.json('ayri-guitar', 'data/katalog.json').item[0];
    assert.equal(kat.foto[0].src, r.foto[0].path);
    assert.match(L.altKatalog(kat, 2), /^Bass Fender Aerodyne Hitam Glossy bekas – foto 2$/);
});

test('foto artikel baru diberi nama dari judul/alamat artikel', async () => {
    const { A } = await mulai();
    const paths = await A.unggahFotoArtikel([foto(1).hasil, foto(2).hasil], 'Basic Setup Yamaha F310: nut rusak!');
    paths.forEach((p) => assert.match(p, /^foto\/artikel\/basic-setup-yamaha-f310-nut-rusak-[0-9a-f]{6}\.webp$/));
    assert.notEqual(paths[0], paths[1]);
    const tanpa = await A.unggahFotoArtikel([foto(3).hasil]);
    assert.match(tanpa[0], /^foto\/artikel\/[0-9a-f]{6}\.webp$/, 'tanpa dasar: nama acak seperti sebelumnya');
});

test('pembuat halaman artikel menerima nama foto ber-tanda-minus, memberi data gambar terstruktur dan sitemap gambar', () => {
    const B = muatBuilder();
    const a = { judul: 'Nut rusak Yamaha F310', slug: 'nut-rusak-yamaha-f310', isi: 'isi', ringkasan: 'ringkas', status: 'terbit', terbit_at: '2026-10-30T00:00:00Z', foto: [
        { path: 'foto/artikel/nut-rusak-yamaha-f310-sebelum-a1b2c3.webp', alt: 'Sebelum servis: Akustik Yamaha F310' },
        { path: 'foto/artikel/../../rahasia.webp', alt: 'berbahaya' },
        { path: 'foto/artikel/lama1234abcd.webp', alt: '' }] };
    const tpl = baca('scripts/artikel-template.html');
    const html = B.halaman(tpl, a, 'https://ayrigitar.com/');
    assert.ok(html.includes('nut-rusak-yamaha-f310-sebelum-a1b2c3.webp') && html.includes('lama1234abcd.webp'));
    assert.ok(!html.includes('rahasia.webp'), 'jalur berbahaya tetap ditolak');
    assert.ok(html.includes('"@type": "ImageObject"') || html.includes('"@type":"ImageObject"'));
    assert.ok(html.includes('Sebelum servis: Akustik Yamaha F310'), 'alt/caption dipakai');
    const peta = B.entriSitemap(a, 'https://ayrigitar.com/');
    assert.ok(peta.includes('<image:loc>https://ayrigitar.com/foto/artikel/nut-rusak-yamaha-f310-sebelum-a1b2c3.webp</image:loc>'));
    assert.ok(peta.includes('<image:caption>Sebelum servis: Akustik Yamaha F310</image:caption>') && peta.includes('<image:caption>Nut rusak Yamaha F310</image:caption>'), 'caption: alt, atau judul bila alt kosong');
    assert.ok(!peta.includes('rahasia'));
    assert.match(baca('sitemap.xml'), /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
});

test('halaman pratinjau unit: foto sebagai ImageObject dengan keterangan', async () => {
    const { L } = await mulai();
    const x = { kode: 'STK-AAAAAA', kategori: 'gitar', jenis: 'Akustik', kondisi: 'bekas', tingkat: 'Excellent', nama: 'Yamaha F310', warna: 'Natural', harga: 1500000, status: 'tersedia', deskripsi: '', foto: [{ src: 'foto/stok/a.webp', kecil: 'foto/stok/a-k.webp' }, { src: 'foto/stok/b.webp', kecil: 'foto/stok/b-k.webp' }] };
    const m = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(L.halamanUnit(x));
    const ld = JSON.parse(m[1].split('\\u003c').join('<'));
    assert.equal(ld.image.length, 2);
    assert.equal(ld.image[1]['@type'], 'ImageObject');
    assert.equal(ld.image[1].caption, 'Gitar Akustik Yamaha F310 Natural bekas Excellent – foto 2');
    assert.ok(ld.image[1].contentUrl.endsWith('/foto/stok/b.webp'));
});
