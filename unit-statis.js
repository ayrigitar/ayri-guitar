/* Halaman unit statis (unit/KODE.html): isi utamanya sudah HTML biasa untuk Google dan pembaca. Skrip ini hanya menambahkan
   galeri geser, tombol Bagikan, "Barang lainnya", dan status terbaru dari data/katalog.json (mis. barang sudah terjual). */
document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('unit'); if (!box) return;
    var C = window.AYRI_LAYANAN || {}, esc = AYRI_UTIL.esc, rupiah = AYRI_UTIL.rupiah, kode = box.getAttribute('data-kode');

    var utama = document.getElementById('unit-utama'), thumbs = document.getElementById('unit-thumbs'), hitung = document.getElementById('unit-hitung');
    if (utama && thumbs) {
        var n = thumbs.children.length;
        var pilih = function (i) { [].forEach.call(thumbs.children, function (b, k) { b.setAttribute('aria-current', k === i); }); if (hitung) hitung.textContent = (i + 1) + ' / ' + n; };
        thumbs.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) utama.scrollTo({ left: +b.getAttribute('data-i') * utama.clientWidth, behavior: 'smooth' }); });
        utama.addEventListener('scroll', function () { pilih(Math.round(utama.scrollLeft / Math.max(1, utama.clientWidth))); }, { passive: true });
    }

    var bagikan = document.getElementById('unit-bagikan');
    if (bagikan) bagikan.addEventListener('click', function () {
        var url = location.href.split('#')[0].split('?')[0], judul = document.querySelector('h1') ? document.querySelector('h1').textContent : document.title;
        if (navigator.share) navigator.share({ title: judul, url: url }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { bagikan.textContent = 'Tautan disalin'; });
    });

    function judul(y) { return y.kategori === 'gitar' ? ((C.jenisTanpaGitar || []).indexOf(y.jenis) > -1 ? y.jenis : 'Gitar ' + y.jenis) + ' ' + y.nama : y.nama; }
    function kelompok(y) { return y.kategori === 'gitar' ? y.kondisi : 'aksesoris'; }
    function kartu(y) {
        var f = y.foto[0];
        return '<a class="kat-item" href="' + encodeURIComponent(y.kode) + '.html"><span class="kat-foto">' + (f ? '<img src="../' + esc(f.kecil) + '" alt="' + esc(judul(y)) + '" loading="lazy" decoding="async">' : '<span class="kat-nofoto">Foto menyusul</span>') + '</span>' +
            '<span class="kat-isi"><span class="kat-harga">' + rupiah(y.harga) + '</span><b class="kat-nama">' + esc(judul(y)) + '</b><small>' + esc(y.warna || '') + '</small></span></a>';
    }
    fetch('../data/katalog.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
        if (!d || !d.item) return; /* gagal memuat: biarkan isi statis apa adanya */
        var x = d.item.filter(function (y) { return y.kode === kode; })[0], status = box.querySelector('.unit-status');
        if (!x) { /* sudah terjual / ditarik */
            if (status) { status.className = 'unit-status unit-status--pesan'; status.textContent = 'Barang ini sudah terjual atau tidak tersedia lagi. Tanyakan unit serupa lewat WhatsApp.'; }
            var bar = document.getElementById('unit-bar'); if (bar) bar.hidden = true;
        } else if (status && x.status === 'dipesan') { status.className = 'unit-status unit-status--pesan'; status.textContent = 'Sedang dipesan pembeli lain. Tanyakan bila batal.'; }
        var seksi = document.getElementById('unit-serupa');
        var serupa = d.item.filter(function (y) { return y.kode !== kode && (!x || kelompok(y) === kelompok(x)); }).slice(0, 4);
        if (seksi && serupa.length) { seksi.hidden = false; seksi.innerHTML = '<h2>Barang lainnya</h2><div class="kat-grid">' + serupa.map(kartu).join('') + '</div>'; }
    });
});
