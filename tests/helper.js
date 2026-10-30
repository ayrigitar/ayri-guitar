'use strict';
/* Alat bantu uji untuk layanan.js / admin: GitHub palsu di memori + "perangkat" (sandbox) yang memuat kode ASLI dari repo.
   Jalankan semua uji: node --test tests/ */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const REPO = path.resolve(__dirname, '..') + path.sep;
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const baca = (f) => fs.readFileSync(REPO + f, 'utf8');
const ada = (f) => fs.existsSync(REPO + f);

/* ---------- GitHub palsu: Git Data API secukupnya, termasuk aturan "fast forward" ---------- */
function bikinGitHub(opsi) {
    opsi = opsi || {};
    const repos = {};
    const gh = { repos, latensi: opsi.latensi || [0, 0], izin: {}, log: [], hook: null };
    const sha = () => crypto.randomBytes(20).toString('hex');
    function repo(nama) { return repos[nama] || (repos[nama] = { blobs: {}, commits: {}, trees: {}, head: null }); }
    gh.repo = repo;
    gh.awal = function (nama, files) {
        const r = repo(nama), tree = {};
        Object.keys(files).forEach((p) => { const b = sha(); r.blobs[b] = Buffer.from(files[p]); tree[p] = b; });
        const c = sha(); r.commits[c] = { parent: null, files: tree, pesan: 'awal' }; r.head = c; return c;
    };
    const berkasDi = (r, c) => r.commits[c].files;
    gh.isi = (nama, p) => { const r = repo(nama), b = r.head && berkasDi(r, r.head)[p]; return b === undefined || b === null ? null : r.blobs[b].toString('utf8'); };
    gh.json = (nama, p) => { const t = gh.isi(nama, p); return t === null ? null : JSON.parse(t); };
    gh.daftarFile = (nama) => { const r = repo(nama); return r.head ? Object.keys(berkasDi(r, r.head)) : []; };
    gh.riwayat = (nama) => { const r = repo(nama), out = []; for (let c = r.head; c; c = r.commits[c].parent) out.push(r.commits[c].pesan); return out.reverse(); };
    /* isi situs yang sudah tayang (GitHub Pages): file di repo situs */
    gh.halaman = (p) => gh.isi('ayri-guitar', decodeURIComponent(p));

    gh.tangani = async function (method, url, body, token) {
        const [a, b] = gh.latensi; if (b > 0) await tidur(a + Math.random() * (b - a));
        const u = new URL(url), m = u.pathname.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
        const res = (j, st) => ({ ok: (st || 200) < 300, status: st || 200, json: async () => j, text: async () => (typeof j === 'string' ? j : JSON.stringify(j)), arrayBuffer: async () => Buffer.from(typeof j === 'string' ? j : JSON.stringify(j)) });
        gh.log.push(method + ' ' + u.pathname + u.search);
        if (gh.hook) { const h = await gh.hook(method, u, body, token, res); if (h) return h; }
        if (!m) return res({ message: 'Not Found' }, 404);
        const nama = m[2], rest = m[3] || '', boleh = gh.izin[token];
        if ((boleh && boleh.indexOf(nama) < 0) || !repos[nama]) return res({ message: 'Not Found' }, 404);
        const r = repo(nama);
        if (!rest) return res({ private: nama !== 'ayri-guitar', name: nama });
        let x;
        if (rest === '/git/ref/heads/main' && method === 'GET') return r.head ? res({ object: { sha: r.head } }) : res({ message: 'Git Repository is empty.' }, 409);
        if ((x = rest.match(/^\/git\/commits\/(.+)$/)) && method === 'GET') return r.commits[x[1]] ? res({ sha: x[1], tree: { sha: x[1] } }) : res({ message: 'Not Found' }, 404);
        if (rest === '/git/blobs' && method === 'POST') { const s = sha(); r.blobs[s] = Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8'); return res({ sha: s }, 201); }
        if (rest === '/git/trees' && method === 'POST') {
            const dasar = r.commits[body.base_tree] ? berkasDi(r, body.base_tree) : r.trees[body.base_tree];
            if (!dasar) return res({ message: 'Not Found' }, 404);
            const baru = Object.assign({}, dasar);
            for (const e of body.tree) {
                if (e.sha === null) { if (!(e.path in baru)) return res({ message: 'Invalid tree info', status: '422' }, 422); delete baru[e.path]; }
                else if (!r.blobs[e.sha]) return res({ message: 'Invalid tree info', status: '422' }, 422);
                else baru[e.path] = e.sha;
            }
            const s = sha(); r.trees[s] = baru; return res({ sha: s }, 201);
        }
        if (rest === '/git/commits' && method === 'POST') {
            if (!r.commits[body.parents[0]] || !r.trees[body.tree]) return res({ message: 'Not Found' }, 404);
            const s = sha(); r.commits[s] = { parent: body.parents[0], files: r.trees[body.tree], pesan: body.message }; return res({ sha: s }, 201);
        }
        if (rest === '/git/refs/heads/main' && method === 'PATCH') {
            if (!r.commits[body.sha]) return res({ message: 'Not Found' }, 404);
            if (r.commits[body.sha].parent !== r.head) return res({ message: 'Update is not a fast forward', documentation_url: 'https://docs.github.com/rest/git/refs#update-a-reference', status: '422' }, 422);
            r.head = body.sha; return res({ object: { sha: r.head } });
        }
        if ((x = rest.match(/^\/contents\/(.+)$/))) {
            const p = decodeURIComponent(x[1]);
            if (method === 'GET') {
                const ref = u.searchParams.get('ref') || 'main', c = ref === 'main' ? r.head : (r.commits[ref] ? ref : null);
                if (!c || !(p in berkasDi(r, c))) return res({ message: 'Not Found' }, 404);
                const buf = r.blobs[berkasDi(r, c)[p]];
                return { ok: true, status: 200, text: async () => buf.toString('utf8'), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), json: async () => ({}) };
            }
            if (method === 'PUT') {  /* dipakai untuk memulai repo kosong (README) */
                const s = sha(), c = sha(); r.blobs[s] = Buffer.from(body.content, 'base64');
                const dasar = r.head ? Object.assign({}, berkasDi(r, r.head)) : {}; dasar[p] = s;
                r.commits[c] = { parent: r.head, files: dasar, pesan: body.message }; r.head = c; return res({ commit: { sha: c } }, 201);
            }
        }
        return res({ message: 'tidak dikenal: ' + method + ' ' + rest }, 500);
    };
    return gh;
}

