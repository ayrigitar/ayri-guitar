'use strict';
/* Pemeriksaan statis seluruh situs: sintaks semua skrip, urutan util.js, tautan lokal, aturan keamanan halaman admin, sitemap, service worker, tidak ada token di repo. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { REPO, baca } = require('./helper');

const AKAR = REPO.replace(/[\\/]$/, '');
const dilewati = new Set(['.git', 'node_modules', 'vendor', 'tests', '.github']);
function semua(dir, hasil) {
    hasil = hasil || [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (dilewati.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) semua(p, hasil); else hasil.push(p);
    }
    return hasil;
}
const rel = (p) => path.relative(AKAR, p).split(path.sep).join('/');
/* ada DENGAN huruf besar-kecil yang persis sama: Windows/macOS tidak membedakan, GitHub Pages (Linux) membedakan */
function adaPersis(p) {
    const bagian = path.relative(AKAR, path.resolve(p)).split(path.sep).filter(Boolean);
    if (bagian[0] === '..') return false;
    let dir = AKAR;
    for (const b of bagian) { if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(b)) return false; dir = path.join(dir, b); }
    return true;
}
const berkas = semua(AKAR), html = berkas.filter((p) => p.endsWith('.html')), js = berkas.filter((p) => p.endsWith('.js'));
const SKRIP = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
function skripDi(teks) {
    const hasil = []; let m; SKRIP.lastIndex = 0;
    while ((m = SKRIP.exec(teks))) hasil.push({ attr: m[1], isi: m[2], pos: m.index, src: (/\bsrc="([^"]+)"/.exec(m[1]) || [])[1], jenis: (/\btype="([^"]+)"/.exec(m[1]) || [])[1] });
    return hasil;
}

test('semua file .js dan skrip inline di HTML bisa di-parse (tidak ada salah ketik)', () => {
    for (const f of js) assert.doesNotThrow(() => new vm.Script(fs.readFileSync(f, 'utf8'), { filename: rel(f) }), rel(f));
    for (const f of html) skripDi(fs.readFileSync(f, 'utf8')).filter((s) => !s.src && (!s.jenis || /javascript/.test(s.jenis))).forEach((s, i) =>
        assert.doesNotThrow(() => new vm.Script(s.isi, { filename: rel(f) + '#' + (i + 1) }), rel(f) + ' skrip inline ke-' + (i + 1)));
});

test('util.js dimuat SEBELUM skrip yang memakainya di setiap halaman', () => {
    const pemakai = /^(layanan|artikel-md|partitur|efek)\.js$/;
    let diperiksa = 0;
    for (const f of html) {
        const teks = fs.readFileSync(f, 'utf8'), daftar = skripDi(teks);
        const iUtil = daftar.findIndex((s) => s.src === 'util.js');
        const iPakai = daftar.findIndex((s) => (s.src && pemakai.test(s.src)) || (!s.src && s.isi.includes('AYRI_UTIL')));
        if (iPakai < 0) continue;
        diperiksa++;
        assert.ok(iUtil >= 0 && iUtil < iPakai, rel(f) + ': <script src="util.js"> harus ada dan lebih dulu dari skrip yang memakai AYRI_UTIL');
    }
    assert.ok(diperiksa >= 8, 'harus memeriksa semua halaman pemakai (ditemukan ' + diperiksa + ')');
});

test('semua tautan/skrip/gambar lokal di HTML menunjuk ke file yang ada', () => {
    for (const f of html) {
        /* komentar dan ISI skrip dibuang (isinya kode, bukan tautan); atribut src pada tag <script> tetap diperiksa */
        const teks = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2');
        const re = /\b(?:src|href)="([^"]+)"/g; let m;
        while ((m = re.exec(teks))) {
            const u = m[1];
            if (/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(u) || /[{}]/.test(u)) continue;
            const file = u.split('#')[0].split('?')[0]; if (!file) continue;
            /* scripts/artikel-template.html dicetak jadi halaman di akar situs, jadi tautannya dihitung dari akar */
            const dasar = rel(f) === 'scripts/artikel-template.html' ? AKAR : path.dirname(f);
            const tujuan = file.startsWith('/') ? path.join(AKAR, file) : path.resolve(dasar, file);
            assert.ok(adaPersis(tujuan) || adaPersis(tujuan.replace(/[\\/]$/, '') + '.html'), rel(f) + ' menunjuk ke "' + u + '" yang tidak ada (periksa juga huruf besar-kecilnya)');
        }
    }
});

