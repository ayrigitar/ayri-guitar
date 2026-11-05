'use strict';
/* Poster servis untuk pemasaran: ikon bagikan di Antrian servis sesuai status, publik tanpa nama/HP/kode/harga, wajib izin pelanggan. */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

test('poster servis: ikon sesuai status, bersyarat izin dan foto, tanpa data pribadi di poster', () => {
    const adm = baca('admin.js');
    assert.match(adm, /function modePosterServis\(s\) \{ return s\.status === 'dikerjakan' \? 'proses' : \(s\.status === 'selesai' \|\| s\.status === 'diambil'\) \? 'hasil' : null; \}/, 'dikerjakan = proses; selesai/diambil = hasil; status lain tanpa poster');
    assert.match(adm, /if \(!s\.izin_publikasi\) return toast\('Pelanggan belum setuju/, 'wajib izin pelanggan');
    assert.match(adm, /if \(!fotoPosterServis\(s, mode\)\.length\) return toast\('Belum ada foto servis/);
    assert.match(adm, /\+ tombolPosterServis\(s\);\s+return kartuIkon\(/, 'ikon di tampilan Daftar (kartu servis)');
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

test('kartu servis (Daftar): baris berikon hanya bila relevan, tombol utama pengingat, warna menurut makna', () => {
    const adm = baca('admin.js'), css = baca('layanan.css');
    assert.match(adm, /function kartuServis\(s, hari\)/);
    assert.match(adm, /\$\('#list'\)\.innerHTML = hasil\.length \? hasil\.map\(function \(s\) \{ return kartuServis\(s, hari\); \}\)/);
    assert.match(adm, /'Sisa tagihan: <b>'/);
    assert.match(adm, /if \(s\.estimasi && !beres\) info \+= baris\(telat/, 'estimasi hanya bila belum beres');
    assert.match(adm, /if \(t\) \{\s+info \+= baris\(/, 'baris penitipan hanya untuk gitar selesai yang kena aturan titip');
    assert.match(adm, /\(t \? '<button type="button" class="ly-btn ' \+ \(perlu \? 'ly-btn--wa' : 'ly-btn--pri'\)/, 'tombol pengingat hanya bila ada penitipan');
    for (const n of ['tanggal', 'uang', 'jam', 'lonceng', 'amplop']) assert.ok(adm.includes('        ' + n + ": '<"), 'ikon ' + n);
    assert.match(css, /\.sv-k__info \.sv-bad[^{]*\{ color: #B42318; \}/);
    assert.match(css, /html\[data-theme="dark"\] \.sv-k__info \.sv-bad/, 'mode gelap');
});

test('kartu seragam: Jual, Tebus, Titip jual, Sewa, dan Stok memakai kartuIkon; Stok punya foto kecil dan tombol bagikan', () => {
    const adm = baca('admin.js'), css = baca('layanan.css');
    assert.match(adm, /function kartuIkon\(o\)/);
    for (const href of ['#jual/', '#tebus/', '#titip/', '#sewa/', '#stok/', '#servis/']) assert.ok(adm.includes("kartuIkon({ href: '" + href), 'kartuIkon dipakai untuk ' + href);
    assert.ok(!/class="ly-item"><a class="ly-item__a" href="#(jual|tebus|stok)\//.test(adm), 'kartu lama diganti');
    assert.match(adm, /foto: f \? \(f\.thumb_path \|\| f\.path\) : true/, 'Stok: foto kecil bila ada, kotak kosong bila belum');
    assert.match(adm, /'Harga jual belum diisi'/, 'peringatan harga jual kosong');
    assert.match(adm, />Hapus foto KTP</, 'tombol hapus KTP tetap ada di Tebus');
    assert.match(adm, /data-ingat="' \+ E\(t\.id\)/, 'pengingat Tebus tetap ada');
    assert.match(adm, /awas: '<path/, 'ikon peringatan');
    assert.match(css, /\.sv-foto \{ flex: none; width: 64px; height: 64px;/);
    assert.match(css, /\.sv-k__aksi \{[^}]*justify-content: flex-end/);
});
