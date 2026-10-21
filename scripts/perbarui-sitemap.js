#!/usr/bin/env node
/* Mengisi <lastmod> di sitemap.xml dari tanggal perubahan terakhir tiap halaman (riwayat git).
   Halaman yang sedang diubah (belum di-commit) memakai tanggal hari ini.
   Jalankan dari folder repo sebelum membuat PR yang mengubah halaman:  node scripts/perbarui-sitemap.js
   Entri artikel buatan admin (di antara penanda ARTIKEL-OTOMATIS) dikelola admin sendiri dan tidak disentuh. */
const { execFileSync } = require('node:child_process'), fs = require('node:fs'), path = require('node:path');
const akar = path.join(__dirname, '..'), berkasPeta = path.join(akar, 'sitemap.xml');
const git = (...a) => execFileSync('git', a, { cwd: akar, encoding: 'utf8' }).trim();
const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
let xml = fs.readFileSync(berkasPeta, 'utf8'), berubah = 0;
const [depan, sisa] = xml.split('<!-- ARTIKEL-OTOMATIS:MULAI -->');
const diperbarui = depan.replace(/(<loc>https?:\/\/[^<]*?\/([^<\/]*)<\/loc>\s*<lastmod>)([^<]*)(<\/lastmod>)/g, (m, awal, nama, lama, akhir) => {
    const berkas = nama || 'index.html';
    if (!fs.existsSync(path.join(akar, berkas))) return m;
    const tgl = git('status', '--porcelain', '--', berkas) ? hariIni : (git('log', '-1', '--format=%cs', '--', berkas) || lama);
    if (tgl !== lama) berubah++;
    return awal + tgl + akhir;
});
fs.writeFileSync(berkasPeta, sisa === undefined ? diperbarui : diperbarui + '<!-- ARTIKEL-OTOMATIS:MULAI -->' + sisa);
console.log(berubah ? 'lastmod diperbarui untuk ' + berubah + ' halaman' : 'lastmod sudah sesuai');
