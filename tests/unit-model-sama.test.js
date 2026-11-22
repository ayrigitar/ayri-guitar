'use strict';
/* Halaman unit: gitar lain dengan jenis & merek/model yang sama (beda kemulusan/harga) tampil di "Unit lain, model sama".
   Hanya data publik (foto kecil, kemulusan, harga); diperbarui otomatis saat stok disimpan; hilang saat tinggal satu. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh } = require('./helper');

async function mulai() { const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh); await d.masuk(); return { gh, A: d.A, L: d.L }; }
const cort = (o) => stokContoh(null, 1, Object.assign({ id: undefined, kode: undefined, created_at: undefined, merek: 'Cort', gitar_merk: 'AD810 OP', gitar_jenis: 'Akustik', kondisi: 'bekas', warna: 'Natural', harga_beli: 700000 }, o));
const katalog = (gh) => gh.json('ayri-guitar', 'data/katalog.json').item;
const halaman = (gh, kode) => gh.isi('ayri-guitar', 'unit/' + kode + '.html');

test('model sama: kedua halaman unit saling menautkan, dengan kemulusan, harga, selisih, dan label', async () => {
    const { gh, A } = await mulai();
    const vg = await A.simpanStok(cort({ tingkat: 'very_good', harga_jual: 1000000 }), []);
    assert.ok(!('lain' in katalog(gh)[0]), 'satu unit: tidak ada bagian model sama');
    assert.ok(!halaman(gh, vg.kode).includes('unit-kembar'));
    const mint = await A.simpanStok(cort({ tingkat: 'mint', harga_jual: 1300000 }), []);
    const good = await A.simpanStok(cort({ tingkat: 'good', harga_jual: 800000, warna: 'Sunburst' }), []);
    const lain = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, merek: 'Cort', gitar_merk: 'AD810', gitar_jenis: 'Akustik', tingkat: 'mint', harga_jual: 900000 }), []);
    const hal = halaman(gh, vg.kode);
    assert.ok(hal.includes('<h2>Unit lain, model sama</h2>'));
    assert.ok(hal.includes('href="' + mint.kode + '.html"') && hal.includes('href="' + good.kode + '.html"'), 'tautan ke dua unit lain');
    assert.ok(!hal.includes('href="' + lain.kode + '.html"'), 'model beda (AD810 tanpa OP) tidak ikut');
    assert.ok(hal.indexOf(mint.kode) < hal.indexOf(good.kode), 'termahal dulu');
    assert.ok(hal.includes('>Mint</span><small class="unit-kembar__k unit-kembar__k--mulus">Lebih mulus</small>'), 'Mint lebih mulus dari Very Good');
    assert.ok(hal.includes('<b>Rp1.300.000</b><small>+Rp300.000</small>'), 'harga + selisih');
    assert.ok(hal.includes('>Good</span><small class="unit-kembar__k">Lebih hemat</small><small>Sunburst</small>'), 'lebih hemat; warna beda disebut');
    assert.ok(hal.includes('<small>−Rp200.000</small>'));
    assert.ok(halaman(gh, mint.kode).includes('href="' + vg.kode + '.html"'), 'halaman unit lain juga menautkan balik');
    assert.ok(!hal.includes('700000') && !hal.includes('700.000'), 'modal tidak pernah ikut');
});

test('model sama: unit terjual/ditarik hilang dari daftar; tinggal satu = bagiannya hilang', async () => {
    const { gh, A } = await mulai();
    const a = await A.simpanStok(cort({ tingkat: 'very_good', harga_jual: 1000000 }), []);
    const b = await A.simpanStok(cort({ tingkat: 'mint', harga_jual: 1300000 }), []);
    assert.ok(halaman(gh, a.kode).includes(b.kode));
    await A.simpanStok(Object.assign({}, b, { status: 'ditarik' }), []);
    assert.equal(halaman(gh, b.kode), null, 'halaman unit yang ditarik dihapus');
    assert.ok(!halaman(gh, a.kode).includes('unit-kembar'), 'halaman unit sisanya dibuat ulang tanpa bagian model sama');
    assert.ok(!('lain' in katalog(gh).filter((x) => x.kode === a.kode)[0]));
});

test('label perbandingan: baru > Mint > Excellent > Very Good > Good; tanpa tingkat tidak dibandingkan kemulusannya', async () => {
    const { L } = await mulai();
    const u = (kondisi, tingkat, harga) => ({ kondisi, tingkat, harga });
    assert.equal(L.bandingUnit(u('bekas', 'Very Good', 1000), u('bekas', 'Mint', 1300)), 'Lebih mulus');
    assert.equal(L.bandingUnit(u('bekas', 'Very Good', 1000), u('bekas', 'Good', 800)), 'Lebih hemat');
    assert.equal(L.bandingUnit(u('bekas', 'Good', 1000), u('bekas', 'Excellent', 900)), 'Lebih mulus & lebih hemat');
    assert.equal(L.bandingUnit(u('bekas', 'Mint', 1000), u('bekas', 'Good', 1200)), '', 'kurang mulus dan lebih mahal: tanpa label');
    assert.equal(L.bandingUnit(u('bekas', 'Mint', 1000), u('baru', undefined, 1500)), 'Lebih mulus', 'baru di atas Mint');
    assert.equal(L.bandingUnit(u('bekas', undefined, 1000), u('bekas', 'Mint', 1500)), '', 'tingkat belum dinilai: tidak dibandingkan');
    assert.equal(L.kunciModel({ kategori: 'aksesoris', jenis: 'Senar', nama: 'QA140' }), '', 'aksesoris tidak (punya halaman seri sendiri)');
    assert.equal(L.kunciModel({ kategori: 'gitar', jenis: 'Akustik', nama: 'Cort AD810 OP' }), L.kunciModel({ kategori: 'gitar', jenis: 'Akustik', nama: 'cort  ad810-op' }), 'beda huruf besar/spasi tetap sama');
});