test('halaman admin: tanpa skrip/handler inline, CSP ketat, koneksi hanya ke situs sendiri dan GitHub', () => {
    const teks = baca('admin.html');
    const csp = (/http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(teks) || [])[1];
    assert.ok(csp, 'admin.html harus punya <meta Content-Security-Policy>');
    const arahan = Object.fromEntries(csp.split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [k, ...v] = x.split(/\s+/); return [k, v]; }));
    assert.deepEqual(arahan['script-src'], ["'self'"], 'skrip hanya dari situs sendiri (tanpa unsafe-inline / unsafe-eval)');
    assert.deepEqual(arahan['object-src'], ["'none'"]);
    assert.deepEqual(arahan['base-uri'], ["'self'"]);
    for (const host of arahan['connect-src']) assert.ok(["'self'", 'https://api.github.com', 'https://ayrigitar.com'].includes(host), 'connect-src tidak boleh mengizinkan ' + host);
    assert.equal(skripDi(teks).filter((s) => !s.src).length, 0, 'tidak boleh ada <script> inline di admin.html');
    assert.ok(!/\son[a-z]+\s*=/i.test(teks.replace(/<!--[\s\S]*?-->/g, '')), 'tidak boleh ada atribut onclick= dsb. di admin.html');
    assert.ok(!/javascript:/i.test(teks));
    const kode = baca('admin.js');
    assert.ok(!/<[a-z][^>]*\son[a-z]+\s*=/i.test(kode.replace(/\/\*[\s\S]*?\*\//g, '')), 'admin.js tidak boleh membuat elemen dengan onclick=/onerror= dsb.');
    assert.ok(!/\beval\s*\(|new Function\s*\(/.test(kode + baca('layanan.js')));
});

test('token GitHub tidak pernah ada di repo', () => {
    const polaToken = /\bgh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/;
    const teksOk = /\.(html|js|css|json|md|xml|txt|webmanifest|yml|yaml|svg)$/i;
    for (const f of berkas.filter((p) => teksOk.test(p))) assert.ok(!polaToken.test(fs.readFileSync(f, 'utf8')), rel(f) + ' memuat sesuatu yang mirip token GitHub');
});

test('sitemap.xml: setiap halaman ada, tanggal lastmod benar bentuknya', () => {
    const peta = baca('sitemap.xml'), locs = [...peta.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
    assert.ok(locs.length >= 8);
    for (const [, loc, tgl] of locs) {
        const berkas = loc.replace(/^https:\/\/ayrigitar\.com\//, '') || 'index.html';
        assert.ok(adaPersis(path.join(AKAR, berkas)), 'sitemap menunjuk ke ' + berkas + ' yang tidak ada');
        assert.match(tgl, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(!Number.isNaN(Date.parse(tgl)), tgl);
    }
    assert.ok(/ARTIKEL-OTOMATIS:MULAI/.test(peta) && /ARTIKEL-OTOMATIS:SELESAI/.test(peta), 'penanda artikel otomatis harus tetap ada');
});

function muatSw() {
    const sb = { self: { addEventListener() {}, registration: { scope: 'https://ayrigitar.com/' }, clients: {}, skipWaiting() {} }, caches: {}, location: { origin: 'https://ayrigitar.com' }, URL, Response: {}, fetch() {} };
    vm.createContext(sb); vm.runInContext(baca('sw.js'), sb, { filename: 'sw.js' });
    return sb;
}

test('service worker: semua file daftar CORE ada, VERSION berformat benar', () => {
    const sw = muatSw();
    assert.match(sw.VERSION, /^ayri-v\d+$/);
    for (const p of sw.CORE) if (p !== './') assert.ok(adaPersis(path.join(AKAR, p)), 'CORE menyebut ' + p + ' yang tidak ada');
    for (const wajib of ['util.js', 'admin.js', 'layanan.js', 'admin.html']) assert.ok(sw.CORE.includes(wajib), wajib + ' harus ada di CORE');
});

test('service worker: data pelanggan dan unduhan tidak pernah disimpan di cache perangkat', () => {
    const { JANGAN_SIMPAN: pola } = muatSw();
    for (const p of ['data/servis/abc.json', 'data/tebus/abc.json', 'data/jual/abc.json', 'data/foto/abc.bin', 'data/folder-baru/x.json', 'unduh/ayri-alat-latihan.apk', 'x/file.apk']) assert.ok(pola.test(p), p + ' harus dikecualikan');
    for (const p of ['index.html', 'data/katalog.json', 'foto/stok/abc.webp', 'layanan.js', 'admin.html']) assert.ok(!pola.test(p), p + ' boleh disimpan');
});

test('admin: tombol aksi memakai komponen seragam dan poster memuat foto lewat GitHub (bukan hanya cache situs)', () => {
    const js = baca('admin.js'), css = baca('layanan.css');
    /* semua id yang dipasangi pendengar harus tetap ada di markup tombol aksi */
    for (const id of ['sv-cetak', 'sv-artikel', 'sv-hapus', 'tb-hapus', 'tb-kestok', 'jl-hapus', 'sk-tawar', 'sk-hapus', 'ar-hapus']) assert.match(js, new RegExp("id: '" + id + "'"), id);
    assert.match(js, /A\.fotoBlob\(s, f, true\)/);
    assert.doesNotMatch(js, /muatGambar\(L\.situs\(\) \+ fp\.path\)/, 'foto poster tidak boleh hanya dari situs (cache force-cache bisa menyimpan 404)');
    assert.match(css, /\.ly-akt--del/);
});
