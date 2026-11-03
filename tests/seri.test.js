'use strict';
/* Seri/varian: barang aksesoris dengan Seri yang sama (>= 2 tersedia) digabung jadi satu halaman seri; varian menunjuk ke halaman seri; bubar saat tinggal satu. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, baca } = require('./helper');

async function mulai() { const gh = siapkanRepo(bikinGitHub()), d = bikinPerangkat(gh); await d.masuk(); return { gh, A: d.A, L: d.L }; }
const util = (() => { const sb = { console }; sb.window = sb; vm.createContext(sb); vm.runInContext(baca('util.js'), sb); return sb.AYRI_UTIL; })();
const senar = (o) => stokContoh(null, 1, Object.assign({ id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', kondisi: 'baru', sub: 'Senar', merek: 'Orphee', gitar_merk: '', seri: 'QA Series', alat: ['Gitar Akustik'], jumlah: 3 }, o));

test('judul seri, label dan urutan varian', () => {
    const m = [{ jenis: 'Senar', merek: 'Orphee', seri: 'QA Series', alat: ['Gitar Akustik'], ukuran: '012', harga: 1 }, { jenis: 'Senar', merek: 'Orphee', seri: 'QA Series', alat: ['Gitar Akustik'], ukuran: '010', harga: 1 }];
    assert.equal(util.judulSeri(m, [], {}), 'Senar Gitar Akustik Orphee QA Series');
    assert.equal(util.judulSeri([{ jenis: 'Kabel', merek: 'Beyer', seri: 'Beyer ISO100LU', tipe: 'Jack 6.5mm Mono' }], [], {}), 'Kabel Jack 6.5mm Mono Beyer ISO100LU', 'merek tidak digandakan bila sudah di nama seri');
    assert.deepEqual(m.slice().sort(util.urutVarian).map(util.labelVarian), ['010', '012']);
    const kabel = [{ ukuran: '10 Meter' }, { ukuran: '3 Meter' }, { ukuran: '5 Meter' }];
    assert.deepEqual(kabel.slice().sort(util.urutVarian).map(util.labelVarian), ['3 Meter', '5 Meter', '10 Meter'], 'urut menurut angka, bukan huruf');
});

test('seri: dua varian digabung (halaman seri, canonical, peta situs); satu varian tidak; bubar saat tinggal satu', async () => {
    const { gh, A, L } = await mulai();
    const a = await A.simpanStok(senar({ nama: 'QA140', ukuran: '010', harga_jual: 90000 }), []);
    assert.ok(!('grup' in gh.json('ayri-guitar', 'data/katalog.json').item[0]), 'satu barang: tidak digabung');
    assert.equal(gh.isi('ayri-guitar', 'unit/seri-senar-qa-series.html'), null);
    const b = await A.simpanStok(senar({ nama: 'QA150', ukuran: '011', harga_jual: 95000 }), []);
    const lain = await A.simpanStok(senar({ nama: 'SA38', seri: '', ukuran: '011', harga_jual: 100000 }), []);
    const kat = gh.json('ayri-guitar', 'data/katalog.json').item;
    const grup = kat.filter((x) => x.grup).map((x) => x.kode).sort();
    assert.deepEqual(grup, [a.kode, b.kode].sort(), 'hanya yang satu seri'); assert.ok(!kat.filter((x) => x.kode === lain.kode)[0].grup);
    const seri = gh.isi('ayri-guitar', 'unit/seri-qa-series-senar.html') || gh.isi('ayri-guitar', 'unit/seri-' + kat.filter((x) => x.grup)[0].grup + '.html');
    assert.ok(seri, 'halaman seri dibuat');
    assert.ok(seri.includes('<h1>Senar Gitar Akustik Orphee QA Series</h1>') && seri.includes('<small>mulai</small> Rp90.000'), 'judul seri dan harga mulai');
    assert.ok(seri.includes('>010</span>') && seri.includes('>011</span>') && seri.includes('Rp95.000') && seri.indexOf('>010<') < seri.indexOf('>011<'), 'varian urut dengan harga masing-masing');
    assert.ok(seri.includes('"@type":"ProductGroup"') && seri.includes('"hasVariant"'), 'data produk ProductGroup untuk Google');
    assert.ok(seri.includes('href="' + a.kode + '.html"') && seri.includes('wa.me/'), 'tautan ke tiap varian + WhatsApp');
    const halA = gh.isi('ayri-guitar', 'unit/' + a.kode + '.html');
    assert.ok(halA.includes('rel="canonical" href="' + L.urlSeri(kat.filter((x) => x.grup)[0].grup) + '"'), 'varian menunjuk ke halaman seri (canonical)');
    assert.ok(halA.includes('Lihat semua pilihan QA Series'), 'varian menautkan balik ke seri');
    const peta = gh.isi('ayri-guitar', 'sitemap-unit.xml');
    assert.ok(peta.includes('seri-') && !peta.includes('/' + a.kode + '.html') && !peta.includes('/' + b.kode + '.html') && peta.includes('/' + lain.kode + '.html'), 'peta situs: seri menggantikan variannya');
    /* satu varian terjual/ditarik: seri bubar, halaman seri dihapus, varian tersisa kembali berdiri sendiri */
    await A.simpanStok(Object.assign({}, b, { tampil: false }), []);
    const sisa = gh.json('ayri-guitar', 'data/katalog.json').item.filter((x) => x.kode === a.kode)[0];
    assert.ok(!sisa.grup, 'tinggal satu: tidak lagi digabung');
    assert.equal(gh.daftarFile('ayri-guitar').filter((p) => /^unit\/seri-/.test(p)).length, 0, 'halaman seri dihapus');
    assert.ok(gh.isi('ayri-guitar', 'unit/' + a.kode + '.html').includes('rel="canonical" href="' + L.urlUnit(a.kode) + '"'), 'canonical kembali ke dirinya sendiri');
});

