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
        /* varian dalam satu seri (barang dengan isian Seri yang sama): label pembeda = Ukuran / Tipe / nama; diurutkan menurut angka di depan ("3 Meter" < "5 Meter" < "10 Meter", "010" < "011") */
        labelVarian: function (x) { return x.ukuran || x.tipe || x.nama || ''; },
        urutVarian: function (a, b) {
            var la = (a.ukuran || a.tipe || a.nama || ''), lb = (b.ukuran || b.tipe || b.nama || ''), na = parseFloat(la), nb = parseFloat(lb);
            if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
            return la < lb ? -1 : la > lb ? 1 : a.harga - b.harga;
        },
        /* judul halaman seri, mis. "Senar Gitar Akustik Orphee QA Series": judul biasa tanpa ukuran, dengan nama = seri (merek ditambahkan bila belum ada di nama seri) */
        judulSeri: function (daftar, tanpaGitar, skema) {
            var p = daftar[0], alat = [], merek = String(p.merek || '').trim(), seri = String(p.seri || '').trim();
            daftar.forEach(function (x) { (x.alat || []).forEach(function (a) { if (alat.indexOf(a) < 0) alat.push(a); }); });
            var nama = merek && seri.toLowerCase().indexOf(merek.toLowerCase()) < 0 ? merek + ' ' + seri : seri;
            return AYRI_UTIL.judulKatalog({ kategori: 'aksesoris', jenis: p.jenis, nama: nama, alat: alat, tipe: daftar.every(function (x) { return x.tipe === p.tipe; }) ? p.tipe : '' }, tanpaGitar, skema);
        },
        /* salinan dalam untuk data JSON */
        salin: function (o) { return JSON.parse(JSON.stringify(o)); }
    };
})(this);
