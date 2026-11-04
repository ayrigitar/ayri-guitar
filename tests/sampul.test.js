'use strict';
/* Foto sampul seri: satu foto per seri, disimpan terpisah dari barang (tetap ada walau semua barang terjual),
   dipakai di katalog.json (kartu seri), halaman seri (foto pertama + og:image), dan poster seri. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca } = require('./helper');

async function mulai() { const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh); await d.masuk(); return { gh, A: d.A, L: d.L }; }
const senar = (o) => stokContoh(null, 1, Object.assign({ id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', kondisi: 'baru', sub: 'Senar', merek: 'Orphee', seri: 'Beyer Seri', alat: ['Gitar Akustik'], jumlah: 3, harga_jual: 90000 }, o));
const foto = (tipe) => ({ besar: new Blob([new Uint8Array([1, 2, 3, 4])], { type: tipe || 'image/webp' }), kecil: new Blob([new Uint8Array([5, 6])], { type: tipe || 'image/webp' }) });
const KAT = 'data/katalog.json', SAMPUL = 'data/sampul-seri.json';

test('sampul seri: tersimpan sendiri, dipakai katalog & halaman seri, diganti/dihapus, dan tetap ada saat semua barang terjual', async () => {
    const { gh, A, L } = await mulai();
    const a = await A.simpanStok(senar({ nama: 'QA140', ukuran: '010' }), []);
    const b = await A.simpanStok(senar({ nama: 'QA150', ukuran: '011' }), []);
    const grup = gh.json('ayri-guitar', KAT).item.filter((x) => x.grup)[0].grup;
    assert.equal(grup, L.grupSeri(a));
    assert.ok(!('sampul' in gh.json('ayri-guitar', KAT)), 'tanpa sampul: katalog tidak berubah bentuk');
    assert.deepEqual(JSON.stringify(await A.muatSampulSeri()), '{}');

    const cv = await A.simpanSampulSeri(grup, foto());
    assert.match(cv.src, new RegExp('^foto/seri/' + grup + '-[0-9a-f]+\\.webp$'));
    assert.match(cv.kecil, /-k\.webp$/);
    assert.ok(gh.daftarFile('ayri-guitar').includes(cv.src) && gh.daftarFile('ayri-guitar').includes(cv.kecil), 'berkas foto ada di situs');
    assert.equal(gh.json('ayri-guitar', SAMPUL)[grup].src, cv.src);
    assert.equal(gh.json('ayri-guitar', KAT).sampul[grup].kecil, cv.kecil, 'katalog.json memuat sampul seri');
    const hal = gh.isi('ayri-guitar', 'unit/seri-' + grup + '.html');
    assert.ok(hal.includes('og:image" content="' + L.situs() + cv.src), 'pratinjau tautan memakai sampul');
    assert.ok(hal.indexOf('src="../' + cv.src + '"') > -1, 'galeri halaman seri: sampul ada');
    assert.deepEqual(JSON.stringify(await A.muatSampulSeri()), JSON.stringify({ [grup]: cv }));

    /* ganti: berkas lama dihapus */
    const cv2 = await A.simpanSampulSeri(grup, foto('image/jpeg'));
    assert.match(cv2.src, /\.jpg$/);
    const berkas = gh.daftarFile('ayri-guitar');
    assert.ok(!berkas.includes(cv.src) && !berkas.includes(cv.kecil), 'foto sampul lama dibuang');
    assert.equal(gh.json('ayri-guitar', KAT).sampul[grup].src, cv2.src);
    assert.ok(gh.isi('ayri-guitar', 'unit/seri-' + grup + '.html').includes('og:image" content="' + L.situs() + cv2.src), 'halaman seri ditulis ulang untuk sampul baru');

    /* semua barang seri habis: katalog & halaman seri hilang, TAPI foto sampul tetap tersimpan */
    const a2 = await A.simpanStok(Object.assign({}, a, { tampil: false }), []);
    const b2 = await A.simpanStok(Object.assign({}, b, { tampil: false }), []);
    assert.ok(!('sampul' in gh.json('ayri-guitar', KAT)), 'tidak ada seri di katalog: sampul tidak ikut dipublikasikan di katalog');
    assert.equal(gh.json('ayri-guitar', SAMPUL)[grup].src, cv2.src, 'foto sampul tetap tersimpan');
    assert.ok(gh.daftarFile('ayri-guitar').includes(cv2.src), 'berkas foto tetap ada');

    /* varian baru masuk lagi: sampul langsung dipakai tanpa unggah ulang */
    await A.simpanStok(Object.assign({}, a2, { tampil: true }), []);
    await A.simpanStok(Object.assign({}, b2, { tampil: true }), []);
    assert.equal(gh.json('ayri-guitar', KAT).sampul[grup].src, cv2.src, 'seri terbentuk lagi: sampul lama dipakai');
    assert.ok(gh.isi('ayri-guitar', 'unit/seri-' + grup + '.html').includes(cv2.src));

    /* hapus */
    assert.equal(await A.simpanSampulSeri(grup, null), null);
    assert.ok(!(grup in gh.json('ayri-guitar', SAMPUL)) && !gh.daftarFile('ayri-guitar').includes(cv2.src), 'sampul dihapus beserta berkasnya');
    assert.ok(!('sampul' in gh.json('ayri-guitar', KAT)));
    assert.ok(!gh.isi('ayri-guitar', 'unit/seri-' + grup + '.html').includes('foto/seri/'), 'halaman seri kembali tanpa sampul');
});

