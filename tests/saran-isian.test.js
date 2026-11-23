'use strict';
/* Saran isian (Merek, Model, Seri, Fitur, nama jasa di kasir, nama di kas, penulis artikel): ditampilkan DI BAWAH kolom sebagai tombol kecil.
   Daftar bawaan browser (atribut list=) tidak dipakai lagi: di HP daftar itu bisa menutupi kolom yang sedang diketik (dilaporkan pemilik). */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

const js = baca('admin.js'), css = baca('layanan.css');

test('tidak ada kolom yang memakai daftar bawaan browser (list=); semua kolom bersaran memakai data-saran dengan datalist sebagai sumber', () => {
    assert.doesNotMatch(js, /<input[^>]*\slist="/, 'tidak ada input list=');
    const ids = [...js.matchAll(/data-saran="([a-z-]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, 10, 'merek, model (2), seri, fitur, nama jasa kasir, kas (3), penulis artikel');
    for (const id of new Set(ids)) assert.match(js, new RegExp('<datalist id="' + id + '"'), 'sumber saran ' + id);
    assert.deepEqual([...new Set(ids)].sort(), ['ar-penulis', 'dl-fitur', 'dl-merek', 'dl-model', 'dl-seri', 'kas-nama', 'kj-saran']);
});

test('komponen saran: tombol dipasang di bawah kolom (di dalam label), disaring menurut ketikan, memilih mengisi kolom + memicu input/change, lalu menutup', () => {
    const f = js.slice(js.indexOf('function saranTampil(inp)'), js.indexOf('document.addEventListener(\'click\', function (e) {\n        var b = e.target.closest && e.target.closest(\'[data-saran-isi]\')') + 500);
    assert.match(f, /v\.toLowerCase\(\)\.indexOf\(q\) > -1/, 'disaring menurut ketikan (mengandung, tanpa beda huruf besar)');
    assert.match(f, /v\.toLowerCase\(\) !== q/, 'yang sama persis dengan isi kolom tidak ditawarkan lagi');
    assert.match(f, /\.slice\(0, 8\)/, 'paling banyak 8 tombol');
    assert.match(f, /if \(lbl\) lbl\.appendChild\(el\); else \(inp\.closest\('\.ly-row2'\) \|\| inp\)\.after\(el\);/, 'di bawah kolom, bukan melayang');
    assert.match(f, /window\.scrollBy\(0, geser\)/, 'daftar dan kolom digulir ke atas keyboard/tombol Simpan');
    assert.match(f, /inp\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\); inp\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\);\s*saranTutup\(\); inp\.focus\(\);/, 'memilih = mengetik: formulir tahu ada perubahan');
    assert.match(f, /saranTahan = true;[^]*saranTahan = false;/, 'tidak langsung terbuka lagi setelah memilih');
    assert.match(js, /document\.addEventListener\('focusin'/); assert.match(js, /document\.addEventListener\('focusout'/);
});

test('gaya: tombol saran berbentuk pil kecil yang membungkus ke baris berikutnya', () => {
    assert.match(css, /\.ly-saran \{ display: flex; flex-wrap: wrap;/);
    assert.match(css, /\.ly-saran__i \{ min-height: 36px;/);
});
