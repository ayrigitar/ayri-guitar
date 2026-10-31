/* Kotak ketersediaan di artikel profil unit stok: data/katalog.json (publik) menentukan apakah unit masih dijual.
   Artikel tetap tayang setelah unit terjual; tanpa JavaScript, kotak tetap berisi ajakan bertanya lewat WhatsApp. */
(function () {
    var kotak = document.querySelector('[data-unit]');
    if (!kotak || !window.fetch) return;
    var kode = kotak.getAttribute('data-unit'), teks = kotak.querySelector('[data-unit-teks]'), aksi = kotak.querySelector('[data-unit-aksi]');
    function tautan(href, label, kelas) {
        var a = document.createElement('a'); a.href = href; a.className = 'btn btn--sm ' + kelas; a.textContent = label; aksi.insertBefore(a, aksi.firstChild);
    }
    fetch('data/katalog.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
        var x = (d.item || []).filter(function (i) { return i.kode === kode; })[0];
        if (x) {
            var dipesan = x.status === 'dipesan';
            kotak.setAttribute('data-status', dipesan ? 'dipesan' : 'tersedia');
            teks.textContent = (dipesan ? 'Unit ini sedang dipesan pembeli lain. ' : 'Unit ini masih tersedia di AYRI. ') + 'Harga Rp ' + Number(x.harga).toLocaleString('id-ID') + '.';
            tautan('unit/' + encodeURIComponent(kode) + '.html', 'Lihat unit', 'btn--ghost');
        } else {
            kotak.setAttribute('data-status', 'tidak-tersedia');
            teks.textContent = 'Unit ini sudah tidak tersedia. Tanyakan unit serupa lewat WhatsApp, atau lihat katalog kami.';
            tautan('katalog.html', 'Lihat katalog', 'btn--ghost');
        }
    }).catch(function () { /* gagal memuat katalog: biarkan teks bawaan */ });
})();
