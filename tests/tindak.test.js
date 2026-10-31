'use strict';
/* Tindak lanjut pelanggan: ucapan terima kasih + minta ulasan, garansi servis hampir habis, dan kartu rekap baru (stok mengendap, jasa terbanyak). */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, baca } = require('./helper');

const L = bikinPerangkat(siapkanRepo(bikinGitHub())).L;
const tindakServis = (...a) => Array.from(L.tindakServis(...a)), tindakJual = (...a) => Array.from(L.tindakJual(...a)); /* array dari sandbox: samakan jenisnya untuk deepEqual */
const servis = (o) => Object.assign({ id: 's1', kode: 'AYR-AAAAAA', nama: 'Budi', hp: '081234567890', gitar_jenis: 'Akustik', gitar_merk: 'Yamaha F310', status: 'diambil', tgl_diambil: '2026-10-01', items: [{ jenis: 'jasa', nama: 'Full Setup (Akustik)', harga: 350000, qty: 1, garansi: '1b' }] }, o);

test('servis diambil: terima kasih muncul hari ke-2 sampai ke-14, hilang setelah dikirim', () => {
    assert.deepEqual(tindakServis(servis(), '2026-10-02'), [], 'hari ke-1 belum');
    assert.deepEqual(tindakServis(servis(), '2026-10-03'), ['terima_kasih']);
    assert.deepEqual(tindakServis(servis(), '2026-10-15'), ['terima_kasih']);
    assert.deepEqual(tindakServis(servis(), '2026-10-16'), [], 'lewat 14 hari: tidak diingatkan lagi');
    assert.deepEqual(tindakServis(servis({ tindak: { terima_kasih: '2026-10-03' } }), '2026-10-04'), [], 'sudah dikirim');
});

test('garansi servis: diingatkan 7 hari sebelum berakhir, tidak setelah lewat atau setelah dikirim', () => {
    const s = servis(); /* garansi 1 bulan sejak 1 Okt = 1 Nov */
    assert.equal(L.garansiServis(s).akhir, '2026-11-01');
    assert.deepEqual(tindakServis(s, '2026-10-24'), [], '8 hari lagi: belum');
    assert.ok(tindakServis(s, '2026-10-25').indexOf('garansi') > -1, '7 hari lagi');
    assert.ok(tindakServis(s, '2026-11-01').indexOf('garansi') > -1, 'hari terakhir');
    assert.ok(tindakServis(s, '2026-11-02').indexOf('garansi') < 0, 'sudah lewat');
    assert.ok(tindakServis(servis({ tindak: { garansi: '2026-10-26' } }), '2026-10-27').indexOf('garansi') < 0, 'sudah dikirim');
    assert.equal(L.garansiServis(servis({ items: [{ jenis: 'jasa', nama: 'Cek', harga: 1, qty: 1 }] })), null, 'tanpa garansi: tidak ada');
});

test('tanpa HP atau belum diambil: tidak ada tindak lanjut', () => {
    assert.deepEqual(tindakServis(servis({ hp: '' }), '2026-10-05'), []);
    assert.deepEqual(tindakServis(servis({ status: 'selesai', tgl_diambil: null }), '2026-10-05'), []);
});

test('jual barang: terima kasih hanya setelah selesai/diserahkan, bukan DP atau batal', () => {
    const j = { id: 'j1', nama: 'Sari', hp: '081211112222', status: 'selesai', tgl_selesai: '2026-10-10', items: [{ nama: 'Bass Yamaha RBX 100', qty: 1 }] };
    assert.deepEqual(tindakJual(j, '2026-10-11'), []);
    assert.deepEqual(tindakJual(j, '2026-10-12'), ['terima_kasih']);
    assert.deepEqual(tindakJual(Object.assign({}, j, { status: 'dp' }), '2026-10-12'), []);
    assert.deepEqual(tindakJual(Object.assign({}, j, { status: 'batal' }), '2026-10-12'), []);
    assert.deepEqual(tindakJual(Object.assign({}, j, { hp: '' }), '2026-10-12'), [], 'pembeli umum tanpa HP');
    assert.deepEqual(tindakJual(Object.assign({}, j, { tindak: { terima_kasih: '2026-10-12' } }), '2026-10-13'), []);
});

test('pesan: nama, garansi, tanpa data pembayaran; tautan ulasan hanya bila diisi', () => {
    const s = servis();
    const m = L.pesanTindak.servisTerimaKasih(s);
    assert.match(m, /Halo Kak Budi/); assert.match(m, /Garansi servis berlaku sampai/); assert.ok(!/Rp\d/.test(m), 'tanpa harga');
    assert.ok(!/ulasan di Google/.test(m), 'tanpa tautan ulasan saat belum diisi');
    const g = L.pesanTindak.servisGaransi(s);
    assert.match(g, /garansi servis gitar/); assert.match(g, /\*1 November 2026\*|\*1 Nov 2026\*/);
    assert.match(L.pesanTindak.jualTerimaKasih({ nama: 'Sari', items: [{ nama: 'Bass', qty: 1 }] }), /terima kasih sudah membeli Bass/);
    L.C.toko.ulasan = 'https://g.page/r/contoh/review';
    try { assert.match(L.pesanTindak.servisTerimaKasih(s), /ulasan di Google[\s\S]*https:\/\/g\.page\/r\/contoh\/review/); } finally { L.C.toko.ulasan = ''; }
});

test('halaman Hari ini dan Rekap: kelompok Hubungi pelanggan, catat setelah WA dibuka, kartu stok mengendap dan jasa terbanyak', () => {
    const kode = baca('admin.js');
    assert.match(kode, /g: 'Hubungi pelanggan', u: 3, tl: \['servis', s\.id, jn\]/);
    assert.match(kode, /g: 'Hubungi pelanggan', u: 3, tl: \['jual', j\.id, jn\]/);
    const catat = kode.slice(kode.indexOf('function catatTindak'), kode.indexOf('/* ================= token & PIN'));
    assert.ok(catat.indexOf('bukaWa(x.hp, pesan)') > -1 && catat.indexOf('bukaWa(x.hp, pesan)') < catat.indexOf('rec.tindak'), 'WA dibuka dulu dari ketukan, baru dicatat');
    assert.match(catat, /A\.simpanServis : A\.simpanJual/);
    assert.match(kode, /<h2>Stok mengendap \(lebih dari 90 hari\)<\/h2>/); assert.match(kode, /<h2>Jasa servis terbanyak bulan ini<\/h2>/);
    const rekap = kode.slice(kode.indexOf('function rekap()'), kode.indexOf('/* ================= daftar servis'));
    assert.ok(rekap.indexOf('Stok mengendap') < rekap.indexOf('Barang terlaris'));
});
