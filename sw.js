/* Service worker Toko Gitar AYRI.
   Naikkan angka VERSION setiap kali Anda mengubah daftar file di bawah. */
var VERSION = 'ayri-v8';
var CORE = ['./', 'index.html', 'tuner.html', 'chords.html', 'metronom.html', 'transkrip.html', 'chord-engine.js', 'artikel-custom-nut.html', 'style-index.css', 'style-artikel.css',
    'theme-dark.css', 'tools.css', 'app.css', 'app.js', 'theme.js', 'pwa.js', 'site.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-48.png'];
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

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
function key(req) { var u = new URL(req.url); u.search = ''; return u.toString(); }
function networkFirst(req) {
    return fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(key(req), copy); }); }
        return res;
    }).catch(function () {
        return caches.match(key(req)).then(function (hit) {
            return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
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
    var u = new URL(req.url);
    if (u.origin === location.origin) { e.respondWith(networkFirst(req)); }
    else if (FONT_HOSTS.indexOf(u.hostname) > -1) { e.respondWith(staleWhileRevalidate(req)); }
});
