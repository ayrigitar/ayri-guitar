'use strict';
/* Logo toko di struk printer thermal: gambar 1-bit 384 titik (58 mm) dikirim sebagai baris pertama, hanya ke aplikasi 1.5.0 ke atas. */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

test('logo struk: gerbang versi aplikasi, ukuran kertas 58 mm, cadangan cetak browser', () => {
    const kode = baca('admin.js'), css = baca('layanan.css');
    assert.match(kode, /var LEBAR_STRUK = 384, TINGGI_LOGO = 144;/);
    assert.ok(kode.includes('return !!m && (+m[1] > 1 || (+m[1] === 1 && +m[2] >= 5));'), 'hanya AYRI POS 1.5.0 ke atas');
    assert.match(kode, /if \(!bisaLogoStruk\(\)\) return kirimKeAplikasi\('cetakStruk', \{ baris: baris \}\);/, 'aplikasi lama: struk teks seperti sebelumnya');
    assert.match(kode, /kirimKeAplikasi\('cetakStruk', \{ baris: \(logo \? \[logo\] : \[\]\)\.concat\(baris\) \}\)/, 'logo gagal dibuat: struk tetap tercetak');
    assert.match(kode, /ok\(\{ img: btoa\(bin\), w: W, h: h \}\)/);
    assert.match(kode, /<div class="c struk-logo"><img src="logo\/ayri-logo\.svg"/, 'cetak lewat browser juga berlogo');
    assert.match(css, /body\.cetak-struk \.struk-pre \.struk-logo img/);
});
