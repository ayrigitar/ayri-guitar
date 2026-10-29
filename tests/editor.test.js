'use strict';
/* Editor konten website: elemen bertanda data-edit di index.html diubah tanpa menyentuh bagian lain halaman. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const { bikinGitHub, siapkanRepo, bikinPerangkat, REPO } = require('./helper');

const INDEX = fs.readFileSync(REPO + 'index.html', 'utf8');
async function mulai(o) {
    const gh = siapkanRepo(bikinGitHub(), { situs: Object.assign({ 'index.html': INDEX }, (o && o.situs) || {}) });
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, d, A: d.A, L: d.L };
}

test('index.html: setiap kunci data-edit unik dan bagian utama bisa diedit', () => {
    const kunci = [...INDEX.matchAll(/\sdata-edit="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(kunci).size, kunci.length, 'kunci ganda: ' + kunci.filter((k, i) => kunci.indexOf(k) !== i).join(', '));
    for (const k of ['promo.tampil', 'promo.teks', 'hero.judul', 'hero.aksen', 'hero.lead', 'hero.info', 'harga.0.nama', 'harga.0.harga', 'lokasi.alamat', 'jam.0.hari', 'jam.0.jam']) assert.ok(kunci.includes(k), k);
    assert.equal(kunci.filter((k) => /^harga\.\d+\.harga$/.test(k)).length, 14);
});

test('terapkanEdit: teks di-escape, harga mengubah value dan tampilan, hanya bagian itu yang berubah', async () => {
    const { L } = await mulai();
    const baru = L.terapkanEdit(INDEX, { 'hero.judul': 'Servis <Gitar> & "Bass"', 'harga.0.harga': 125000 });
    assert.ok(baru.includes('data-edit="hero.judul" data-edit-label="Judul">Servis &lt;Gitar&gt; &amp; &quot;Bass&quot;</span>'));
    assert.ok(baru.includes('data-edit="harga.0.harga" data-edit-jenis="harga" data-edit-label="Harga (Rp)" value="125000"><span class="price__cur">Rp</span> 125.000</data>'));
    /* bagian lain utuh: kembalikan nilai lama, hasilnya identik dengan aslinya */
    assert.equal(L.terapkanEdit(baru, { 'hero.judul': 'Servis, Jual Beli & Tukar Tambah', 'harga.0.harga': 100000 }), INDEX);
});

test('terapkanEdit: banner promo bisa ditampilkan dan disembunyikan lagi tanpa sisa', async () => {
    const { L } = await mulai();
    assert.match(INDEX, /data-edit="promo\.tampil"[^>]*\shidden>/);
    const tampil = L.terapkanEdit(INDEX, { 'promo.tampil': true, 'promo.teks': 'Diskon setup 10%' });
    assert.ok(!/data-edit="promo\.tampil"[^>]*\shidden>/.test(tampil));
    assert.ok(tampil.includes('data-edit="promo.teks" data-edit-label="Teks promo">Diskon setup 10%</span>'));
    const sembunyi = L.terapkanEdit(tampil, { 'promo.tampil': false, 'promo.teks': 'Tulis promo di menu Website POS' });
    assert.equal(sembunyi, INDEX);
});

test('terapkanEdit: kunci yang tidak ada ditolak dengan pesan jelas', async () => {
    const { L } = await mulai();
    assert.throws(() => L.terapkanEdit(INDEX, { 'tidak.ada': 'x' }), /tidak ditemukan/);
});

test('terbitkanHalaman: menulis perubahan ke index.html di repo situs; tanpa perubahan tidak membuat commit', async () => {
    const { gh, A } = await mulai();
    await A.terbitkanHalaman('index.html', { 'jam.1.jam': '13:30 - 19:00', 'lokasi.alamat': 'Jl. Contoh 1, Bogor' });
    const isi = gh.isi('ayri-guitar', 'index.html');
    assert.ok(isi.includes('data-edit="jam.1.jam" data-edit-label="Jam">13:30 - 19:00</span>'));
    assert.ok(isi.includes('data-edit="lokasi.alamat" data-edit-label="Alamat">Jl. Contoh 1, Bogor</span>'));
    assert.equal(await A.bacaHalaman('index.html'), isi);
    const sebelum = gh.log.length;
    await A.terbitkanHalaman('index.html', { 'jam.1.jam': '13:30 - 19:00' });
    assert.ok(!gh.log.slice(sebelum).some((x) => /POST .*\/git\/commits/.test(x)), 'nilai sama: tidak ada commit baru');
});
