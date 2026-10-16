/* Layanan servis Toko Gitar AYRI, tanpa server.
   - Data lengkap (nama, HP, catatan) disimpan admin di repo GitHub PRIVAT (servis.json, artikel.json).
   - Data untuk pelanggan disimpan di situs (data/servis/*.json, data/foto/*.bin) dalam bentuk TERENKRIPSI:
     hanya bisa dibuka dengan kode servis + 4 digit terakhir HP pelanggan.
   Semua akses data lewat Layanan.api, supaya mudah diuji dan diganti. */
(function () {
    var C = window.AYRI_LAYANAN || {};
    var L = window.Layanan = { C: C };

    /* ---------- tema (sama dengan situs) ---------- */
    try { if (localStorage.getItem('ayri-theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {}

    /* ---------- format ---------- */
    var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    L.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    L.rupiah = function (n) { n = Math.round(+n || 0); return (n < 0 ? '−' : '') + 'Rp' + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    /* tanggal disimpan 'YYYY-MM-DD'; dibaca sebagai tanggal lokal supaya tidak bergeser zona waktu */
    L.tglObj = function (s) { if (!s) return null; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    L.tglStr = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    L.hariIni = function () { return L.tglStr(new Date()); };
    L.tgl = function (s) { var d = L.tglObj(s); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : '–'; };
    L.tglPanjang = function (s) { var d = L.tglObj(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : '–'; };

    /* ---------- status ---------- */
    L.STATUS = {
        menunggu_dp: { label: 'Menunggu DP', ket: 'Gitar sudah kami terima. Pengerjaan dimulai setelah DP dan pembayaran part kami terima.' },
        antri: { label: 'Antri', ket: 'Pembayaran awal sudah kami terima. Gitar sedang menunggu giliran dikerjakan.' },
        dikerjakan: { label: 'Sedang dikerjakan', ket: 'Gitar sedang kami kerjakan.' },
        selesai: { label: 'Selesai – bisa diambil', ket: 'Servis sudah selesai. Gitar bisa diambil di toko.' },
        diambil: { label: 'Sudah diambil', ket: 'Gitar sudah diambil. Terima kasih sudah servis di Toko Gitar AYRI!' },
        batal: { label: 'Dibatalkan', ket: 'Servis dibatalkan.' }
    };
    L.URUT_STATUS = ['menunggu_dp', 'antri', 'dikerjakan', 'selesai', 'diambil'];
    L.TAHAP = { sebelum: 'Sebelum servis', kerusakan: 'Kerusakan tambahan', sesudah: 'Sesudah servis' };
    L.beres = function (s) { return s.status === 'selesai' || s.status === 'diambil'; };

    /* ---------- garansi: '7h' = 7 hari, '6b' = 6 bulan ---------- */
    L.garansiLabel = function (g) {
        var m = /^(\d+)([hb])$/.exec(g || ''); if (!m) return '';
        var n = +m[1];
        if (m[2] === 'h') return n % 7 === 0 ? (n / 7) + ' minggu' : n + ' hari';
        return n % 12 === 0 ? (n / 12) + ' tahun' : n + ' bulan';
    };
    L.garansiAkhir = function (g, mulai) {
        var m = /^(\d+)([hb])$/.exec(g || ''), d = L.tglObj(mulai); if (!m || !d) return null;
        if (m[2] === 'h') d.setDate(d.getDate() + +m[1]);
        else { var tgl = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + +m[1]); d.setDate(Math.min(tgl, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
        return L.tglStr(d);
    };
    L.GARANSI_PILIHAN = [['', 'Tanpa garansi'], ['7h', '1 minggu'], ['14h', '2 minggu'], ['1b', '1 bulan'], ['3b', '3 bulan'], ['6b', '6 bulan'], ['12b', '1 tahun']];

    /* ---------- hitungan biaya ---------- */
    L.dpPersen = function () { return C.dpJasaPersen == null ? 50 : C.dpJasaPersen; };
    L.hitung = function (s, items, bayar) {
        var jasa = 0, part = 0, dibayar = 0, bulat = C.bulatkanKe || 1000;
        (items || []).forEach(function (i) { var v = (+i.harga || 0) * (+i.qty || 1); if (i.jenis === 'part') part += v; else jasa += v; });
        (bayar || []).forEach(function (b) { dibayar += +b.jumlah || 0; });
        var diskon = Math.min(+s.diskon || 0, jasa + part), jasaNet = Math.max(0, jasa - diskon), partNet = part - Math.max(0, diskon - jasa);
        var total = jasaNet + partNet;
        var wajib = Math.min(total, Math.ceil(jasaNet * L.dpPersen() / 100 / bulat) * bulat + partNet);
        return {
            jasa: jasa, part: part, diskon: diskon, total: total, wajibAwal: wajib, dibayar: dibayar,
            sisa: Math.max(0, total - dibayar), kurangAwal: Math.max(0, wajib - dibayar), lebih: Math.max(0, dibayar - total),
            lunas: total > 0 && dibayar >= total
        };
    };

    /* ---------- kode servis & tautan ---------- */
    var ABJAD = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; /* tanpa I, L, O, 0, 1 yang mudah tertukar */
    L.kodeBaru = function (awalan) {
        var r = new Uint8Array(6), s = (awalan || 'AYR') + '-'; crypto.getRandomValues(r);
        for (var i = 0; i < 6; i++) s += ABJAD[r[i] % ABJAD.length];
        return s;
    };
    L.hp4 = function (hp) { return String(hp || '').replace(/\D/g, '').slice(-4); };
    L.waNomor = function (hp) { var n = String(hp || '').replace(/\D/g, ''); if (n.charAt(0) === '0') n = '62' + n.slice(1); else if (n.charAt(0) === '8') n = '62' + n; return n; };
    L.waLink = function (hp, teks) { return 'https://wa.me/' + L.waNomor(hp) + '?text=' + encodeURIComponent(teks); };
    L.situs = function () { return (C.situsUrl || location.origin + '/').replace(/\/?$/, '/'); };
    L.urlCek = function (kode) { return L.situs() + 'cek-servis.html?k=' + encodeURIComponent(kode); };
    L.urlNota = function (kode) { return L.situs() + 'nota.html?k=' + encodeURIComponent(kode); };
    L.urlPerjanjian = function (kode) { return L.situs() + 'perjanjian.html?k=' + encodeURIComponent(kode); };

    /* ---------- beli dengan hak tebus ---------- */
    var TB = C.tebus || {};
    L.STATUS_TEBUS = {
        aktif: { label: 'Masa tebus', ket: 'Penjual masih berhak membeli kembali gitar ini.' },
        ditebus: { label: 'Sudah dibeli kembali', ket: 'Gitar sudah dibeli kembali oleh penjual.' },
        milik_toko: { label: 'Milik toko', ket: 'Masa membeli kembali sudah berakhir; gitar sepenuhnya milik toko.' },
        batal: { label: 'Dibatalkan', ket: 'Transaksi dibatalkan.' }
    };
    L.hargaTebus = function (t) { return +t.harga_beli || 0; }; /* kebijakan toko: harga tebus = harga beli */
    /* sisa hari sampai batas tebus (negatif = sudah lewat) */
    L.infoTebus = function (t, hariIni) {
        var kini = hariIni || L.hariIni(), sisa = t.batas_tebus ? L.hariAntara(kini, t.batas_tebus) : null;
        return { sisa: sisa, lewat: sisa != null && sisa < 0, harga: L.hargaTebus(t) };
    };
    L.perluIngatTebus = function (t, hariIni) {
        if (t.status !== 'aktif' || !t.batas_tebus) return false;
        var i = L.infoTebus(t, hariIni), terakhir = (t.pengingat || []).slice(-1)[0] || '';
        if (i.lewat) return true; /* lewat batas: admin perlu memutuskan (jadikan milik toko / perpanjang) */
        return (TB.pengingatHari || [7, 1]).some(function (d) { var tgl = L.tglObj(t.batas_tebus); tgl.setDate(tgl.getDate() - d); tgl = L.tglStr(tgl); return i.sisa <= d && terakhir < tgl; });
    };
    /* foto KTP: disarankan untuk harga besar; boleh dihapus setelah ditebus sekian hari, atau bila dibatalkan.
       Untuk gitar yang menjadi milik toko, KTP tetap disimpan sebagai bukti asal-usul barang. */
    L.adaKtp = function (t) { return (t.foto || []).some(function (f) { return f.tahap === 'ktp'; }); };
    L.ktpBisaDihapus = function (t, hariIni) {
        if (!L.adaKtp(t)) return false;
        if (t.status === 'batal') return true;
        return t.status === 'ditebus' && !!t.tgl_tebus && L.hariAntara(t.tgl_tebus, hariIni || L.hariIni()) >= (TB.hapusKtpHari || 90);
    };
    L.ketentuanTebus = function (t) {
        return (TB.ketentuan || []).map(function (k) {
            return k.split('{batas}').join(L.tglPanjang(t.batas_tebus)).split('{tebus}').join(L.rupiah(L.hargaTebus(t)) + ' (sama dengan harga beli, tanpa biaya tambahan)');
        });
    };
    function gitarTebus(t) { return [t.gitar_jenis, t.gitar_merk].filter(Boolean).join(' ') || 'gitar'; }
    L.pesanTebus = {
        konfirmasi: function (t) {
            return 'Halo Kak ' + t.nama + ', berikut bukti pembelian gitar ' + gitarTebus(t) + (t.no_seri ? ' (no. seri ' + t.no_seri + ')' : '') + ' oleh ' + (C.toko && C.toko.nama || 'Toko Gitar AYRI') + ' dengan hak membeli kembali:\n\n' +
                '• Kode: *' + t.kode + '*\n• Tanggal beli: ' + L.tgl(t.tgl_beli) + '\n• Harga beli: *' + L.rupiah(t.harga_beli) + '*\n' +
                '• Kakak boleh membeli kembali sampai *' + L.tgl(t.batas_tebus) + '* dengan harga *' + L.rupiah(L.hargaTebus(t)) + '*\n\n' +
                'Surat perjanjian lengkap: ' + L.urlPerjanjian(t.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)\n\n' +
                'Mohon balas *SETUJU* bila data dan ketentuannya sudah sesuai. Terima kasih 🙏';
        },
        pengingat: function (t) {
            var i = L.infoTebus(t);
            return 'Halo Kak ' + t.nama + ', kami mengingatkan batas membeli kembali gitar ' + gitarTebus(t) + ' (kode *' + t.kode + '*) adalah *' + L.tgl(t.batas_tebus) + '*' +
                (i.sisa > 0 ? ' (' + i.sisa + ' hari lagi)' : i.sisa === 0 ? ' (hari ini)' : '') + ', dengan harga *' + L.rupiah(i.harga) + '*.\n\n' +
                'Setelah tanggal tersebut, sesuai perjanjian, gitar menjadi milik toko.\n' + (C.toko && C.toko.jam ? '\nJam buka: ' + C.toko.jam + '\n' : '') +
                '\nPerjanjian: ' + L.urlPerjanjian(t.kode);
        },
        ditebus: function (t) {
            return 'Halo Kak ' + t.nama + ', terima kasih. Gitar ' + gitarTebus(t) + ' (kode *' + t.kode + '*) sudah Kakak beli kembali pada ' + L.tgl(t.tgl_tebus || L.hariIni()) + ' seharga ' + L.rupiah(L.hargaTebus(t)) + '. Transaksi selesai ✅\n\nBukti: ' + L.urlPerjanjian(t.kode);
        },
        berakhir: function (t) {
            return 'Halo Kak ' + t.nama + ', masa membeli kembali gitar ' + gitarTebus(t) + ' (kode *' + t.kode + '*) telah berakhir pada ' + L.tgl(t.batas_tebus) + '. Sesuai perjanjian, gitar kini sepenuhnya milik toko. Terima kasih atas kerja samanya 🙏\n\nPerjanjian: ' + L.urlPerjanjian(t.kode);
        }
    };
    L.rekeningTeks = function () { return (C.toko && C.toko.rekening || []).map(function (r) { return r.bank + ' ' + r.nomor + ' a.n. ' + r.atasNama; }).join(' / '); };
    /* ---------- penitipan gitar yang sudah selesai (dihitung dari tanggal status Selesai) ---------- */
    L.gratisHari = function () { return C.gratisTitipHari == null ? 14 : C.gratisTitipHari; };
    L.biayaTitip = function () { return C.biayaTitipPerHari == null ? 5000 : C.biayaTitipPerHari; };
    L.biayaTitipTeks = function () { return L.rupiah(L.biayaTitip()) + ' per hari'; };
    function hariAntara(a, b) { return Math.round((L.tglObj(b) - L.tglObj(a)) / 864e5); }
    function tambahHari(s, n) { var d = L.tglObj(s); d.setDate(d.getDate() + n); return L.tglStr(d); }
    L.hariAntara = hariAntara;
    /* keadaan penitipan: null bila belum selesai. lama = hari sejak selesai (sampai diambil atau hari ini) */
    L.titip = function (s, hariIni) {
        if (!s.tgl_selesai || !L.beres(s)) return null;
        var akhir = s.status === 'diambil' && s.tgl_diambil ? s.tgl_diambil : hariIni || L.hariIni(), lama = Math.max(0, hariAntara(s.tgl_selesai, akhir));
        var gratis = L.gratisHari(), hangus = C.garansiHangusHari || 30, lepas = C.penyimpananLamaHari || 90, hariBiaya = Math.max(0, lama - gratis);
        return {
            lama: lama, sisaGratis: Math.max(0, gratis - lama), hariBiaya: hariBiaya, biaya: hariBiaya * L.biayaTitip(),
            batasGratis: tambahHari(s.tgl_selesai, gratis), batasGaransi: tambahHari(s.tgl_selesai, hangus), batasLepas: tambahHari(s.tgl_selesai, lepas),
            garansiHangus: lama > hangus, lepas: lama > lepas
        };
    };
    L.batasGratis = function (s) { var t = s.status === 'selesai' && L.titip(s); return t ? t.batasGratis : null; };
    L.garansiHangus = function (s) { var t = L.titip(s); return !!(t && t.garansiHangus); };
    /* perlu dikirim pengingat ambil? hari ke-7 dan ke-12 (pengingatHari), lalu seminggu sekali setelah biaya berjalan */
    L.perluIngat = function (s, hariIni) {
        if (s.status !== 'selesai') return false;
        var t = L.titip(s, hariIni); if (!t) return false;
        var kini = hariIni || L.hariIni(), terakhir = (s.pengingat || []).slice(-1)[0] || '';
        var titik = (C.pengingatHari || [7, 12]).filter(function (d) { return t.lama >= d; });
        if (titik.length && terakhir < tambahHari(s.tgl_selesai, titik[titik.length - 1])) return true;
        return t.hariBiaya > 0 && (!terakhir || hariAntara(terakhir, kini) >= 7);
    };
    L.ketentuan = function () {
        return (C.ketentuan || []).map(function (k) {
            return k.replace('{dp}', L.dpPersen()).replace('{gratis}', L.gratisHari()).replace('{biaya}', L.biayaTitipTeks())
                .replace('{hangus}', C.garansiHangusHari || 30).replace('{lepas}', C.penyimpananLamaHari || 90);
        });
    };

    /* ---------- pesan WhatsApp ---------- */
    function gitarTeks(s) { return [s.gitar_jenis, s.gitar_merk].filter(Boolean).join(' ') || 'Kakak'; }
    function jasaTeks(items) { return (items || []).map(function (i) { return '• ' + i.nama + (i.qty > 1 ? ' ×' + i.qty : '') + ' – ' + L.rupiah(i.harga * (i.qty || 1)); }).join('\n'); }
    L.pesan = {
        tandaTerima: function (s) {
            var h = L.hitung(s, s.items, s.bayar), t = 'Halo Kak ' + s.nama + ', gitar ' + gitarTeks(s) + ' sudah kami terima di ' + (C.toko && C.toko.nama || 'Toko Gitar AYRI') + ' 🙏\n\n';
            t += 'Kode servis: *' + s.kode + '*\nTanggal masuk: ' + L.tgl(s.tgl_masuk) + '\n';
            if (s.estimasi) t += 'Estimasi selesai: ' + L.tgl(s.estimasi) + '\n';
            if (s.items && s.items.length) t += '\nPekerjaan:\n' + jasaTeks(s.items) + '\n';
            if (h.diskon) t += 'Diskon: ' + L.rupiah(-h.diskon) + '\n';
            t += '*Total: ' + L.rupiah(h.total) + '*\n';
            if (h.total) {
                t += '\nPengerjaan dimulai setelah pembayaran awal (DP ' + L.dpPersen() + '% jasa + part lunas): *' + L.rupiah(h.wajibAwal) + '*\n';
                if (h.dibayar) t += 'Sudah dibayar: ' + L.rupiah(h.dibayar) + (h.kurangAwal ? ' (kurang ' + L.rupiah(h.kurangAwal) + ')' : ' ✅') + '\n';
                if (h.kurangAwal) t += 'Transfer ke ' + L.rekeningTeks() + '\n';
            }
            t += '\nCek status & nota: ' + L.urlCek(s.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)';
            t += '\n\nKetentuan servis (DP, garansi, penitipan) tercantum di nota pada tautan di atas. Silakan tanyakan kalau ada yang kurang jelas.';
            return t;
        },
        update: function (s) {
            var t = 'Halo Kak ' + s.nama + ', update servis gitar ' + gitarTeks(s) + ' (kode *' + s.kode + '*):\n';
            t += 'Status: *' + L.STATUS[s.status].label + '*\n';
            if (s.estimasi && !L.beres(s)) t += 'Estimasi selesai: ' + L.tgl(s.estimasi) + '\n';
            if (s.catatan_publik) t += '\n' + s.catatan_publik + '\n';
            return t + '\nDetail, foto, dan biaya: ' + L.urlCek(s.kode);
        },
        selesai: function (s) {
            var h = L.hitung(s, s.items, s.bayar), t = 'Halo Kak ' + s.nama + ', kabar baik! Gitar ' + gitarTeks(s) + ' (kode *' + s.kode + '*) sudah selesai dan bisa diambil ✅\n\n';
            t += h.sisa ? 'Sisa pembayaran: *' + L.rupiah(h.sisa) + '*\n(bisa tunai saat ambil atau transfer ke ' + L.rekeningTeks() + ')\n' : 'Pembayaran sudah lunas. Terima kasih!\n';
            var bg = L.batasGratis(s);
            if (bg) t += '\nGratis dititipkan sampai ' + L.tgl(bg) + '; setelah itu biaya penitipan ' + L.biayaTitipTeks() + '.\n';
            if (C.toko && C.toko.jam) t += '\nJam buka: ' + C.toko.jam + '\n';
            return t + '\nFoto hasil servis, saran dari kami, dan nota: ' + L.urlCek(s.kode);
        },
        /* pengingat gitar yang sudah selesai tapi belum diambil */
        pengingat: function (s) {
            var t = L.titip(s), h = L.hitung(s, s.items, s.bayar);
            var m = 'Halo Kak ' + s.nama + ', kami mengingatkan gitar ' + gitarTeks(s) + ' (kode *' + s.kode + '*) sudah selesai sejak ' + L.tgl(s.tgl_selesai) + ' dan bisa diambil di toko 🙏\n\n';
            if (!t.hariBiaya) m += 'Gratis dititipkan sampai *' + L.tgl(t.batasGratis) + '*' + (t.sisaGratis ? ' (' + t.sisaGratis + ' hari lagi)' : ' (hari ini terakhir)') + '. Setelah itu biaya penitipan ' + L.biayaTitipTeks() + '.\n';
            else m += 'Masa gratis penitipan sudah lewat sejak ' + L.tgl(t.batasGratis) + '. Biaya penitipan sampai hari ini: ' + t.hariBiaya + ' hari × ' + L.rupiah(L.biayaTitip()) + ' = *' + L.rupiah(t.biaya) + '*.\n';
            m += t.garansiHangus ? 'Garansi servis sudah hangus karena gitar belum diambil lebih dari ' + (C.garansiHangusHari || 30) + ' hari.\n'
                : 'Garansi servis tetap berlaku bila gitar diambil paling lambat ' + L.tgl(t.batasGaransi) + '.\n';
            if (t.lama >= (C.garansiHangusHari || 30)) m += 'Mohon gitar diambil secepatnya; biaya penitipan terus bertambah setiap hari.\n';
            if (h.sisa) m += '\nSisa pembayaran servis: ' + L.rupiah(h.sisa) + '\n';
            if (C.toko && C.toko.jam) m += '\nJam buka: ' + C.toko.jam + '\n';
            return m + '\nDetail & nota: ' + L.urlCek(s.kode);
        },
        nota: function (s) {
            return 'Halo Kak ' + s.nama + ', berikut nota servis gitar ' + gitarTeks(s) + ' (kode *' + s.kode + '*):\n' + L.urlNota(s.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)\n\nTerima kasih sudah servis di ' + (C.toko && C.toko.nama || 'Toko Gitar AYRI') + ' 🎸';
        }
    };

    /* ---------- kompres foto di HP sebelum diunggah ---------- */
    function muatGambar(file) {
        return new Promise(function (ok, gagal) {
            var u = URL.createObjectURL(file), im = new Image();
            im.onload = function () { URL.revokeObjectURL(u); ok(im); };
            im.onerror = function () { URL.revokeObjectURL(u); gagal(new Error('Foto tidak bisa dibaca. Coba format JPG/PNG.')); };
            im.src = u;
        });
    }
    function keBlob(c, kualitas) {
        return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, 'image/webp', kualitas); }).then(function (b) {
            if (b && b.type === 'image/webp') return b;
            return new Promise(function (ok) { c.toBlob(function (b2) { ok(b2); }, 'image/jpeg', kualitas); }); /* Safari lama belum bisa membuat WebP */
        });
    }
    /* hasil: { besar, kecil } (sisi terpanjang 1440 px dan 400 px) */
    L.kompres = function (file) {
        var muat = window.createImageBitmap ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return muatGambar(file); }) : muatGambar(file);
        return muat.then(function (img) {
            function buat(sisi, q) {
                var w = img.width, h = img.height, k = Math.min(1, sisi / Math.max(w, h)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                return keBlob(c, q);
            }
            return Promise.all([buat(1440, 0.78), buat(400, 0.7)]).then(function (r) { if (img.close) img.close(); return { besar: r[0], kecil: r[1] }; });
        });
    };

    /* ================= kriptografi (WebCrypto) ================= */
    var te = new TextEncoder(), td = new TextDecoder();
    function b64(buf) { var s = '', b = new Uint8Array(buf); for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
    function unb64(s) { var bin = atob(s), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
    function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
    function acakHex(n) { var r = new Uint8Array(n); crypto.getRandomValues(r); return hex(r); }
    L._b64 = b64; L._unb64 = unb64;
    function aes(raw, pakai) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, pakai || ['encrypt', 'decrypt']); }
    function enkripsi(key, data) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data).then(function (ct) { var out = new Uint8Array(12 + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), 12); return out; });
    }
    function dekripsi(key, data) { data = new Uint8Array(data); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12) }, key, data.subarray(12)); }
    function pbkdf2(teks, garam, putaran, bit) {
        return crypto.subtle.importKey('raw', te.encode(teks), 'PBKDF2', false, ['deriveBits'])
            .then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: typeof garam === 'string' ? te.encode(garam) : garam, iterations: putaran, hash: 'SHA-256' }, k, bit); });
    }
    /* kunci satu servis: nama file publik + kunci AES, dari kode + 4 digit HP (dibuat lambat supaya sulit ditebak) */
    var kunciCache = {};
    L.kunciServis = function (kode, hp4) {
        var k = String(kode).trim().toUpperCase() + '|' + String(hp4).trim();
        if (!kunciCache[k]) kunciCache[k] = pbkdf2(k, 'ayri-servis-v1', 150000, 512).then(function (bits) {
            return aes(bits.slice(32, 64)).then(function (key) { return { id: hex(bits.slice(0, 12)), key: key }; });
        });
        return kunciCache[k];
    };
    function kunciFoto(fk) { return aes(unb64(fk)); }

    /* ================= halaman publik: cek status & nota ================= */
    var fotoCache = {};
    L.api = {};
    L.api.cekPublik = function (kode, hp4, jenis) {
        return L.kunciServis(kode, hp4).then(function (k) {
            return fetch('data/' + (jenis || 'servis') + '/' + k.id + '.json', { cache: 'no-store' }).then(function (r) {
                if (r.status === 404) return null;
                if (!r.ok) throw new Error('Gagal memuat (' + r.status + ')');
                return r.json().then(function (j) { return dekripsi(k.key, unb64(j.d)); }).then(function (buf) { return JSON.parse(td.decode(buf)); });
            });
        });
    };
    /* foto pelanggan: diunduh terenkripsi lalu dibuka di HP pelanggan */
    L.api.fotoPublik = function (s, f, besar) {
        var file = besar ? f.file : (f.thumb || f.file), c = 'p:' + file;
        if (!fotoCache[c]) fotoCache[c] = fetch('data/foto/' + file).then(function (r) { if (!r.ok) throw new Error('Foto belum tersedia'); return r.arrayBuffer(); })
            .then(function (buf) { return kunciFoto(s.fk).then(function (key) { return dekripsi(key, buf); }); })
            .then(function (b) { return URL.createObjectURL(new Blob([b], { type: f.tipe || 'image/webp' })); });
        return fotoCache[c];
    };
    /* isi semua <img data-foto="i"> di dalam el dengan foto terdekripsi */
    L.isiFoto = function (el, s, ambil) {
        [].forEach.call(el.querySelectorAll('img[data-foto]'), function (img) {
            var f = s.foto[+img.dataset.foto]; if (!f) return;
            (ambil || L.api.fotoPublik)(s, f, false).then(function (u) { img.src = u; }, function () { img.alt = 'Foto belum tersedia'; img.classList.add('ly-nofoto'); });
        });
    };

    /* ================= admin: GitHub sebagai tempat data ================= */
    var G = C.github || {}, CABANG = G.cabang || 'main', RAW = 'application/vnd.github.raw+json';
    var KUNCI_TOKEN = 'ayri-admin-token', KUNCI_SESI = 'ayri-admin-sesi';
    var token = null;
    try { token = sessionStorage.getItem(KUNCI_SESI); } catch (e) {}
    L.siapAdmin = !!(G.pemilik && G.repoSitus && G.repoData);

    function pesanGh(status, teks) {
        if (status === 401) return 'Token GitHub ditolak (salah atau sudah kedaluwarsa). Buat token baru (panduan langkah 2), lalu pasang ulang di admin.';
        if (status === 403 && /rate limit/i.test(teks)) return 'Batas akses GitHub tercapai. Tunggu beberapa menit.';
        if (status === 403) return 'Token tidak punya izin menulis. Pastikan izin Contents: Read and write untuk kedua repo.';
        if (status === 404) return 'Repo tidak ditemukan, atau token tidak diberi akses ke repo itu.';
        if (status === 409) return 'Repo masih kosong.';
        return 'GitHub error ' + status + ': ' + String(teks).slice(0, 160);
    }
    function gh(method, path, body, accept) {
        if (!token) return Promise.reject(new Error('Admin terkunci. Masukkan PIN lagi.'));
        var h = { Authorization: 'Bearer ' + token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
        if (body) h['Content-Type'] = 'application/json';
        return fetch('https://api.github.com/repos/' + path, { method: method, cache: 'no-store', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
            if (r.ok) return accept ? r : r.status === 204 ? null : r.json();
            return r.text().then(function (t) { var e = new Error(pesanGh(r.status, t)); e.status = r.status; e.detail = t; throw e; });
        });
    }
    function repo(jenis) { return G.pemilik + '/' + (jenis === 'data' ? G.repoData : G.repoSitus); }
    function jalur(p) { return p.split('/').map(encodeURIComponent).join('/'); }
    function bacaFile(jenis, p, biner) {
        return gh('GET', repo(jenis) + '/contents/' + jalur(p) + '?ref=' + CABANG, null, RAW)
            .then(function (r) { return biner ? r.arrayBuffer() : r.text(); }, function (e) { if (e.status === 404) return null; throw e; });
    }
    /* beberapa file sekaligus dalam SATU commit (Git Data API) supaya situs hanya dibangun ulang sekali */
    function commit(jenis, files, pesan) {
        var rp = repo(jenis);
        return Promise.all(files.map(function (f) {
            if (f.hapus) return null;
            return gh('POST', rp + '/git/blobs', { content: f.base64 != null ? f.base64 : b64(te.encode(f.teks)), encoding: 'base64' }).then(function (b) { return b.sha; });
        })).then(function (sha) {
            function coba(n, tanpaHapus) {
                return gh('GET', rp + '/git/ref/heads/' + CABANG).catch(function (e) {
                    if ((e.status === 409 || e.status === 404) && n < 2) return gh('PUT', rp + '/contents/README.md', { message: 'Mulai repo', content: b64(te.encode('Data layanan Toko Gitar AYRI\n')), branch: CABANG }).then(function () { return gh('GET', rp + '/git/ref/heads/' + CABANG); });
                    throw e;
                }).then(function (ref) {
                    var kepala = ref.object.sha;
                    return gh('GET', rp + '/git/commits/' + kepala).then(function (c) {
                        var pohon = [];
                        files.forEach(function (f, i) { if (!f.hapus) pohon.push({ path: f.path, mode: '100644', type: 'blob', sha: sha[i] }); else if (!tanpaHapus) pohon.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); });
                        return gh('POST', rp + '/git/trees', { base_tree: c.tree.sha, tree: pohon });
                    }).then(function (t) { return gh('POST', rp + '/git/commits', { message: pesan, tree: t.sha, parents: [kepala] }); })
                        .then(function (nc) { return gh('PATCH', rp + '/git/refs/heads/' + CABANG, { sha: nc.sha }).then(function () { return nc.sha; }); });
                }).catch(function (e) {
                    if (e.status === 422 && /tree|path/i.test(e.detail || '') && !tanpaHapus) return coba(n, true); /* file yang mau dihapus ternyata sudah tidak ada */
                    if (e.status === 422 && n < 3) return coba(n + 1, tanpaHapus); /* ada commit lain di saat yang sama: ulangi */
                    throw e;
                });
            }
            return coba(0, false);
        });
    }
    L._gh = { commit: commit, bacaFile: bacaFile };

    /* ---------- token: disimpan di perangkat ini, dikunci PIN ---------- */
    function kunciPin(pin, garam) { return pbkdf2('ayri-pin|' + pin, garam, 200000, 256).then(function (b) { return aes(b); }); }
    L.api.adaToken = function () { try { return !!localStorage.getItem(KUNCI_TOKEN); } catch (e) { return false; } };
    L.api.terbuka = function () { return !!token; };
    L.api.pasangToken = function (tokenBaru, pin) {
        tokenBaru = String(tokenBaru || '').trim(); token = tokenBaru;
        return Promise.all([gh('GET', repo('data')), gh('GET', repo('situs'))]).then(function (r) {
            if (!r[0].private) throw new Error('Repo data "' + G.repoData + '" masih PUBLIK. Ubah jadi Private dulu (Settings → Danger Zone → Change visibility).');
            var garam = crypto.getRandomValues(new Uint8Array(16));
            return kunciPin(pin, garam).then(function (k) { return enkripsi(k, te.encode(tokenBaru)); }).then(function (ct) {
                localStorage.setItem(KUNCI_TOKEN, JSON.stringify({ v: 1, g: b64(garam), d: b64(ct), dibuat: L.hariIni() }));
                try { sessionStorage.setItem(KUNCI_SESI, tokenBaru); } catch (e) {}
            });
        }).catch(function (e) { token = null; throw e; });
    };
    L.api.buka = function (pin) {
        var s = JSON.parse(localStorage.getItem(KUNCI_TOKEN) || 'null'); if (!s) return Promise.reject(new Error('Token belum dipasang.'));
        return kunciPin(pin, unb64(s.g)).then(function (k) { return dekripsi(k, unb64(s.d)); })
            .then(function (b) { token = td.decode(b); try { sessionStorage.setItem(KUNCI_SESI, token); } catch (e) {} }, function () { throw new Error('PIN salah.'); });
    };
    L.api.tokenDibuat = function () { try { return JSON.parse(localStorage.getItem(KUNCI_TOKEN) || '{}').dibuat || ''; } catch (e) { return ''; } };
    L.api.kunci = function () { token = null; try { sessionStorage.removeItem(KUNCI_SESI); } catch (e) {} return Promise.resolve(); };
    L.api.lupakan = function () { L.api.kunci(); try { localStorage.removeItem(KUNCI_TOKEN); } catch (e) {} return Promise.resolve(); };

    /* ---------- data servis & artikel (repo privat) ---------- */
    var data = { servis: [], artikel: [], tebus: [], stok: [] };
    function salin(o) { return JSON.parse(JSON.stringify(o)); }
    function bacaJson(nama) { return bacaFile('data', nama).then(function (t) { return t ? JSON.parse(t) : []; }); }
    L.api.muat = function () {
        return Promise.all([bacaJson('servis.json'), bacaJson('artikel.json'), bacaJson('tebus.json'), bacaJson('stok.json')]).then(function (r) { data.servis = r[0]; data.artikel = r[1]; data.tebus = r[2]; data.stok = r[3]; return salin(data); });
    };
    /* simpan satu catatan ke file daftar: baca versi terbaru dulu supaya perubahan dari perangkat lain tidak tertimpa.
       file lain di repo data (mis. foto tebus) ikut dalam commit yang sama */
    function simpanDaftar(nama, rec, hapus, tambahan) {
        return bacaJson(nama).then(function (list) {
            list = list.filter(function (x) { return x.id !== rec.id; });
            if (!hapus) list.unshift(rec);
            list.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
            return commit('data', [{ path: nama, teks: JSON.stringify(list, null, 1) + '\n' }].concat(tambahan || []), (hapus ? 'Hapus ' : 'Simpan ') + (rec.kode || rec.slug || rec.id)).then(function () { data[nama.replace('.json', '')] = list; return list; });
        });
    }
    function sebelumnya(id) { return data.servis.filter(function (x) { return x.id === id; })[0] || null; }

    /* isi yang boleh dilihat pelanggan (dienkripsi sebelum diunggah ke situs) */
    function versiPublik(s) {
        var beres = L.beres(s), foto = (s.foto || []).filter(function (f) { return f.tampil && (f.tahap !== 'sesudah' || beres); });
        return {
            kode: s.kode, nama: s.nama, hp_samar: '••••' + L.hp4(s.hp), tgl_masuk: s.tgl_masuk, gitar_jenis: s.gitar_jenis, gitar_merk: s.gitar_merk,
            keluhan: s.keluhan, status: s.status, estimasi: s.estimasi || null, tgl_selesai: s.tgl_selesai || null, tgl_diambil: s.tgl_diambil || null,
            diskon: s.diskon || 0, catatan_publik: s.catatan_publik || '', saran: beres ? s.saran || '' : '',
            items: (s.items || []).map(function (i) { return { jenis: i.jenis, nama: i.nama, harga: i.harga, qty: i.qty, garansi: i.garansi || '', garansi_syarat: i.garansi_syarat || '' }; }),
            bayar: (s.bayar || []).map(function (b) { return { tgl: b.tgl, jumlah: b.jumlah, jenis: b.jenis, metode: b.metode }; }),
            foto: foto.map(function (f) { return { tahap: f.tahap, file: f.file, thumb: f.thumb, tipe: f.tipe, keterangan: f.keterangan || '' }; }),
            fk: foto.length ? s.fk : undefined, diperbarui: s.updated_at
        };
    }
    function tanggalOtomatis(s) {
        var t = L.hariIni();
        if (L.beres(s) && !s.tgl_selesai) s.tgl_selesai = t;
        if (s.status === 'diambil' && !s.tgl_diambil) s.tgl_diambil = t;
    }

    /* simpan servis: (1) foto + versi publik terenkripsi ke situs dalam satu commit, (2) data lengkap ke repo privat */
    L.api.simpanServis = function (rec, fotoBaru) {
        rec = salin(rec); fotoBaru = fotoBaru || [];
        var baru = !rec.id, lama = baru ? null : sebelumnya(rec.id), sekarang = new Date().toISOString(), files = [];
        if (baru) {
            var dipakai = data.servis.map(function (x) { return x.kode; });
            do { rec.kode = L.kodeBaru(); } while (dipakai.indexOf(rec.kode) > -1);
            rec.id = crypto.randomUUID ? crypto.randomUUID() : acakHex(16); rec.created_at = sekarang;
        }
        if (!rec.fk) rec.fk = b64(crypto.getRandomValues(new Uint8Array(32)));
        rec.items = rec.items || []; rec.bayar = rec.bayar || []; rec.foto = rec.foto || [];
        rec.updated_at = sekarang; tanggalOtomatis(rec);
        return kunciFoto(rec.fk).then(function (fkey) {
            return fotoBaru.reduce(function (p, fb) {
                return p.then(function () {
                    var nama = acakHex(12);
                    return Promise.all([fb.hasil.besar.arrayBuffer(), fb.hasil.kecil.arrayBuffer()]).then(function (buf) {
                        return Promise.all([enkripsi(fkey, buf[0]), enkripsi(fkey, buf[1])]);
                    }).then(function (ct) {
                        files.push({ path: 'data/foto/' + nama + '.bin', base64: b64(ct[0]) }, { path: 'data/foto/' + nama + '-k.bin', base64: b64(ct[1]) });
                        rec.foto.push({ id: nama, tahap: fb.tahap, file: nama + '.bin', thumb: nama + '-k.bin', tipe: fb.hasil.besar.type, keterangan: fb.keterangan || '', tampil: fb.tampil !== false, created_at: sekarang });
                    });
                });
            }, Promise.resolve());
        }).then(function () {
            /* foto yang dihapus di admin */
            if (lama) (lama.foto || []).forEach(function (f) {
                if (!rec.foto.some(function (x) { return x.id === f.id; })) files.push({ path: 'data/foto/' + f.file, hapus: true }, { path: 'data/foto/' + f.thumb, hapus: true });
            });
            return L.kunciServis(rec.kode, L.hp4(rec.hp));
        }).then(function (k) {
            if (lama && lama.pubId && lama.pubId !== k.id) files.push({ path: 'data/servis/' + lama.pubId + '.json', hapus: true });
            if (rec.status === 'batal') { if (lama && lama.pubId === k.id) files.push({ path: 'data/servis/' + k.id + '.json', hapus: true }); rec.pubId = null; return; }
            rec.pubId = k.id;
            return enkripsi(k.key, te.encode(JSON.stringify(versiPublik(rec)))).then(function (ct) { files.push({ path: 'data/servis/' + k.id + '.json', teks: JSON.stringify({ v: 1, d: b64(ct) }) }); });
        }).then(function () {
            return files.length ? commit('situs', files, 'Servis: perbarui data pelanggan') : null;
        }).then(function () {
            return simpanDaftar('servis.json', rec).catch(function (e) { e.sebagian = true; e.rec = rec; e.message = 'Halaman pelanggan sudah diperbarui, tapi data utama gagal disimpan: ' + e.message + ' Tekan Simpan sekali lagi.'; throw e; });
        }).then(function () { return salin(rec); });
    };
    L.api.hapusServis = function (rec) {
        var files = [];
        (rec.foto || []).forEach(function (f) { files.push({ path: 'data/foto/' + f.file, hapus: true }, { path: 'data/foto/' + f.thumb, hapus: true }); });
        if (rec.pubId) files.push({ path: 'data/servis/' + rec.pubId + '.json', hapus: true });
        return (files.length ? commit('situs', files, 'Servis: hapus data pelanggan') : Promise.resolve()).then(function () { return simpanDaftar('servis.json', rec, true); });
    };
    /* foto untuk admin: dibaca langsung dari repo (tidak perlu menunggu situs diperbarui) */
    L.api.fotoAdmin = function (s, f, besar) {
        var file = besar ? f.file : (f.thumb || f.file), c = 'a:' + file;
        /* foto tebus (gitar & KTP) hanya ada di repo PRIVAT; foto servis di repo situs */
        if (!fotoCache[c]) fotoCache[c] = (f.repo === 'data' ? bacaFile('data', 'foto/' + file, true) : bacaFile('situs', 'data/foto/' + file, true)).then(function (buf) {
            if (!buf) throw new Error('Foto tidak ditemukan');
            return kunciFoto(s.fk).then(function (key) { return dekripsi(key, buf); });
        }).then(function (b) { return URL.createObjectURL(new Blob([b], { type: f.tipe || 'image/webp' })); });
        fotoCache[c].catch(function () { delete fotoCache[c]; });
        return fotoCache[c];
    };
    L.api.cadangan = function () { return salin(data); };

    /* ---------- beli dengan hak tebus ----------
       Data lengkap + foto (gitar & KTP) hanya di repo PRIVAT (satu commit).
       Surat perjanjian untuk penjual disimpan terenkripsi di situs (data/tebus), dibuka dengan kode + 4 digit HP. */
    function versiPerjanjian(t) {
        return {
            kode: t.kode, nama: t.nama, hp_samar: '••••' + L.hp4(t.hp), nik_samar: t.nik ? '••••••••••••' + String(t.nik).replace(/\D/g, '').slice(-4) : '',
            gitar_jenis: t.gitar_jenis, gitar_merk: t.gitar_merk, warna: t.warna || '', no_seri: t.no_seri || '', kelengkapan: t.kelengkapan || '',
            tgl_beli: t.tgl_beli, harga_beli: t.harga_beli, batas_tebus: t.batas_tebus, metode: t.metode,
            status: t.status, tgl_tebus: t.tgl_tebus || null, tgl_berakhir: t.tgl_berakhir || null, disetujui: t.disetujui || null, diperbarui: t.updated_at
        };
    }
    L.api.simpanTebus = function (rec, fotoBaru) {
        rec = salin(rec); fotoBaru = fotoBaru || [];
        var baru = !rec.id, lama = baru ? null : data.tebus.filter(function (x) { return x.id === rec.id; })[0] || null, sekarang = new Date().toISOString(), filesData = [];
        if (baru) {
            var dipakai = data.tebus.map(function (x) { return x.kode; });
            do { rec.kode = L.kodeBaru('TBS'); } while (dipakai.indexOf(rec.kode) > -1);
            rec.id = crypto.randomUUID ? crypto.randomUUID() : acakHex(16); rec.created_at = sekarang;
        }
        if (!rec.fk) rec.fk = b64(crypto.getRandomValues(new Uint8Array(32)));
        rec.foto = rec.foto || []; rec.updated_at = sekarang;
        if (rec.status === 'ditebus' && !rec.tgl_tebus) rec.tgl_tebus = L.hariIni();
        if (rec.status === 'milik_toko' && !rec.tgl_berakhir) rec.tgl_berakhir = L.hariIni();
        return kunciFoto(rec.fk).then(function (fkey) {
            return fotoBaru.reduce(function (p, fb) {
                return p.then(function () {
                    var nama = acakHex(12);
                    return Promise.all([fb.hasil.besar.arrayBuffer(), fb.hasil.kecil.arrayBuffer()]).then(function (buf) { return Promise.all([enkripsi(fkey, buf[0]), enkripsi(fkey, buf[1])]); }).then(function (ct) {
                        filesData.push({ path: 'foto/' + nama + '.bin', base64: b64(ct[0]) }, { path: 'foto/' + nama + '-k.bin', base64: b64(ct[1]) });
                        rec.foto.push({ id: nama, tahap: fb.tahap, file: nama + '.bin', thumb: nama + '-k.bin', tipe: fb.hasil.besar.type, repo: 'data', created_at: sekarang });
                    });
                });
            }, Promise.resolve());
        }).then(function () {
            if (lama) (lama.foto || []).forEach(function (f) {
                if (!rec.foto.some(function (x) { return x.id === f.id; })) filesData.push({ path: 'foto/' + f.file, hapus: true }, { path: 'foto/' + f.thumb, hapus: true });
            });
            return L.kunciServis(rec.kode, L.hp4(rec.hp));
        }).then(function (k) {
            var filesSitus = [];
            if (lama && lama.pubId && lama.pubId !== k.id) filesSitus.push({ path: 'data/tebus/' + lama.pubId + '.json', hapus: true });
            var tulis = rec.status === 'batal' ? Promise.resolve(null) : enkripsi(k.key, te.encode(JSON.stringify(versiPerjanjian(rec))));
            return tulis.then(function (ct) {
                if (ct) { rec.pubId = k.id; filesSitus.push({ path: 'data/tebus/' + k.id + '.json', teks: JSON.stringify({ v: 1, d: b64(ct) }) }); }
                else { if (lama && lama.pubId === k.id) filesSitus.push({ path: 'data/tebus/' + k.id + '.json', hapus: true }); rec.pubId = null; }
                /* data privat dulu (sumber utama), lalu surat perjanjian di situs */
                return simpanDaftar('tebus.json', rec, false, filesData).then(function () { return filesSitus.length ? commit('situs', filesSitus, 'Tebus: perbarui surat perjanjian') : null; })
                    .catch(function (e) { if (data.tebus.some(function (x) { return x.id === rec.id && x.updated_at === rec.updated_at; })) { e.sebagian = true; e.rec = rec; e.message = 'Data tersimpan, tapi surat perjanjian di situs belum diperbarui: ' + e.message + ' Tekan Simpan sekali lagi.'; } throw e; });
            });
        }).then(function () { return salin(rec); });
    };
    L.api.hapusTebus = function (rec) {
        var filesData = [];
        (rec.foto || []).forEach(function (f) { filesData.push({ path: 'foto/' + f.file, hapus: true }, { path: 'foto/' + f.thumb, hapus: true }); });
        return (rec.pubId ? commit('situs', [{ path: 'data/tebus/' + rec.pubId + '.json', hapus: true }], 'Tebus: hapus surat perjanjian') : Promise.resolve())
            .then(function () { return simpanDaftar('tebus.json', rec, true, filesData); });
    };

    /* ---------- stok gitar (baru & bekas): hanya di repo PRIVAT (stok.json + foto terenkripsi) ---------- */
    L.KONDISI = { baru: 'Baru', bekas: 'Bekas' };
    L.STATUS_STOK = { tersedia: 'Tersedia', dipesan: 'Dipesan', terjual: 'Terjual', ditarik: 'Ditarik' };
    L.untungStok = function (s) {
        var jual = 0, untung = 0, unit = 0;
        (s.penjualan || []).forEach(function (p) { jual += p.harga * p.qty; untung += (p.harga - (+s.harga_beli || 0)) * p.qty; unit += p.qty; });
        return { unitTerjual: unit, omzet: jual, untung: untung, potensi: (+s.jumlah || 0) * ((+s.harga_jual || 0) - (+s.harga_beli || 0)) };
    };
    /* foto (data mentah) untuk dipindahkan, mis. dari tebus ke stok */
    L.api.fotoBlob = function (s, f, besar) {
        return (f.repo === 'data' ? bacaFile('data', 'foto/' + (besar ? f.file : f.thumb || f.file), true) : bacaFile('situs', 'data/foto/' + (besar ? f.file : f.thumb || f.file), true))
            .then(function (buf) { if (!buf) throw new Error('Foto tidak ditemukan'); return kunciFoto(s.fk).then(function (k) { return dekripsi(k, buf); }); })
            .then(function (b) { return new Blob([b], { type: f.tipe || 'image/webp' }); });
    };
    L.api.simpanStok = function (rec, fotoBaru) {
        rec = salin(rec); fotoBaru = fotoBaru || [];
        var baru = !rec.id, lama = baru ? null : data.stok.filter(function (x) { return x.id === rec.id; })[0] || null, sekarang = new Date().toISOString(), files = [];
        if (baru) {
            var dipakai = data.stok.map(function (x) { return x.kode; });
            do { rec.kode = L.kodeBaru('STK'); } while (dipakai.indexOf(rec.kode) > -1);
            rec.id = crypto.randomUUID ? crypto.randomUUID() : acakHex(16); rec.created_at = sekarang;
        }
        if (!rec.fk) rec.fk = b64(crypto.getRandomValues(new Uint8Array(32)));
        rec.foto = rec.foto || []; rec.penjualan = rec.penjualan || []; rec.updated_at = sekarang;
        if (rec.status !== 'ditarik') rec.status = +rec.jumlah > 0 ? (rec.status === 'dipesan' ? 'dipesan' : 'tersedia') : 'terjual';
        return kunciFoto(rec.fk).then(function (fkey) {
            return fotoBaru.reduce(function (p, fb) {
                return p.then(function () {
                    var nama = acakHex(12);
                    return Promise.all([fb.hasil.besar.arrayBuffer(), fb.hasil.kecil.arrayBuffer()]).then(function (buf) { return Promise.all([enkripsi(fkey, buf[0]), enkripsi(fkey, buf[1])]); }).then(function (ct) {
                        files.push({ path: 'foto/' + nama + '.bin', base64: b64(ct[0]) }, { path: 'foto/' + nama + '-k.bin', base64: b64(ct[1]) });
                        rec.foto.push({ id: nama, tahap: 'gitar', file: nama + '.bin', thumb: nama + '-k.bin', tipe: fb.hasil.besar.type, repo: 'data', created_at: sekarang });
                    });
                });
            }, Promise.resolve());
        }).then(function () {
            if (lama) (lama.foto || []).forEach(function (f) {
                if (!rec.foto.some(function (x) { return x.id === f.id; })) files.push({ path: 'foto/' + f.file, hapus: true }, { path: 'foto/' + f.thumb, hapus: true });
            });
            return simpanDaftar('stok.json', rec, false, files);
        }).then(function () { return salin(rec); });
    };
    L.api.hapusStok = function (rec) {
        var files = [];
        (rec.foto || []).forEach(function (f) { files.push({ path: 'foto/' + f.file, hapus: true }, { path: 'foto/' + f.thumb, hapus: true }); });
        return simpanDaftar('stok.json', rec, true, files);
    };

    /* ---------- artikel ---------- */
    L.api.simpanArtikel = function (art) {
        art = salin(art); var sekarang = new Date().toISOString(), lama = data.artikel.filter(function (x) { return x.id === art.id; })[0] || null;
        if (data.artikel.some(function (x) { return x.slug === art.slug && x.id !== art.id; })) { var e = new Error('Alamat halaman sudah dipakai artikel lain.'); e.code = 'slug'; return Promise.reject(e); }
        if (!art.id) { art.id = crypto.randomUUID ? crypto.randomUUID() : acakHex(16); art.created_at = sekarang; }
        art.updated_at = sekarang;
        if (art.status === 'terbit' && !art.terbit_at) art.terbit_at = sekarang;
        var perluSitus = art.status === 'terbit' || (lama && lama.status === 'terbit');
        return (perluSitus ? terbitkan(art, lama) : Promise.resolve()).then(function () { return simpanDaftar('artikel.json', art); }).then(function () { return salin(art); });
    };
    L.api.hapusArtikel = function (art) {
        var lama = data.artikel.filter(function (x) { return x.id === art.id; })[0];
        return (lama && lama.status === 'terbit' ? terbitkan(Object.assign({}, lama, { status: 'draf' }), lama) : Promise.resolve()).then(function () { return simpanDaftar('artikel.json', art, true); });
    };
    /* foto artikel bersifat publik (tidak dienkripsi) */
    L.api.unggahFotoArtikel = function (hasil) {
        var p = 'foto/artikel/' + acakHex(10) + (hasil.besar.type === 'image/webp' ? '.webp' : '.jpg');
        return hasil.besar.arrayBuffer().then(function (buf) { return commit('situs', [{ path: p, base64: b64(buf) }], 'Artikel: unggah foto'); }).then(function () {
            fotoCache['u:' + p] = Promise.resolve(URL.createObjectURL(hasil.besar));
            return p;
        });
    };
    L.api.fotoArtikel = function (f) {
        if (f.path) return fotoCache['u:' + f.path] || Promise.resolve(f.path);
        var s = data.servis.filter(function (x) { return x.id === f.servis; })[0], ff = s && (s.foto || []).filter(function (x) { return x.id === f.foto; })[0];
        return ff ? L.api.fotoAdmin(s, ff, false) : Promise.reject(new Error('Foto servis tidak ditemukan'));
    };
    /* tulis/hapus halaman artikel + perbarui kartu di beranda dan sitemap, semuanya dalam satu commit */
    function terbitkan(art, lama) {
        var B = window.ArtikelBuilder, files = [], tampil = art.status === 'terbit';
        return Promise.all([bacaFile('situs', 'scripts/artikel-template.html'), bacaFile('situs', 'index.html'), bacaFile('situs', 'sitemap.xml'),
            tampil ? bacaFile('situs', 'artikel-' + art.slug + '.html') : null]).then(function (r) {
            var tpl = r[0], beranda = r[1], peta = r[2], ada = r[3];
            if (!tpl || !beranda || !peta) throw new Error('File template/beranda/sitemap tidak ditemukan di repo situs.');
            if (ada && ada.indexOf(B.PENANDA) < 0) throw new Error('Alamat artikel-' + art.slug + '.html sudah dipakai halaman buatan tangan. Ganti alamatnya.');
            /* foto dari servis (terenkripsi) disalin jadi foto publik saat pertama terbit */
            return (tampil ? (art.foto || []).reduce(function (p, f, i) {
                return p.then(function () {
                    if (f.path) return;
                    var s = data.servis.filter(function (x) { return x.id === f.servis; })[0], ff = s && (s.foto || []).filter(function (x) { return x.id === f.foto; })[0];
                    if (!ff) throw new Error('Foto servis untuk artikel tidak ditemukan.');
                    return bacaFile('situs', 'data/foto/' + ff.file, true).then(function (buf) { return kunciFoto(s.fk).then(function (k) { return dekripsi(k, buf); }); }).then(function (b) {
                        var p2 = 'foto/artikel/' + acakHex(10) + (ff.tipe === 'image/jpeg' ? '.jpg' : '.webp');
                        files.push({ path: p2, base64: b64(b) }); art.foto[i] = { path: p2, alt: f.alt || '' };
                    });
                });
            }, Promise.resolve()) : Promise.resolve()).then(function () {
                if (lama && lama.status === 'terbit' && lama.slug !== art.slug) files.push({ path: 'artikel-' + lama.slug + '.html', hapus: true });
                if (tampil) files.push({ path: 'artikel-' + art.slug + '.html', teks: B.halaman(tpl, art, L.situs()) });
                else if (lama) files.push({ path: 'artikel-' + lama.slug + '.html', hapus: true });
                var semua = data.artikel.filter(function (x) { return x.id !== art.id && x.status === 'terbit'; }).concat(tampil ? [art] : [])
                    .sort(function (a, b) { return a.terbit_at < b.terbit_at ? 1 : -1; });
                files.push({ path: 'index.html', teks: B.gantiBlok(beranda, semua.slice(0, 12).map(B.kartu).join('\n'), 'index.html') });
                files.push({ path: 'sitemap.xml', teks: B.gantiBlok(peta, semua.map(function (a) { return B.entriSitemap(a, L.situs()); }).join('\n'), 'sitemap.xml') });
                return commit('situs', files, (tampil ? 'Artikel: terbitkan ' : 'Artikel: tarik ') + art.slug);
            });
        });
    }
})();
