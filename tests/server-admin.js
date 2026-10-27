'use strict';
/* Server uji tampilan admin (bukan bagian node --test): menyajikan repo apa adanya, tetapi admin.html bicara dengan "GitHub" palsu di memori (helper.js) lewat /__gh/.
   Jalankan: node tests/server-admin.js 8783, buka http://127.0.0.1:8783/admin.html, token apa saja (mis. tok-owner) + PIN 6 angka.
   Data contoh: 1 servis (#servis/sv1), 1 stok berfoto (#stok/sk1), 1 jual DP (#jual/jl1), 1 tebus (#tebus/tb1), 1 artikel (#artikel/ar1).
   /__putus?v=1 membuat semua panggilan GitHub gagal, /__log melihat panggilan terakhir. Untuk menguji tombol Bagikan/Cetak di luar APK: window.AyriApp = { postMessage: function (m) { window.__pesan = JSON.parse(m); } }. */
const http = require('http'), fs = require('fs'), path = require('path');
const H = require('./helper.js');
const PORT = +process.argv[2] || 8783;

const foto = fs.readFileSync(H.REPO + 'icon-512.png');
const hari = H.hariIni();
const servis = [{
    id: 'sv1', kode: 'AYR-K7M2PQ', nama: 'Rian Saputra', hp: '0813 2222 3333', tgl_masuk: hari, gitar_jenis: 'Akustik', gitar_merk: 'Taylor 214ce',
    keluhan: 'Action tinggi, fret buzz di senar 1', status: 'dikerjakan', diskon: 0, estimasi: hari, created_at: '2026-10-20T00:00:00.000Z', updated_at: '2026-10-20T00:00:00.000Z',
    items: [{ jenis: 'jasa', nama: 'Full Setup (Akustik)', harga: 350000, qty: 1, garansi: '7h' }, { jenis: 'part', nama: 'Senar Elixir 12', harga: 180000, qty: 1 }],
    bayar: [{ id: 'b1', tgl: hari, jumlah: 355000, jenis: 'dp', metode: 'tunai' }], foto: [], fk: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
}];
const stok = [{
    id: 'sk1', kode: 'STK-V9FPZW', kategori: 'gitar', gitar_jenis: 'Bass', gitar_merk: 'Fender Aerodyne', warna: 'Hitam Glossy', kondisi: 'bekas', tingkat: 'excellent', jumlah: 1, status: 'tersedia', tampil: true,
    harga_jual: 13000000, deskripsi: 'Jazz Bass Made in Japan 2003', penjualan: [], tgl_masuk: hari, created_at: '2026-10-21T00:00:00.000Z', updated_at: '2026-10-21T00:00:00.000Z',
    foto: [{ id: 'f1', tahap: 'gitar', path: 'foto/stok/uji.webp', thumb_path: 'foto/stok/uji-k.webp', tipe: 'image/webp', repo: 'publik', created_at: '2026-10-21T00:00:00.000Z' }]
}];
const jual = [{
    id: 'jl1', kode: 'JUL-ABC123', nama: 'Budi', hp: '0812 1111 2222', tgl: hari, status: 'dp', batas_lunas: '2026-11-20', created_at: '2026-10-22T00:00:00.000Z', updated_at: '2026-10-22T00:00:00.000Z',
    items: [{ stok_id: 'sk2', kode: 'STK-X', nama: 'Gitar Yamaha', qty: 1, harga: 1350000 }], bayar: [{ id: 'by1', tgl: hari, jumlah: 300000, jenis: 'dp', metode: 'tunai' }]
}];
const tebus = [{
    id: 'tb1', kode: 'TBS-ZZZ111', nama: 'Hadi', hp: '0857 1111 2222', gitar_jenis: 'Elektrik', gitar_merk: 'Fender Strat', tgl_beli: hari, harga_beli: 2500000, batas_tebus: '2026-12-01',
    metode: 'tunai', status: 'aktif', foto: [], created_at: '2026-10-22T00:00:00.000Z', updated_at: '2026-10-22T00:00:00.000Z'
}];
const artikel = [{ id: 'ar1', slug: 'uji', judul: 'Artikel uji', isi: 'isi', status: 'draf', foto: [], created_at: '2026-10-22T00:00:00.000Z', updated_at: '2026-10-22T00:00:00.000Z' }];

const gh = H.siapkanRepo(H.bikinGitHub(), {
    situs: { 'foto/stok/uji.webp': foto, 'foto/stok/uji-k.webp': foto },
    data: { 'servis.json': JSON.stringify(servis), 'stok.json': JSON.stringify(stok), 'jual.json': JSON.stringify(jual), 'artikel.json': JSON.stringify(artikel) },
    owner: { 'tebus.json': JSON.stringify(tebus) }
});
let putus = false;   /* /__putus=1: semua panggilan GitHub gagal (uji cadangan foto) */

const MOCK = "(function(){var f0=window.fetch.bind(window);window.fetch=function(u,o){u=String(u);if(u.indexOf('https://api.github.com/')===0){u='/__gh/'+u.slice('https://api.github.com/'.length);}return f0(u,o);};})();";
const TIPE = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wav': 'audio/wav', '.jpg': 'image/jpeg' };

http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/__putus') { putus = u.searchParams.get('v') === '1'; res.end('putus=' + putus); return; }
    if (u.pathname === '/mock-gh.js') { res.writeHead(200, { 'Content-Type': TIPE['.js'] }); res.end(MOCK); return; }
    if (u.pathname === '/__log') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(gh.log.slice(-40))); return; }
    if (u.pathname.startsWith('/__gh/')) {
        const rest = u.pathname.slice(6) + u.search, tok = String(req.headers.authorization || '').replace(/^Bearer /, '');
        const bagian = []; req.on('data', (c) => bagian.push(c));
        req.on('end', async () => {
            try {
                if (putus) { res.writeHead(503); res.end('putus'); return; }
                const body = bagian.length ? JSON.parse(Buffer.concat(bagian).toString('utf8')) : null;
                const r = await gh.tangani(req.method, 'https://api.github.com/' + rest, body, tok);
                if (req.method === 'GET' && /\/contents\//.test(u.pathname) && r.ok) { const b = Buffer.from(await r.arrayBuffer()); res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); res.end(b); return; }
                res.writeHead(r.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(await r.json()));
            } catch (e) { res.writeHead(500); res.end(String(e && e.stack || e)); }
        });
        return;
    }
    /* katalog.html membaca data/katalog.json: setelah stok disimpan lewat admin, yang tampil adalah katalog hasil GitHub palsu */
    if (u.pathname === '/data/katalog.json') { const t = gh.isi('ayri-guitar', 'data/katalog.json'); if (t !== null) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(t); return; } }
    let p = decodeURIComponent(u.pathname); if (p === '/') p = '/index.html';
    const f = path.join(H.REPO, p);
    if (!f.startsWith(H.REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
    let data = fs.readFileSync(f);
    if (p === '/admin.html') data = Buffer.from(data.toString('utf8').replace('<head>', '<head>\n<script src="/mock-gh.js"></script>'));
    res.writeHead(200, { 'Content-Type': TIPE[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
}).listen(PORT, '127.0.0.1', () => console.log('siap di ' + PORT));
