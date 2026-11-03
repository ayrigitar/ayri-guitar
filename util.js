/* Pembantu kecil yang dipakai banyak halaman. Satu sumber saja: jangan disalin lagi ke file lain.
   Harus dimuat SEBELUM layanan.js, artikel-md.js, partitur.js, efek.js dan skrip katalog (tests/halaman.test.js memeriksanya). */
(function (root) {
    var HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    root.AYRI_UTIL = {
        /* aman untuk isi elemen maupun nilai atribut (kutip ganda dan tunggal ikut diganti) */
        esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return HTML[c]; }); },
        /* 1500000 -> Rp1.500.000 (angka negatif diberi tanda minus) */
        rupiah: function (n) { n = Math.round(+n || 0); return (n < 0 ? '−' : '') + 'Rp' + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
        /* judul barang di katalog/poster. Gitar: "Gitar Akustik Yamaha F310" (Bass/Ukulele tanpa kata Gitar). Aksesoris: Kategori + Tipe + Alat musik + Merek & model + Ukuran,
           mis. "Senar Gitar Akustik Orphee SA38 Ukuran 011", "Kabel Jack 6.5mm Mono Beyer ISO100LU3 3 Meter". Kata "Ukuran" hanya untuk angka saja (011).
           Kategori dengan tanpaKategori (skema[kategori]) dan Tipe terisi: kata kategori dihilangkan ("Hardcase Gitar Akustik ..." bukan "Case & tas Hardcase ...").
           x = { kategori, jenis, nama, alat[], tipe, ukuran }; skema = layanan-config aksesoris */
        judulKatalog: function (x, tanpaGitar, skema) {
            if (x.kategori === 'gitar') return ((tanpaGitar || []).indexOf(x.jenis) > -1 ? x.jenis : 'Gitar ' + x.jenis) + ' ' + x.nama;
            var alat = Array.isArray(x.alat) ? x.alat.join(' / ') : '', ukuran = x.ukuran ? (/^[0-9]+$/.test(x.ukuran) ? 'Ukuran ' + x.ukuran : x.ukuran) : '', sk = (skema || {})[x.jenis] || {};
            if (!alat && !ukuran && !x.tipe) return x.nama;
            return [sk.tanpaKategori && x.tipe ? '' : x.jenis, x.tipe, alat, x.nama, ukuran].filter(Boolean).join(' ');
        },
        /* salinan dalam untuk data JSON */
        salin: function (o) { return JSON.parse(JSON.stringify(o)); }
    };
})(this);
