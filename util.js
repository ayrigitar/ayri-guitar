/* Pembantu kecil yang dipakai banyak halaman. Satu sumber saja: jangan disalin lagi ke file lain.
   Harus dimuat SEBELUM layanan.js, artikel-md.js, partitur.js, efek.js dan skrip katalog (tests/halaman.test.js memeriksanya). */
(function (root) {
    var HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    root.AYRI_UTIL = {
        /* aman untuk isi elemen maupun nilai atribut (kutip ganda dan tunggal ikut diganti) */
        esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return HTML[c]; }); },
        /* 1500000 -> Rp1.500.000 (angka negatif diberi tanda minus) */
        rupiah: function (n) { n = Math.round(+n || 0); return (n < 0 ? '−' : '') + 'Rp' + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
        /* salinan dalam untuk data JSON */
        salin: function (o) { return JSON.parse(JSON.stringify(o)); }
    };
})(this);