test('antarmuka: isian Seri dengan saran, katalog menggabung kartu, skrip halaman seri', () => {
    const admin = baca('admin.js'), katalog = baca('katalog.html'), statis = baca('unit-statis.js');
    assert.match(admin, /list="dl-seri"/); assert.match(admin, /saranDariStok\(function \(x\) \{ return x\.seri; \}\)/);
    assert.match(katalog, /function kartuSeri\(g\)/); assert.match(katalog, /unit\/seri-/); assert.match(katalog, /<small>mulai<\/small>/);
    assert.match(statis, /\^seri-/, 'skrip mengenali halaman seri');
});

test('poster seri: anggota seri dari stok, tombol di daftar & form, bagikan', async () => {
    const { L } = await mulai();
    const mk = (id, ukuran, harga, ekstra) => Object.assign({ id, kode: 'STK-' + id, kategori: 'aksesoris', sub: 'Senar', nama: 'Orphee QA', merek: 'Orphee', seri: 'QA Series', ukuran, alat: ['Gitar Akustik'], harga_jual: harga, status: 'tersedia', jumlah: 3, foto: [] }, ekstra || {});
    const a = mk('a', '011', 95000), b = mk('b', '010', 90000), laku = mk('c', '012', 100000, { status: 'terjual', jumlah: 0 }), lain = mk('d', '010', 50000, { seri: 'Seri Lain' });
    const m = L.anggotaSeri(a, [a, b, laku, lain]);
    assert.deepEqual(Array.from(m).map((x) => x.id), ['b', 'a'], 'urut varian; yang terjual dan seri lain tidak ikut');
    assert.equal(L.judulSeriStok(m), 'Senar Gitar Akustik Orphee QA Series');
    assert.equal(L.labelVarianStok(b), '010');
    assert.equal(L.grupSeri({ kategori: 'gitar', seri: 'x' }), '', 'gitar tidak berseri');
    const js = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin.js'), 'utf8');
    for (const s of ["id: 'sk-seri'", "tombolIkon('seri'", 'function buatPosterSeri', 'function bagikanSeri', 'opsi.seri']) assert.ok(js.includes(s), s);
});
