'use strict';
/* Poster servis untuk pemasaran: ikon bagikan di Antrian servis sesuai status, publik tanpa nama/HP/kode/harga, wajib izin pelanggan. */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

test('poster servis: ikon sesuai status, bersyarat izin dan foto, tanpa data pribadi di poster', () => {
    const adm = baca('admin.js');
    assert.match(adm, /function modePosterServis\(s\) \{ return s\.status === 'dikerjakan' \? 'proses' : \(s\.status === 'selesai' \|\| s\.status === 'diambil'\) \? 'hasil' : null; \}/, 'dikerjakan = proses; selesai/diambil = hasil; status lain tanpa poster');
    assert.match(adm, /if \(!s\.izin_publikasi\) return toast\('Pelanggan belum setuju/, 'wajib izin pelanggan');
    assert.match(adm, /if \(!fotoPosterServis\(s, mode\)\.length\) return toast\('Belum ada foto servis/);
    assert.match(adm, /\(tombolPosterServis\(s\) \? '<span class="ly-item__b">'/, 'ikon di tampilan Daftar');
    assert.match(adm, /tombolPosterServis\(s\) \? '<div class="kb-k__c">'/, 'ikon di tampilan Papan');
    assert.match(adm, /\[data-poster-sv\]/);
    /* isi poster: hanya merek/model gitar + nama jasa; tidak memakai nama, HP, kode, atau harga */
    const fn = adm.slice(adm.indexOf('function buatPosterServis'), adm.indexOf('function teksPosterServis'));
    assert.ok(fn.length > 400);
    assert.ok(!/s\.nama\b|s\.hp\b|s\.kode\b|harga|rupiah|\.bayar/.test(fn), 'poster tidak memuat nama, HP, kode, atau harga');
    assert.match(fn, /L\.namaGitar\(s, 'Gitar'\)/);
    const jasa = adm.slice(adm.indexOf('function jasaPoster'), adm.indexOf('function fotoPosterServis'));
    assert.match(jasa, /i\.jenis !== 'jasa'/, 'hanya jasa, bukan part');
    assert.match(jasa, /biaya penitipan/, 'biaya penitipan tidak ikut');
    assert.match(adm, /'servis-' \+ opsi\.servis\.mode/, 'nama berkas tanpa kode servis');
    assert.match(adm, /if \(opsi && opsi\.servis\) return buatPosterServis\(opsi\.servis\);/);
});
