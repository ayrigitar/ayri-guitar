'use strict';
/* Penulisan artikel: format teks -> HTML harus aman dari penyisipan HTML/skrip, dan pembuat halaman menolak alamat berbahaya. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { baca } = require('./helper');

function muat() {
    const sb = { console }; sb.window = sb; vm.createContext(sb);
    ['util.js', 'artikel-md.js', 'artikel-builder.js'].forEach((f) => vm.runInContext(baca(f), sb, { filename: f }));
    return { md: sb.ArtikelMd, B: sb.ArtikelBuilder };
}
const { md, B } = muat();

test('teks artikel: tag, skrip, dan atribut berbahaya tidak lolos', () => {
    assert.ok(!/<img/i.test(md.keHtml('**<img src=x onerror=alert(1)>**')));
    assert.ok(!/<script/i.test(md.keHtml('[klik](https://evil.example)\n\n<script>alert(1)</script>')));
    assert.ok(!/<svg/i.test(md.keHtml('## <svg onload=alert(1)>')));
    assert.ok(!/<b>/i.test(md.keHtml('_<b>x</b>_')));
    assert.ok(!/href="javascript/i.test(md.keHtml('[klik](javascript:alert(1))')), 'tautan javascript: tidak dibuat');
    const hasil = md.keHtml('[klik](https://a.com/"onmouseover="alert(1))');
    assert.ok(!/<a [^>]*[ "]onmouseover=/.test(hasil), 'kutip dalam alamat tidak boleh menutup atribut href: ' + hasil);
    assert.ok(!/<a [^>]*onclick=/.test(md.keHtml('[a](x.html" onclick="alert(1))')));
});

test('tautan ke situs lain dibuka di tab baru dengan noopener (termasuk //alamat tanpa http)', () => {
    assert.match(md.keHtml('[x](https://contoh.com)'), /target="_blank" rel="noopener"/);
    assert.match(md.keHtml('[x](//contoh.com/a)'), /target="_blank" rel="noopener"/);
    assert.doesNotMatch(md.keHtml('[x](https://ayrigitar.com/tuner.html)'), /target=/);
    assert.doesNotMatch(md.keHtml('[x](tuner.html)'), /target=/);
});

test('format dasar: judul, daftar, kutipan, tebal, miring, slug', () => {
    const h = md.keHtml('## Judul\n\nHalo **tebal** dan _miring_\n\n- satu\n- dua\n\n1. a\n2. b\n\n> catatan');
    for (const bagian of ['<h2>Judul</h2>', '<strong>tebal</strong>', '<em>miring</em>', '<ul><li>satu</li><li>dua</li></ul>', '<ol><li>a</li><li>b</li></ol>', '<blockquote><p>catatan</p></blockquote>']) assert.ok(h.includes(bagian), bagian);
    assert.equal(md.slug('Setup Gitar Akustik & Nut Baru!'), 'setup-gitar-akustik-dan-nut-baru');
    assert.equal(md.slug('Éé  ÀÀ'), 'ee-aa');
});

test('pembuat halaman: alamat artikel yang berbahaya ditolak, bukan ditulis ke index.html', () => {
    const jahat = { judul: 'T', slug: 'x"><img src=x onerror=alert(1)>', isi: 'halo', foto: [], terbit_at: '2026-10-21T00:00:00Z' };
    assert.throws(() => B.kartu(jahat), /tidak valid/);
    assert.throws(() => B.entriSitemap(jahat, 'https://ayrigitar.com/'), /tidak valid/);
    assert.throws(() => B.halaman(baca('scripts/artikel-template.html'), jahat, 'https://ayrigitar.com/'), /tidak valid/);
    for (const s of ['', 'A-b', 'a_b', '../x', 'a/b', '-a', 'a-']) assert.throws(() => B.kartu({ judul: 'T', slug: s, isi: 'x', foto: [] }), /tidak valid/, 'slug "' + s + '"');
});

test('pembuat halaman: judul, tag, dan teks foto di-escape; foto di luar foto/artikel/ diabaikan', () => {
    const a = { judul: 'T"><script>alert(1)</script>', slug: 'aman', tag: 't"x', ringkasan: 'r', isi: 'halo', terbit_at: '2026-10-21T00:00:00Z',
        foto: [{ path: 'foto/artikel/abc.webp', alt: 'a"b' }, { path: '../../etc/passwd', alt: 'x' }] };
    const kartu = B.kartu(a), halaman = B.halaman(baca('scripts/artikel-template.html'), a, 'https://ayrigitar.com/');
    assert.ok(!/<script>alert\(1\)<\/script>/.test(kartu + halaman), 'skrip dari judul tidak boleh tertulis mentah');
    assert.ok(!/onerror=alert/.test(halaman));
    assert.ok(!/etc\/passwd/.test(halaman + kartu), 'jalur foto di luar foto/artikel/ dibuang');
    assert.match(kartu, /href="artikel-aman\.html"/);
});