/* repo-repo standar milik toko: situs (publik), data bersama, dan data khusus owner */
function siapkanRepo(gh, o) {
    o = o || {};
    gh.awal('ayri-guitar', Object.assign({ 'README.md': 'x', 'index.html': baca('index.html'), 'sitemap.xml': baca('sitemap.xml'), 'scripts/artikel-template.html': baca('scripts/artikel-template.html') }, o.situs));
    gh.awal('ayri-toko-data', Object.assign({ 'servis.json': '[]', 'stok.json': '[]', 'jual.json': '[]', 'artikel.json': '[]', 'absen.json': '[]', 'opname.json': '[]', 'kas.json': '[]', 'pengaturan.json': '{}' }, o.data));
    gh.awal('ayri-servis-data', Object.assign({ 'README.md': 'x' }, o.owner));
    gh.izin['tok-karyawan'] = ['ayri-guitar', 'ayri-toko-data'];   /* karyawan tidak boleh membuka repo owner */
    return gh;
}

/* ---------- satu "perangkat": sandbox yang memuat layanan.js asli ---------- */
const KODE = ['util.js', 'layanan-config.js', 'artikel-md.js', 'artikel-builder.js', 'layanan.js'];
function bikinPerangkat(gh, o) {
    o = o || {};
    const mem = {}, sesi = {}, token = o.token || 'tok-owner';
    const kv = (m) => ({ getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m });
    const sb = {
        console, setTimeout, clearTimeout, clearInterval, Uint8Array, Float32Array, Float64Array, Int16Array, Uint16Array, ArrayBuffer, Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, Error, RegExp, Map, Set,
        setInterval: (f, t) => { const h = setInterval(f, t); if (h.unref) h.unref(); return h; },
        crypto: crypto.webcrypto, TextEncoder, TextDecoder, Blob, btoa, atob, URL, URLSearchParams,
        navigator: { onLine: true }, location: { origin: 'https://ayrigitar.com', search: '' },
        localStorage: kv(mem), sessionStorage: kv(sesi),
        document: { documentElement: { setAttribute() {} }, createElement: () => ({ getContext: () => ({}), toBlob() {} }) },
        addEventListener() {}
    };
    sb.window = sb;
    sb.fetch = async (url, op) => {
        op = op || {};
        if (/^https:\/\/api\.github\.com\//.test(url)) {
            if (o.putus) throw new TypeError('Failed to fetch');
            const tok = String((op.headers && op.headers.Authorization) || '').replace(/^Bearer /, '');
            return gh.tangani(op.method || 'GET', url, op.body ? JSON.parse(op.body) : null, tok);
        }
        const isi = gh.halaman(String(url).replace(/^https?:\/\/[^/]+\//, '').split('?')[0]);
        if (isi === null) return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
        return { ok: true, status: 200, text: async () => isi, json: async () => JSON.parse(isi), arrayBuffer: async () => Buffer.from(isi) };
    };
    vm.createContext(sb);
    KODE.concat(o.tambahan || []).forEach((f) => {
        if (!ada(f)) return;
        let src = baca(f);
        if (f === 'layanan-config.js') src += '\nwindow.AYRI_LAYANAN = AYRI_LAYANAN;';
        vm.runInContext(src, sb, { filename: f });
    });
    const p = { sb, L: sb.Layanan, A: sb.Layanan.api, mem, sesi, token, gh };
    p.offline = (b) => { sb.navigator.onLine = !b; if (b === undefined) sb.navigator.onLine = true; };
    p.putus = (b) => { o.putus = !!b; };
    p.masuk = async (pin) => { await p.A.pasangToken(token, pin || '123456'); return p.A.muat(); };
    return p;
}

/* data contoh */
const hariIni = () => { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
const stokContoh = (id, jumlah, ekstra) => Object.assign({ id: id || 's1', kode: 'STK-' + (id || 's1').toUpperCase(), kategori: 'gitar', gitar_merk: 'Yamaha F310', gitar_jenis: 'Akustik', kondisi: 'bekas', jumlah: jumlah == null ? 1 : jumlah, status: 'tersedia', harga_jual: 1000000, harga_beli: 600000, foto: [], penjualan: [], created_at: '2026-01-01T00:00:00.000Z', tgl_masuk: '2026-01-01' }, ekstra || {});
const jualContoh = (nama, hp, stokId, ekstra) => Object.assign({ nama, hp, tgl: hariIni(), catatan: 'Kasir', status: 'selesai',
    items: [{ stok_id: stokId || 's1', kode: 'STK-' + (stokId || 's1').toUpperCase(), nama: 'Gitar Akustik Yamaha F310', qty: 1, harga: 1000000 }],
    bayar: [{ id: 'b-' + nama, tgl: hariIni(), jumlah: 1000000, jenis: 'pelunasan', metode: 'tunai' }] }, ekstra || {});
const servisContoh = (nama, hp, ekstra) => Object.assign({ nama, hp, tgl_masuk: hariIni(), gitar_jenis: 'Akustik', gitar_merk: 'Yamaha', keluhan: 'Senar tinggi', status: 'menunggu_dp', diskon: 0,
    items: [{ jenis: 'jasa', nama: 'Basic Setup (Akustik)', harga: 100000, qty: 1, garansi: '7h' }], bayar: [], foto: [] }, ekstra || {});

module.exports = { bikinGitHub, siapkanRepo, bikinPerangkat, tidur, baca, ada, REPO, hariIni, stokContoh, jualContoh, servisContoh };
