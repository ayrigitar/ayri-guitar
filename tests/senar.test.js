'use strict';
/* Senar & aksesoris: judul "Senar Gitar Akustik Orphee SA38 Ukuran 011", alat musik, ukuran/tension, fitur unggulan (bubble poster), saran merek. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca } = require('./helper');

async function mulai() { const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh); await d.masuk(); return { gh, A: d.A, L: d.L }; }
const util = (() => { const sb = { console }; sb.window = sb; vm.createContext(sb); vm.runInContext(baca('util.js'), sb); return sb.AYRI_UTIL; })();

test('judul: urutan Kategori - Alat musik - Merek & model - Ukuran; tension tanpa kata Ukuran; data lama tidak berubah', () => {
    const dasar = { kategori: 'aksesoris', jenis: 'Senar', nama: 'Orphee SA38' };
    assert.equal(util.judulKatalog(Object.assign({ alat: ['Gitar Akustik'], ukuran: '011' }, dasar)), 'Senar Gitar Akustik Orphee SA38 Ukuran 011');
    assert.equal(util.judulKatalog({ kategori: 'aksesoris', jenis: 'Senar', nama: 'Orphee NX35', alat: ['Gitar Klasik', 'Guitalele'], ukuran: 'Hard Tension' }), 'Senar Gitar Klasik / Guitalele Orphee NX35 Hard Tension');
    assert.equal(util.judulKatalog(dasar), 'Orphee SA38', 'stok lama tanpa alat/ukuran: tetap nama saja');
    assert.equal(util.judulKatalog({ kategori: 'aksesoris', jenis: 'Kabel', nama: 'Beyer ISO100LU3', tipe: 'Jack 6.5mm Mono', ukuran: '3 Meter' }), 'Kabel Jack 6.5mm Mono Beyer ISO100LU3 3 Meter', 'kabel: tipe + panjang tanpa kata Ukuran');
    assert.equal(util.judulKatalog({ kategori: 'gitar', jenis: 'Akustik', nama: 'Yamaha F310' }, ['Bass']), 'Gitar Akustik Yamaha F310');
    assert.equal(util.judulKatalog({ kategori: 'gitar', jenis: 'Bass', nama: 'Fender Aerodyne' }, ['Bass']), 'Bass Fender Aerodyne');
});

test('stok senar: judul untuk poster/WA, katalog memuat alat, ukuran, fitur; halaman unit statis menampilkannya', async () => {
    const { gh, A, L } = await mulai();
    const s = await A.simpanStok(stokContoh(null, 1, { id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', kondisi: 'baru', sub: 'Senar', merek: 'Orphee', nama: 'SA38', gitar_merk: '',
        alat: ['Gitar Akustik'], ukuran: '011', fitur: ['Phosphor Bronze', 'Anti Rust'], jumlah: 5, harga_jual: 100000 }), []);
    assert.equal(L.judulStok(s), 'Senar Gitar Akustik Orphee SA38 Ukuran 011');
    const kat = gh.json('ayri-guitar', 'data/katalog.json').item.filter((x) => x.kode === s.kode)[0];
    assert.deepEqual([kat.alat, kat.ukuran, kat.fitur].map((x) => JSON.parse(JSON.stringify(x))), [['Gitar Akustik'], '011', ['Phosphor Bronze', 'Anti Rust']]);
    const hal = gh.isi('ayri-guitar', 'unit/' + s.kode + '.html');
    assert.ok(hal.includes('<h1>Senar Gitar Akustik Orphee SA38 Ukuran 011</h1>'));
    assert.ok(hal.includes('<ul class="unit-fitur"><li>Phosphor Bronze</li><li>Anti Rust</li></ul>'), 'fitur tampil sebagai bubble di halaman unit');
    assert.ok(hal.includes('Untuk alat musik') && hal.includes('Gitar Akustik') && hal.includes('<dt>Ukuran</dt><dd>011</dd>'));
    /* stok tanpa data baru: kunci tidak ditulis */
    const lama = await A.simpanStok(stokContoh(null, 2, { id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', kondisi: 'baru', sub: 'Capo', nama: 'Kyser', gitar_merk: '', jumlah: 3, harga_jual: 150000 }), []);
    const katLama = gh.json('ayri-guitar', 'data/katalog.json').item.filter((x) => x.kode === lama.kode)[0];
    assert.ok(!('alat' in katLama) && !('ukuran' in katLama) && !('fitur' in katLama));
});

test('antarmuka stok & poster: alat musik, ukuran, fitur, saran merek; poster aksesoris tanpa lencana + bubble', () => {
    const kode = baca('admin.js'), cfg = baca('layanan-config.js');
    assert.match(cfg, /alatMusik: \['Gitar Akustik', 'Gitar Klasik', 'Gitar Elektrik', 'Bass', 'Ukulele', 'Guitalele'\]/);
    assert.match(cfg, /aksesoris: {[\s\S]*'Senar': { alat: true, ukuran: { label: 'Ukuran \/ tension senar', pilihan: \['008'[\s\S]*'013', 'Normal Tension', 'Hard Tension'\] } }/, 'senar: alat + ukuran');
    assert.match(cfg, /'Kabel': { tipe: {[\s\S]*'Jack 6.5mm Mono'[\s\S]*'XLR'[\s\S]*}, ukuran: { label: 'Panjang kabel', pilihan: \['1 Meter'[\s\S]*'10 Meter'\] } }/, 'kabel: tipe kepala + panjang, tanpa alat musik');
    assert.match(cfg, /'Case & tas': { alat: true, tanpaKategori: true, tipe: {[\s\S]*'Hardcase', 'Softcase', 'Gigbag'/, 'case: judul tanpa kata kategori');
    assert.match(kode, /list="dl-merek"/); assert.match(kode, /function merekSaran\(\) \{ return saranDariStok\(function \(s\) \{ return s\.merek; \}\); \}/, 'saran merek dari stok yang sudah ada');
    for (const id of ['sk-alat', 'sk-skema', 'sk-fitur', 'sk-fitur-in', 'sk-fitur-tambah']) assert.match(kode, new RegExp(id), id);
    assert.match(kode, /function skemaHtml\(s\)/); assert.match(kode, /id="sk-skema" class="ly-f">' \+ skemaHtml\(s\)/, 'isian mengikuti kategori aksesoris');
    assert.match(kode, /s\.fitur\.length >= 4\) return toast\('Maksimal 4 fitur/);
    const poster = kode.slice(kode.indexOf('function buatPoster(s, opsi)'), kode.indexOf('function blobBase64'));
    assert.match(poster, /aksPoster = s\.kategori === 'aksesoris'/); assert.match(poster, /if \(!aksPoster\) \{/, 'lencana BARU/kategori tidak untuk aksesoris');
    assert.match(poster, /bubble fitur unggulan/); assert.match(poster, /slice\(0, 4\)/);
});

test('judul per kategori: Case & tas tanpa kata kategori ganda, Kabel & Tuner memakai tipe', () => {
    const skema = { 'Case & tas': { tanpaKategori: true }, 'Kabel': {}, 'Tuner': {} };
    const j = (x) => util.judulKatalog(Object.assign({ kategori: 'aksesoris' }, x), ['Bass'], skema);
    assert.equal(j({ jenis: 'Case & tas', tipe: 'Hardcase', alat: ['Gitar Akustik'], nama: 'Cort CC-100', ukuran: 'Jumbo' }), 'Hardcase Gitar Akustik Cort CC-100 Jumbo');
    assert.equal(j({ jenis: 'Case & tas', alat: ['Gitar Akustik'], nama: 'Cort CC-100' }), 'Case & tas Gitar Akustik Cort CC-100', 'tanpa tipe: kata kategori tetap dipakai');
    assert.equal(j({ jenis: 'Kabel', tipe: 'Jack 6.5mm Mono', nama: 'Beyer ISO100LU3', ukuran: '3 Meter' }), 'Kabel Jack 6.5mm Mono Beyer ISO100LU3 3 Meter');
    assert.equal(j({ jenis: 'Tuner', tipe: 'Clip-on', nama: 'Snark SN-5X' }), 'Tuner Clip-on Snark SN-5X');
    assert.equal(j({ jenis: 'Senar', alat: ['Gitar Akustik'], nama: 'Orphee SA38', ukuran: '011' }), 'Senar Gitar Akustik Orphee SA38 Ukuran 011');
    assert.equal(j({ jenis: 'Capo', nama: 'Kyser' }), 'Kyser', 'tanpa data baru: nama saja, seperti sebelumnya');
});
