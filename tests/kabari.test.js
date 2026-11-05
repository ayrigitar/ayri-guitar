'use strict';
/* Satu tombol "Kabari" di form servis: judul dan isi pesan mengikuti status; kolom form tidak ikut melar. */
const test = require('node:test'), assert = require('node:assert/strict');
const { baca } = require('./helper');

test('tombol Kabari servis: satu tombol, isi pesan sesuai status, dirakit ulang saat status berganti', () => {
    const adm = baca('admin.js'), lay = baca('layanan.js'), css = baca('layanan.css');
    assert.match(lay, /L\.kabarServis = function \(s\)/);
    for (const st of ['menunggu_dp', 'selesai', 'diambil']) assert.ok(lay.includes("st === '" + st + "') return { judul"), 'pesan khusus ' + st);
    assert.match(lay, /pesan: L\.pesanTindak\.servisTerimaKasih\(s\)/, 'Sudah diambil = terima kasih + ulasan');
    assert.match(lay, /pesan: L\.pesan\.update\(s\)/, 'antri / dikerjakan / batal = update status');
    const wa = adm.slice(adm.indexOf('function waServis'), adm.indexOf('function gambarServis'));
    assert.match(wa, /\['kabar', k\.judul, k\.ket\]/);
    assert.ok(!wa.includes("['update'") && !wa.includes("['selesai'"), 'tombol Update status & Kabari selesai sudah digabung');
    assert.match(adm, /var wa = \$\('#sv-wa'\); if \(wa\) wa\.innerHTML = waServis\(\);/, 'label ikut berubah saat status diganti');
    assert.match(adm, /jenis === 'kabar' \? L\.kabarServis\(ed\.s\)\.pesan/);
    assert.match(css, /\.ly-f label, \.ly-lbl \{ display: grid; align-content: start;/, 'kotak isian tidak melar mengikuti kolom sebelahnya');
});


test('desain halaman edit mengikuti referensi: gaya khusus body.ly-detail, Pelanggan 2 kolom, Catatan internal di kartu Status, Aksi lainnya kartu sendiri', () => {
    const adm = baca('admin.js'), css = baca('layanan.css');
    assert.match(adm, /ly-grid ly-grid--2"><legend>Pelanggan<\/legend>/);
    assert.match(adm, /bantu\('tip-hp'\)/, 'keterangan HP jadi ikon (i), kolom tidak melar');
    assert.match(adm, /<h3 class="ly-judul2">Catatan internal<\/h3><textarea class="ly-in" data-f="catatan_admin"/);
    assert.equal((adm.match(/<\/fieldset><fieldset class="ly-card"><legend>Aksi lainnya<\/legend>/g) || []).length, 3, 'servis, tebus, titip jual');
    assert.ok(!/ly-pilb/.test(adm + css), 'label Jasa/Part teks biasa seperti referensi');
    assert.match(css, /body\.ly-detail \.ly-dua__kanan > \.ly-save \.ly-dirty \{\s*position: absolute;/, 'Belum disimpan: label kecil di pojok tombol, tidak gepeng');
    assert.match(css, /body\.ly-detail \.ly-dua \{ grid-template-columns: minmax\(0, 65fr\) minmax\(300px, 35fr\)/);
});
