'use strict';
/* Filter bertingkat (kategori → jenis → tipe + merek) dan urutan, dipakai daftar stok POS dan katalog publik. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { baca } = require('./helper');

const U = (() => { const sb = { console }; sb.window = sb; vm.createContext(sb); vm.runInContext(baca('util.js'), sb); return sb.AYRI_UTIL; })();
const aks = (jenis, nama, o) => Object.assign({ kategori: 'aksesoris', jenis, nama, merek: nama.split(' ')[0] }, o || {});
const DAFTAR = [
    aks('Senar', 'Orphee SA38', { alat: ['Gitar Akustik'] }), aks('Senar', 'Orphee SC55', { alat: ['Gitar Klasik'] }), aks('Senar', 'Orphee SC57', { alat: ['Gitar Klasik'] }),
    aks('Senar', 'Orphee QA140', { warna: 'Gitar Akustik Ukuran 009' }), aks('Senar', 'Elixir 12', { alat: ['Gitar Akustik', 'Gitar Klasik'] }),
    aks('Kabel', 'Beyer ISO100LU3', { tipe: 'Jack 6.5mm Mono' }), aks('Kabel', 'Beyer ISO100LU5', { tipe: 'Jack 6.5mm Mono' }), aks('Kabel', 'Taffware XLR3', { tipe: 'XLR' }),
    aks('Capo', 'JOYO JCP-03'),
    { kategori: 'gitar', jenis: 'Bass', nama: 'Fender Aerodyne Jazz Bass' }, { kategori: 'gitar', jenis: 'Akustik', nama: 'Yamaha F310' }
];
/* hasil dari sandbox VM: dibandingkan lewat JSON agar tidak terkena beda realm */
const eq = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const kosong = () => ({ jenis: '', tipe: '', merek: '' });

test('tipe senar = alat musik; bila belum diisi dibaca dari tulisan di Warna', () => {
    eq(U.faset(DAFTAR[0]).tipe, ['Gitar Akustik']);
    eq(U.faset(DAFTAR[3]).tipe, ['Gitar Akustik'], 'QA140 belum diisi alatnya: dibaca dari "Gitar Akustik Ukuran 009"');
    eq(U.faset(DAFTAR[4]).tipe, ['Gitar Akustik', 'Gitar Klasik']);
    eq(U.faset(DAFTAR[5]).tipe, ['Jack 6.5mm Mono'], 'tipe kabel = kepala kabel');
    eq(U.faset(DAFTAR[8]).tipe, [], 'capo tanpa tipe');
});

test('merek: isian Merek; gitar memakai kata pertama nama', () => {
    assert.equal(U.faset(DAFTAR[0]).merek, 'Orphee');
    assert.equal(U.faset(DAFTAR[9]).merek, 'Fender');
    assert.equal(U.faset(DAFTAR[10]).merek, 'Yamaha');
});

test('pilihan jenis, tipe, merek mengikuti saringan di atasnya, dengan jumlah', () => {
    const urut = { jenis: ['Senar', 'Kabel'], tipe: ['Gitar Akustik', 'Gitar Klasik'] };
    let o = U.opsiFaset(DAFTAR, kosong(), urut);
    eq(o.jenis.slice(0, 2), [['Senar', 5], ['Kabel', 3]]);
    eq(o.tipe, [], 'tipe baru muncul setelah jenis dipilih');
    o = U.opsiFaset(DAFTAR, { jenis: 'Senar', tipe: '', merek: '' }, urut);
    eq(o.tipe, [['Gitar Akustik', 3], ['Gitar Klasik', 3]], 'urutan tipe mengikuti daftar alat; senar dua alat dihitung di keduanya');
    assert.equal(o.jumlahJenis, 5);
    eq(o.merek, [['Orphee', 4], ['Elixir', 1]]);
    o = U.opsiFaset(DAFTAR, { jenis: 'Senar', tipe: 'Gitar Klasik', merek: '' }, urut);
    eq(o.merek, [['Orphee', 2], ['Elixir', 1]]);
    o = U.opsiFaset(DAFTAR, { jenis: 'Capo', tipe: '', merek: '' }, urut);
    eq([o.tipe, o.merek], [[], []], 'kurang dari 2 pilihan: tidak ditampilkan');
});

test('cocokFaset menyaring berlapis dan merek tidak peka huruf besar/kecil', () => {
    const hasil = (p) => DAFTAR.filter((x) => U.cocokFaset(x, Object.assign(kosong(), p))).map((x) => x.nama);
    eq(hasil({ jenis: 'Senar', tipe: 'Gitar Klasik' }), ['Orphee SC55', 'Orphee SC57', 'Elixir 12']);
    eq(hasil({ jenis: 'Senar', tipe: 'Gitar Klasik', merek: 'orphee' }), ['Orphee SC55', 'Orphee SC57']);
    eq(hasil({ merek: 'Beyer' }), ['Beyer ISO100LU3', 'Beyer ISO100LU5']);
    assert.equal(hasil({}).length, DAFTAR.length);
});

test('rapikanFaset membuang pilihan yang sudah tidak ada dan menyamakan huruf (untuk tautan tulisan tangan)', () => {
    const p = U.rapikanFaset(DAFTAR, { jenis: 'senar', tipe: 'gitar klasik', merek: 'ORPHEE' });
    eq(p, { jenis: 'Senar', tipe: 'Gitar Klasik', merek: 'Orphee' });
    eq(U.rapikanFaset(DAFTAR, { jenis: 'Kabel', tipe: 'Gitar Klasik', merek: 'Orphee' }), { jenis: 'Kabel', tipe: '', merek: '' });
    eq(U.rapikanFaset(DAFTAR, { jenis: 'Tidak ada', tipe: 'x', merek: 'y' }), kosong());
});

test('kode katalog dan POS memakai penyaring bersama, urutan, tautan filter, dan ingatan pilihan', () => {
    const kat = baca('katalog.html'), adm = baca('admin.js');
    assert.match(kat, /AYRI_UTIL\.opsiFaset\(d, p, URUTAN\)/);
    assert.match(kat, /AYRI_UTIL\.cocokFaset\(x, pilih\(\)\)/);
    assert.match(kat, /id="kat-tipe"/);
    assert.match(kat, /id="kat-merek"/);
    assert.match(kat, /URLSearchParams\(location\.search\)/, 'pilihan filter dibaca dari alamat');
    assert.match(kat, /history\.replaceState/, 'pilihan filter ditulis ke alamat');
    assert.match(kat, /value="nama"/);
    assert.match(adm, /AYRI_UTIL\.opsiFaset\(ciri, pilihSk, urutan\)/);
    assert.match(adm, /AYRI_UTIL\.cocokFaset\(ciri\[i\], pilihSk\)/);
    assert.match(adm, /localStorage\.setItem\(KUNCI_SK/, 'pilihan POS diingat di perangkat');
    ['baru', 'lama', 'nama', 'murah', 'mahal', 'sedikit'].forEach((k) => assert.match(adm, new RegExp("\\['" + k + "', '")));
    ['menipis', 'tanpaFoto', 'belumLengkap'].forEach((k) => assert.match(adm, new RegExp("\\['" + k + "', '")));
});
