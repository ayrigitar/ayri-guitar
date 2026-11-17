'use strict';
/* Tanggal selesai servis bisa dikoreksi pemilik (servis ulang): gratis titip dan garansi mulai lagi dari tanggal itu, ada catatan, dan ada pesan WA untuk pelanggan. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, baca } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub(), {});
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { L: d.L };
}
const servis = (ekstra) => Object.assign({
    id: 's1', kode: 'AYR-0001', nama: 'Budi', hp: '081200000001', gitar_jenis: 'Akustik', gitar_merk: 'Yamaha F310', status: 'selesai',
    tgl_masuk: '2026-10-20', tgl_selesai: '2026-11-05', items: [], bayar: [], pengingat: ['2026-11-05']
}, ekstra || {});

test('gratis titip dan garansi dihitung dari tanggal selesai: tanggal baru memulai hitungan 14 hari penuh lagi', async () => {
    const { L } = await mulai();
    let t = L.titip(servis(), '2026-11-17');
    assert.equal(t.lama, 12); assert.equal(t.batasGratis, '2026-11-19'); assert.equal(t.sisaGratis, 2);
    t = L.titip(servis({ tgl_selesai: '2026-11-13' }), '2026-11-17');
    assert.equal(t.lama, 4); assert.equal(t.batasGratis, '2026-11-27'); assert.equal(t.sisaGratis, 10); assert.equal(t.hariBiaya, 0);
    assert.equal(t.batasGaransi, '2026-12-13', 'garansi 30 hari ikut tanggal selesai yang baru');
    assert.equal(t.garansiHangus, false);
});

test('yang sudah kena biaya titip dihitung ulang dari tanggal baru', async () => {
    const { L } = await mulai();
    const lama = L.titip(servis({ tgl_selesai: '2026-10-01' }), '2026-11-17');
    assert.ok(lama.hariBiaya > 0);
    const baru = L.titip(servis({ tgl_selesai: '2026-11-13' }), '2026-11-17');
    assert.equal(baru.hariBiaya, 0); assert.equal(baru.biaya, 0);
});

test('pesan WA tanggal baru: menyebut tanggal selesai, batas gratis titip dan batas garansi yang baru', async () => {
    const { L } = await mulai();
    const s = servis({ tgl_selesai: '2026-11-13' });
    const m = L.pesan.tglBaru(s);
    assert.match(m, /Halo Kak Budi/);
    assert.ok(m.includes('selesai pada *' + L.tgl('2026-11-13') + '*'), m);
    assert.ok(m.includes('Gratis dititipkan sampai *' + L.tgl('2026-11-27') + '*'), m);
    assert.ok(m.includes(L.tgl('2026-12-13')), 'batas garansi');
    assert.match(m, /tidak berlaku lagi/);
    assert.ok(!m.includes(L.tgl('2026-11-19')), 'tanggal lama tidak disebut');
});

test('admin: kolom Tanggal selesai hanya untuk pemilik, dibatasi, dicatat, dan ada tombol kabar WA', () => {
    const js = baca('admin.js');
    assert.match(js, /!ed\.baru && owner\(\) && L\.beres\(s\) && s\.tgl_selesai \?/, 'kolom hanya pemilik, servis yang sudah selesai');
    assert.match(js, /data-f="tgl_selesai"/);
    assert.match(js, /tsEl\.max = L\.hariIni\(\)/, 'tidak boleh lewat hari ini');
    assert.match(js, /Tanggal selesai tidak boleh lebih dari hari ini/); assert.match(js, /Tanggal selesai tidak boleh sebelum tanggal masuk/);
    assert.match(js, /Tanggal selesai tidak boleh sesudah tanggal diambil/); assert.match(js, /Tanggal selesai belum diisi/);
    assert.match(js, /if \(!owner\(\)\) rec\.tgl_selesai = tersimpan\.tgl_selesai;/, 'bukan pemilik: tanggal tidak berubah');
    assert.match(js, /Tanggal selesai diubah dari/, 'catatan internal');
    assert.match(js, /\['tglBaru', 'Kabari tanggal baru'/);
});
