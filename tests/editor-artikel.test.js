'use strict';
/* Editor artikel: tombol format, hitungan kata, pratinjau berdampingan, cadangan draf di perangkat. */
const test = require('node:test'), assert = require('node:assert/strict');
const vm = require('node:vm');
const { baca } = require('./helper');

function md() {
    const sb = { AYRI_UTIL: { esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;') } };
    vm.createContext(sb); vm.runInContext(baca('artikel-md.js'), sb);
    return sb.ArtikelMd;
}
function terap(M, teks, a, b, jenis) {
    const h = M.format(teks, a, b, jenis), baru = teks.slice(0, h.dari) + h.sisip + teks.slice(h.sampai);
    return { teks: baru, pilih: baru.slice(h.pilihA, h.pilihB) };
}

test('format tebal/miring: membungkus pilihan, melepas bila sudah bertanda, spasi tepi di luar tanda', () => {
    const M = md();
    assert.deepEqual(terap(M, 'halo dunia', 5, 10, 'tebal'), { teks: 'halo **dunia**', pilih: 'dunia' });
    assert.deepEqual(terap(M, 'halo **dunia**', 7, 12, 'tebal'), { teks: 'halo dunia', pilih: 'dunia' });
    assert.deepEqual(terap(M, 'halo **dunia**', 5, 14, 'tebal'), { teks: 'halo dunia', pilih: 'dunia' });
    assert.deepEqual(terap(M, 'halo ', 5, 5, 'tebal'), { teks: 'halo **teks tebal**', pilih: 'teks tebal' });
    assert.deepEqual(terap(M, 'halo dunia ', 5, 11, 'miring'), { teks: 'halo _dunia_ ', pilih: 'dunia' });
    assert.match(M.keHtml(terap(M, 'halo dunia ', 5, 11, 'miring').teks), /<em>dunia<\/em>/, 'hasil tombol miring benar-benar tampil miring');
});

test('format per baris: poin, nomor, judul, sub-judul, kutipan; tekan lagi = dilepas', () => {
    const M = md();
    assert.equal(terap(M, 'a\nb\nc', 0, 5, 'poin').teks, '- a\n- b\n- c');
    assert.equal(terap(M, '- a\n- b', 0, 7, 'poin').teks, 'a\nb');
    assert.equal(terap(M, 'a\n\nb', 0, 4, 'nomor').teks, '1. a\n\n2. b');
    assert.equal(terap(M, '## x', 2, 2, 'sub').teks, '### x', 'judul jadi sub-judul, bukan ### ## x');
    assert.equal(terap(M, '### x', 2, 2, 'judul').teks, '## x');
    assert.equal(terap(M, '## x', 2, 2, 'judul').teks, 'x');
    assert.equal(terap(M, 'satu\ndua', 6, 6, 'kutip').teks, 'satu\n> dua', 'hanya baris yang ada kursornya');
    assert.equal(terap(M, '', 0, 0, 'judul').teks, '## ');
});

test('format tautan: teks jadi label, alamat jadi tujuan; hasilnya tampil sebagai link', () => {
    const M = md();
    assert.deepEqual(terap(M, 'lihat toko', 6, 10, 'tautan'), { teks: 'lihat [toko](https://)', pilih: 'https://' });
    assert.deepEqual(terap(M, 'lihat https://x.com', 6, 19, 'tautan'), { teks: 'lihat [teks tautan](https://x.com)', pilih: 'teks tautan' });
    assert.match(M.keHtml('[toko](https://ayrigitar.com)'), /<a href="https:\/\/ayrigitar\.com">toko<\/a>/);
});

test('hitung kata tanpa tanda format dan perkiraan menit baca', () => {
    const M = md();
    assert.deepEqual({ ...M.hitung('') }, { kata: 0, menit: 0 });
    assert.deepEqual({ ...M.hitung('## Judul\n- satu **dua** [tiga](https://x.com)') }, { kata: 4, menit: 1 });
    assert.equal(M.hitung(Array(600).fill('kata').join(' ')).menit, 3);
});

test('admin: bilah format, pratinjau berdampingan di PC, hitungan kata, cadangan draf yang jujur', () => {
    const kode = baca('admin.js'), css = baca('layanan.css');
    for (const j of ['tebal', 'miring', 'judul', 'sub', 'poin', 'nomor', 'kutip', 'tautan']) assert.ok(kode.includes("['" + j + "', "), 'tombol ' + j);
    assert.match(kode, /role="toolbar" aria-label="Format tulisan"/);
    assert.match(kode, /document\.execCommand\('insertText', false, h\.sisip\)/, 'Ctrl+Z tetap bisa membatalkan format');
    assert.match(kode, /ArtikelMd\.format\(ta\.value, ta\.selectionStart, ta\.selectionEnd, jenis\)/, 'pratinjau & situs memakai mesin format yang sama');
    assert.match(kode, /aturPratinjau\(ae\.pv == null \? layarLebar\(\) && prefPratinjau\(\) : ae\.pv\)/, 'PC: pratinjau terbuka otomatis, HP: tertutup');
    assert.match(css, /\.ar-tulis--dua \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/);
    assert.match(kode, /' kata · ±' \+ h\.menit \+ ' menit baca'/);
    /* cadangan draf: hanya di perangkat, dihapus setelah tersimpan ke server, ditawarkan saat dibuka lagi */
    assert.match(kode, /'✓ Draf aman di perangkat ini · '/, 'tidak mengaku "tersimpan otomatis" ke server');
    assert.ok(!/Tersimpan otomatis/.test(kode));
    assert.match(kode, /if \(v\) jadwalDraf\(\)/, 'setiap perubahan dicadangkan');
    assert.match(kode, /buangDraf\(ae\.baru \? null : row\.id\); buangDraf\(row\.id\);/, 'cadangan dibuang setelah tersimpan');
    assert.match(kode, /id="ar-pulihkan">Pulihkan tulisan</);
    assert.match(kode, /Artikel ini sudah diubah lagi sesudahnya/, 'peringatan bila artikel berubah di perangkat lain');
    assert.match(kode, /document\.addEventListener\('visibilitychange'/, 'dicadangkan saat aplikasi ditutup');
    for (const id of ['ar-prev', 'ar-ai', 'ar-pv', 'ar-simpan', 'ar-file']) assert.ok(kode.includes('id="' + id + '"'), id + ' tetap ada');
});

test('penulis artikel: tampil di halaman & data Google; kosong = atas nama toko', () => {
    const sb = { AYRI_UTIL: { esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') } };
    vm.createContext(sb); vm.runInContext(baca('artikel-md.js'), sb); vm.runInContext(baca('artikel-builder.js'), sb);
    const tpl = baca('scripts/artikel-template.html'), dasar = { judul: 'Setup Gitar', slug: 'setup-gitar', isi: 'x', foto: [] };
    const ld = h => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(h)[1].replace(/\u003c/g, '<'));
    const tanpa = sb.ArtikelBuilder.halaman(tpl, dasar, 'https://ayrigitar.com/');
    assert.match(tanpa, /#i-pen"\/><\/svg> Toko Gitar AYRI<\/span>/);
    assert.equal(ld(tanpa).author['@type'], 'Organization');
    const ada = sb.ArtikelBuilder.halaman(tpl, Object.assign({ penulis: '  Rio  <b>' }, dasar), 'https://ayrigitar.com/');
    assert.match(ada, /#i-pen"\/><\/svg> Rio &lt;b&gt; · Toko Gitar AYRI<\/span>/, 'nama di-escape, disertai nama toko');
    assert.deepEqual(ld(ada).author, { '@type': 'Person', name: 'Rio <b>', worksFor: { '@type': 'Organization', name: 'Toko Gitar AYRI', url: 'https://ayrigitar.com/' } });
    assert.equal(ld(ada).publisher.name, 'Toko Gitar AYRI');
    assert.doesNotMatch(tpl, /AYRI Gitar Bogor/);
    const kode = baca('admin.js');
    assert.match(kode, /<label>Penulis<input data-a="penulis" maxlength="60" list="ar-penulis"/);
    assert.match(kode, /function daftarPenulis\(\)/, 'nama yang pernah dipakai muncul sebagai pilihan');
});