test('sampul seri: kunci seri harus valid', async () => {
    const { A } = await mulai();
    await assert.rejects(() => A.simpanSampulSeri('', foto()), /Seri/);
    await assert.rejects(() => A.simpanSampulSeri('../x', foto()), /Seri/);
});

test('kode: kartu katalog seri memakai sampul, form stok punya unggah/hapus, poster seri memakai sampul', () => {
    const kat = baca('katalog.html'), adm = baca('admin.js');
    assert.match(kat, /sampul = d\.sampul \|\| \{\}/);
    assert.match(kat, /f = cv\.src \? cv : p\.foto\[0\]/, 'kartu seri: sampul lebih dulu, foto varian pertama sebagai cadangan');
    assert.match(kat, /cv\.kolase \? kolase\(m\)/, 'kartu seri: kolase bila dinyalakan dan tanpa foto khusus');
    assert.match(adm, /A\.aturKolaseSeri\(grup, nyala\)/);
    assert.match(adm, /id="sk-sampul-file"/);
    assert.match(adm, /A\.simpanSampulSeri\(grup, h\)/);
    assert.match(adm, /A\.simpanSampulSeri\(grup, null\)/);
    assert.match(adm, /A\.muatSampulSeri\(\)\.then\(function \(p\) \{\s+var cv = p\[sr\.grup\]/, 'poster seri memakai sampul');
});

test('kolase seri: tersimpan per seri, tidak menggeser foto khusus, dan tetap ada saat foto khusus dihapus', async () => {
    const { gh, A, L } = await mulai();
    const a = await A.simpanStok(senar({ nama: 'QA140', ukuran: '010' }), []);
    await A.simpanStok(senar({ nama: 'QA150', ukuran: '011' }), []);
    const grup = L.grupSeri(a);
    assert.equal(await A.aturKolaseSeri(grup, true), true);
    assert.deepEqual(JSON.parse(JSON.stringify(gh.json('ayri-guitar', SAMPUL)[grup])), { kolase: true });
    assert.deepEqual(JSON.parse(JSON.stringify(gh.json('ayri-guitar', KAT).sampul[grup])), { kolase: true }, 'katalog: kolase tanpa foto khusus');
    const hal = gh.isi('ayri-guitar', 'unit/seri-' + grup + '.html');
    assert.ok(!hal.includes('undefined'), 'halaman seri aman tanpa foto khusus');

    /* foto khusus ditambahkan: kolase tetap tercatat, foto khusus yang dipakai */
    const cv = await A.simpanSampulSeri(grup, foto());
    const ent = JSON.parse(JSON.stringify(gh.json('ayri-guitar', KAT).sampul[grup]));
    assert.deepEqual(ent, { src: cv.src, kecil: cv.kecil, kolase: true });
    assert.ok(gh.isi('ayri-guitar', 'unit/seri-' + grup + '.html').includes('og:image" content="' + L.situs() + cv.src));

    /* foto khusus dihapus: kolase tetap ada */
    await A.simpanSampulSeri(grup, null);
    assert.deepEqual(JSON.parse(JSON.stringify(gh.json('ayri-guitar', SAMPUL)[grup])), { kolase: true });
    assert.ok(!gh.daftarFile('ayri-guitar').includes(cv.src));

    /* kolase dimatikan: entri hilang */
    assert.equal(await A.aturKolaseSeri(grup, false), false);
    assert.ok(!(grup in gh.json('ayri-guitar', SAMPUL)));
    assert.ok(!('sampul' in gh.json('ayri-guitar', KAT)));
    await assert.rejects(() => A.aturKolaseSeri('../x', true), /Seri/);
});
