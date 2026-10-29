/* Service worker Toko Gitar AYRI.
   Naikkan angka VERSION setiap kali Anda mengubah daftar file di bawah. */
var VERSION = 'ayri-v44';
var CORE = ['./', 'index.html', 'tuner.html', 'chords.html', 'metronom.html', 'transkrip.html', 'partitur.html', 'partitur.js', 'partitur-edit.js', 'efek.html', 'efek.js', 'efek-worklet.js', 'chord-engine.js', 'artikel-custom-nut.html', 'style-index.css', 'style-artikel.css',
    'theme-dark.css', 'tools.css', 'app.css', 'app.js', 'theme.js', 'pwa.js', 'site.js', 'util.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-48.png', 'favicon.svg', 'logo/ayri-ikon.svg',
    'admin.html', 'admin.js', 'admin.webmanifest', 'layanan.js', 'layanan.css', 'layanan-config.js', 'artikel-md.js', 'artikel-builder.js'];
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
/* Tidak pernah disimpan di cache perangkat: apa pun di data/ kecuali katalog publik (data pelanggan terenkripsi, foto servis, nota), serta file unduhan besar. */
var JANGAN_SIMPAN = /^(data\/(?!katalog\.json$)|unduh\/)|\.(apk|zip|pdf)$/i;
var MAKS_TAMBAHAN = 80; /* file di luar CORE yang boleh ikut tersimpan; yang paling lama dibuang */
var AWAL = new URL('./', self.registration.scope);
var CORE_URL = CORE.map(function (p) { return new URL(p, AWAL).href; });

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSION).then(function (c) {
        return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});
function u(req) { return new URL(req.url).pathname; }
function key(req) { var u = new URL(req.url); u.search = ''; return u.toString(); }
function relatif(url) { return url.pathname.slice(AWAL.pathname.length); }
function rapikan(c) {
    return c.keys().then(function (ks) {
        var lain = ks.filter(function (r) { return CORE_URL.indexOf(r.url) < 0; });
        return Promise.all(lain.slice(0, Math.max(0, lain.length - MAKS_TAMBAHAN)).map(function (r) { return c.delete(r); }));
    });
}
function networkFirst(req) {
    return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { return c.put(key(req), copy).then(function () { return rapikan(c); }); }).catch(function () {});
        }
        return res;
    }).catch(function () {
        return caches.match(key(req)).then(function (hit) {
            return hit || (req.mode === 'navigate' ? caches.match(/admin\.html$/.test(u(req)) ? 'admin.html' : 'index.html') : Response.error());
        });
    });
}
function staleWhileRevalidate(req) {
    return caches.open(VERSION).then(function (c) {
        return c.match(req).then(function (hit) {
            var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
            return hit || net;
        });
    });
}
self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin === location.origin) { if (!JANGAN_SIMPAN.test(relatif(url))) e.respondWith(networkFirst(req)); }
    else if (FONT_HOSTS.indexOf(url.hostname) > -1) { e.respondWith(staleWhileRevalidate(req)); }
});
