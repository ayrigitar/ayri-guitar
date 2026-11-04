/* Pembantu kecil yang dipakai banyak halaman. Satu sumber saja: jangan disalin lagi ke file lain.
   Harus dimuat SEBELUM layanan.js, artikel-md.js, partitur.js, efek.js dan skrip katalog (tests/halaman.test.js memeriksanya). */
(function (root) {
    var HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    var U = root.AYRI_UTIL = {
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
            var alat = U.alatJudul(x.alat, (skema || {})[x.jenis]), ukuran = x.ukuran ? (/^[0-9]+$/.test(x.ukuran) ? 'Ukuran ' + x.ukuran : x.ukuran) : '', sk = (skema || {})[x.jenis] || {};
            if (!alat && !ukuran && !x.tipe) return x.nama;
            return [sk.tanpaKategori && x.tipe ? '' : x.jenis, x.tipe, alat, x.nama, ukuran].filter(Boolean).join(' ');
        },
        /* alat musik di judul: hanya alat PERTAMA yang dicentang (urutan centang = pilihan pemilik), supaya judul tidak panjang;
           kategori dengan alatUmum (mis. Capo) cukup menulis "Gitar", tanpa Akustik/Elektrik/Klasik. Alat lain ditampilkan sebagai "Cocok untuk" (cocokUntuk). */
        alatJudul: function (alat, sk) {
            var a = String((Array.isArray(alat) ? alat[0] : alat) || '').trim();
            return sk && sk.alatUmum && /^Gitar\b/.test(a) ? 'Gitar' : a;
        },
        /* "Cocok untuk: ..." bila judul tidak memuat semua alatnya (lebih dari satu alat, atau kategori alatUmum); maks = batas alat yang ditulis, sisanya "+N". Kosong bila tidak perlu. */
        cocokUntuk: function (alat, sk, maks) {
            var a = (Array.isArray(alat) ? alat : []).map(function (v) { return String(v).trim(); }).filter(Boolean);
            if (!a.length || (a.length < 2 && !(sk && sk.alatUmum))) return '';
            var n = maks && a.length > maks ? a.length - maks : 0;
            return 'Cocok untuk: ' + (n ? a.slice(0, maks) : a).join(', ') + (n ? ' +' + n + ' lainnya' : '');
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
            var p = daftar[0], merek = String(p.merek || '').trim(), seri = String(p.seri || '').trim(), sk = (skema || {})[p.jenis];
            /* alat di judul seri: alat utama bersama seluruh anggota; bila anggotanya berbeda alat utama, tidak ditulis */
            var utama = U.alatJudul(p.alat, sk), alat = utama && daftar.every(function (x) { return U.alatJudul(x.alat, sk) === utama; }) ? [utama] : [];
            var nama = merek && seri.toLowerCase().indexOf(merek.toLowerCase()) < 0 ? merek + ' ' + seri : seri;
            if (!alat.length && daftar.some(function (x) { return (x.alat || []).length; }) && !p.tipe) return (sk && sk.tanpaKategori ? '' : p.jenis + ' ') + nama;   /* anggota beda alat utama: judul tanpa alat, kata kategori tetap ada */
            return AYRI_UTIL.judulKatalog({ kategori: 'aksesoris', jenis: p.jenis, nama: nama, alat: alat, tipe: daftar.every(function (x) { return x.tipe === p.tipe; }) ? p.tipe : '' }, tanpaGitar, skema);
        },
        /* ---------- filter bertingkat untuk daftar stok POS dan katalog: kategori → jenis → tipe, ditambah merek ----------
           x = barang berbentuk katalog { kategori, jenis, nama, warna, merek, tipe, alat }. Tipe senar = untuk alat musik apa
           (dari isian Alat musik; bila kosong dibaca dari tulisan di Warna/Keterangan). Tipe kategori lain = isian Tipe (mis. kepala kabel). */
        faset: function (x) {
            var aks = x.kategori === 'aksesoris', tipe = [], m = String(x.merek || '').trim();
            if (aks && x.jenis === 'Senar') {
                (x.alat || []).forEach(function (a) { a = String(a).trim(); if (a && tipe.indexOf(a) < 0) tipe.push(a); });
                if (!tipe.length) {
                    var w = String(x.warna || '');
                    [[/akustik/i, 'Gitar Akustik'], [/klasik|nylon/i, 'Gitar Klasik'], [/elektrik|electric/i, 'Gitar Elektrik'], [/bass/i, 'Bass'], [/ukulele/i, 'Ukulele'], [/guitalele/i, 'Guitalele']].forEach(function (r) { if (r[0].test(w)) tipe.push(r[1]); });
                }
            } else if (aks && x.tipe) tipe.push(String(x.tipe).trim());
            if (!m && !aks) m = String(x.nama || '').trim().split(/\s+/)[0] || '';   /* gitar: kata pertama nama = merek (Yamaha, Fender, ...) */
            return { jenis: String(x.jenis || ''), tipe: tipe, merek: m };
        },
        cocokFaset: function (x, p) {
            var f = U.faset(x);
            return (!p.jenis || f.jenis === p.jenis) && (!p.tipe || f.tipe.indexOf(p.tipe) > -1) && (!p.merek || f.merek.toLowerCase() === p.merek.toLowerCase());
        },
        /* pilihan yang tersedia untuk daftar (sudah disaring kategori) dan pilihan sekarang p = { jenis, tipe, merek }.
           Hasil: { jenis, tipe, merek } masing-masing [[nama, jumlah], ...]; kosong bila kurang dari 2 pilihan (tidak perlu ditampilkan).
           urut = { jenis: [...], tipe: [...] } urutan yang diinginkan; sisanya menurut jumlah terbanyak. */
        opsiFaset: function (daftar, p, urut) {
            urut = urut || {};
            function hitung(items, ambil, susunan) {
                var peta = {}, k = [];
                items.forEach(function (x) { ambil(U.faset(x)).forEach(function (n) { var key = n.toLowerCase(); if (!n) return; if (!peta[key]) { peta[key] = [n, 0]; k.push(key); } peta[key][1]++; }); });
                var r = k.map(function (key) { return peta[key]; }), idx = function (n) { var i = (susunan || []).indexOf(n); return i < 0 ? 999 : i; };
                r.sort(function (a, b) { return idx(a[0]) - idx(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]); });
                return r.length < 2 ? [] : r;
            }
            var perJenis = p.jenis ? daftar.filter(function (x) { return U.faset(x).jenis === p.jenis; }) : [];
            var perTipe = p.jenis ? perJenis.filter(function (x) { return !p.tipe || U.faset(x).tipe.indexOf(p.tipe) > -1; }) : daftar;
            return {
                jenis: hitung(daftar, function (f) { return [f.jenis]; }, urut.jenis),
                tipe: p.jenis ? hitung(perJenis, function (f) { return f.tipe; }, urut.tipe) : [],
                merek: hitung(perTipe, function (f) { return [f.merek]; }),
                jumlahJenis: perJenis.length,
                jumlahMerek: perTipe.length
            };
        },
        /* buang pilihan yang tidak ada lagi di daftar (mis. setelah pindah kategori) dan samakan huruf besar/kecilnya; mengubah dan mengembalikan p */
        rapikanFaset: function (daftar, p, urut) {
            function cari(arr, v) { v = String(v || '').toLowerCase(); for (var i = 0; i < arr.length; i++) if (arr[i][0].toLowerCase() === v) return arr[i][0]; return ''; }
            p.jenis = cari(U.opsiFaset(daftar, { jenis: '', tipe: '', merek: '' }, urut).jenis, p.jenis);
            p.tipe = cari(U.opsiFaset(daftar, { jenis: p.jenis, tipe: '', merek: '' }, urut).tipe, p.tipe);
            p.merek = cari(U.opsiFaset(daftar, { jenis: p.jenis, tipe: p.tipe, merek: '' }, urut).merek, p.merek);
            return p;
        },
        /* salinan dalam untuk data JSON */
        salin: function (o) { return JSON.parse(JSON.stringify(o)); }
    };
})(this);
