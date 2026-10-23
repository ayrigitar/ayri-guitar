/* Layanan servis Toko Gitar AYRI, tanpa server.
   - Data lengkap (nama, HP, catatan) disimpan admin di repo GitHub PRIVAT (servis.json, artikel.json, tebus.json, stok.json).
   - Data untuk pelanggan disimpan di situs (data/servis, data/tebus, data/foto) dalam bentuk TERENKRIPSI:
     hanya bisa dibuka dengan kode + 4 digit terakhir HP pelanggan. Katalog stok (data/katalog.json, foto/stok) bersifat publik.
   Semua akses data lewat Layanan.api, supaya mudah diuji dan diganti. */
(function () {
    /* pengaturan dari layanan-config.js, dilengkapi nilai bawaan sekali di sini (yang tidak diisi memakai bawaan) */
    var BAWAAN = {
        dpJasaPersen: 50, bulatkanKe: 1000, gratisTitipHari: 14, biayaTitipPerHari: 5000, garansiHangusHari: 30, penyimpananLamaHari: 90,
        pengingatHari: [7, 12], katalogSisaTampil: 3, jenisGitar: ['Akustik'], kategoriAksesoris: ['Lainnya'], katalogJasa: [], ketentuan: [], syaratJatuh: '',
        github: {}, toko: { nama: 'Toko Gitar AYRI', alamat: '', jam: '', wa: '', rekening: [] },
        tebus: { batasHari: 30, maksHari: 90, pengingatHari: [7, 1], fotoKtpMinHarga: 1000000, hapusKtpHari: 90, ketentuan: [] },
        jual: { batasHari: 30, potonganPersen: 10, pengingatHari: [7, 1], ketentuan: [] }
    };
    function lengkapi(c, d) {
        Object.keys(d).forEach(function (k) {
            if (c[k] == null) c[k] = d[k];
            else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) lengkapi(c[k], d[k]);
        });
        return c;
    }
    var C = lengkapi(window.AYRI_LAYANAN || {}, BAWAAN), TB = C.tebus, E;
    var L = window.Layanan = { C: C }, salin = AYRI_UTIL.salin;

    /* ---------- tema (sama dengan situs) ---------- */
    try { if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {}

    /* ---------- format & tanggal ---------- */
    var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    E = L.esc = AYRI_UTIL.esc;
    L.rupiah = AYRI_UTIL.rupiah;
    /* tanggal disimpan 'YYYY-MM-DD'; dibaca sebagai tanggal lokal supaya tidak bergeser zona waktu */
    L.tglObj = function (s) { if (!s) return null; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    L.tglStr = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    L.hariIni = function () { return L.tglStr(new Date()); };
    L.tgl = function (s) { var d = L.tglObj(s); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : '–'; };
    L.tglPanjang = function (s) { var d = L.tglObj(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : '–'; };
    L.hariAntara = function (a, b) { return Math.round((L.tglObj(b) - L.tglObj(a)) / 864e5); };
    L.tambahHari = function (s, n) { var d = L.tglObj(s) || new Date(); d.setDate(d.getDate() + n); return L.tglStr(d); };
    L.namaGitar = function (s, cadangan) { return [s.gitar_jenis, s.gitar_merk].filter(Boolean).join(' ') || cadangan; };

    /* ---------- status ---------- */
    L.STATUS = {
        menunggu_dp: { label: 'Menunggu DP', ket: 'Gitar sudah kami terima. Pengerjaan dimulai setelah DP dan pembayaran part kami terima.' },
        antri: { label: 'Antri', ket: 'Pembayaran awal sudah kami terima. Gitar sedang menunggu giliran dikerjakan.' },
        dikerjakan: { label: 'Sedang dikerjakan', ket: '' },
        selesai: { label: 'Selesai – bisa diambil', ket: 'Gitar bisa diambil di toko.' },
        diambil: { label: 'Sudah diambil', ket: 'Terima kasih sudah servis di ' + C.toko.nama + '!' },
        batal: { label: 'Dibatalkan', ket: '' }
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
        var m = /^(\d+)([hb])$/.exec(g || ''); if (!m || !L.tglObj(mulai)) return null;
        if (m[2] === 'h') return L.tambahHari(mulai, +m[1]);
        var d = L.tglObj(mulai), tgl = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + +m[1]);
        d.setDate(Math.min(tgl, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
        return L.tglStr(d);
    };
    L.GARANSI_PILIHAN = [['', 'Tanpa garansi'], ['7h', '1 minggu'], ['14h', '2 minggu'], ['1b', '1 bulan'], ['3b', '3 bulan'], ['6b', '6 bulan'], ['12b', '1 tahun']];

    /* ---------- hitungan biaya ---------- */
    L.dpPersen = function () { return C.dpJasaPersen; };
    L.hitung = function (s, items, bayar) {
        var jasa = 0, part = 0, dibayar = 0, bulat = C.bulatkanKe;
        (items || []).forEach(function (i) { var v = (+i.harga || 0) * (+i.qty || 1); if (i.jenis === 'part') part += v; else jasa += v; });
        (bayar || []).forEach(function (b) { dibayar += +b.jumlah || 0; });
        var diskon = Math.min(+s.diskon || 0, jasa + part), jasaNet = Math.max(0, jasa - diskon), partNet = part - Math.max(0, diskon - jasa);
        var total = jasaNet + partNet;
        var wajib = Math.min(total, Math.ceil(jasaNet * C.dpJasaPersen / 100 / bulat) * bulat + partNet);
        return {
            jasa: jasa, part: part, diskon: diskon, total: total, wajibAwal: wajib, dibayar: dibayar,
            sisa: Math.max(0, total - dibayar), kurangAwal: Math.max(0, wajib - dibayar), lebih: Math.max(0, dibayar - total),
            lunas: total > 0 && dibayar >= total
        };
    };

    /* ---------- kode & tautan ---------- */
    var ABJAD = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; /* tanpa I, L, O, 0, 1 yang mudah tertukar */
    L.kodeBaru = function (awalan) {
        var s = (awalan || 'AYR') + '-', batas = 256 - 256 % ABJAD.length, r = new Uint8Array(32), i = r.length, n = 0, b;
        while (n < 6) { /* byte di atas batas dibuang supaya tiap huruf punya peluang sama */
            if (i >= r.length) { crypto.getRandomValues(r); i = 0; }
            b = r[i++]; if (b < batas) { s += ABJAD[b % ABJAD.length]; n++; }
        }
        return s;
    };
    L.hp4 = function (hp) { return String(hp || '').replace(/\D/g, '').slice(-4); };
    L.waNomor = function (hp) { var n = String(hp || '').replace(/\D/g, ''); if (n.charAt(0) === '0') n = '62' + n.slice(1); else if (n.charAt(0) === '8') n = '62' + n; return n; };
    L.waLink = function (hp, teks) { return 'https://wa.me/' + L.waNomor(hp) + '?text=' + encodeURIComponent(teks); };
    L.situs = function () { return (C.situsUrl || location.origin + '/').replace(/\/?$/, '/'); };
    L.urlCek = function (kode) { return L.situs() + 'cek-servis.html?k=' + encodeURIComponent(kode); };
    L.urlNota = function (kode) { return L.situs() + 'nota.html?k=' + encodeURIComponent(kode); };
    L.urlPerjanjian = function (kode) { return L.situs() + 'perjanjian.html?k=' + encodeURIComponent(kode); };
    L.rekeningTeks = function () { return C.toko.rekening.map(function (r) { return r.bank + ' ' + r.nomor + ' a.n. ' + r.atasNama; }).join(' / '); };
    function jamBuka() { return C.toko.jam ? '\nJam buka: ' + C.toko.jam + '\n' : ''; }

    /* ---------- beli dengan hak tebus ---------- */
    L.STATUS_TEBUS = { aktif: { label: 'Masa tebus' }, ditebus: { label: 'Sudah dibeli kembali' }, milik_toko: { label: 'Milik toko' }, batal: { label: 'Dibatalkan' } };
    L.hargaTebus = function (t) { return +t.harga_beli || 0; }; /* kebijakan toko: harga tebus = harga beli */
    /* sisa hari sampai batas tebus (negatif = sudah lewat) */
    L.infoTebus = function (t, hariIni) {
        var sisa = t.batas_tebus ? L.hariAntara(hariIni || L.hariIni(), t.batas_tebus) : null;
        return { sisa: sisa, lewat: sisa != null && sisa < 0, harga: L.hargaTebus(t) };
    };
    L.perluIngatTebus = function (t, hariIni) {
        if (t.status !== 'aktif' || !t.batas_tebus) return false;
        var i = L.infoTebus(t, hariIni), terakhir = (t.pengingat || []).slice(-1)[0] || '';
        if (i.lewat) return true; /* lewat batas: admin perlu memutuskan (jadikan milik toko / perpanjang) */
        return TB.pengingatHari.some(function (d) { return i.sisa <= d && terakhir < L.tambahHari(t.batas_tebus, -d); });
    };
    /* foto KTP: disarankan untuk harga besar; boleh dihapus setelah ditebus sekian hari, atau bila dibatalkan.
       Untuk gitar yang menjadi milik toko, KTP tetap disimpan sebagai bukti asal-usul barang. */
    L.adaKtp = function (t) { return (t.foto || []).some(function (f) { return f.tahap === 'ktp'; }); };
    L.ktpBisaDihapus = function (t, hariIni) {
        if (!L.adaKtp(t)) return false;
        if (t.status === 'batal') return true;
        return t.status === 'ditebus' && !!t.tgl_tebus && L.hariAntara(t.tgl_tebus, hariIni || L.hariIni()) >= TB.hapusKtpHari;
    };
    L.ketentuanTebus = function (t) {
        return TB.ketentuan.map(function (k) {
            return k.split('{batas}').join(L.tglPanjang(t.batas_tebus)).split('{tebus}').join(L.rupiah(L.hargaTebus(t)) + ' (sama dengan harga beli, tanpa biaya tambahan)');
        });
    };
    L.pesanTebus = {
        konfirmasi: function (t) {
            return 'Halo Kak ' + t.nama + ', berikut bukti pembelian gitar ' + L.namaGitar(t, 'gitar') + (t.no_seri ? ' (no. seri ' + t.no_seri + ')' : '') + ' oleh ' + C.toko.nama + ' dengan hak membeli kembali:\n\n' +
                '• Kode: *' + t.kode + '*\n• Tanggal beli: ' + L.tgl(t.tgl_beli) + '\n• Harga beli: *' + L.rupiah(t.harga_beli) + '*\n' +
                '• Kakak boleh membeli kembali sampai *' + L.tgl(t.batas_tebus) + '* dengan harga *' + L.rupiah(L.hargaTebus(t)) + '*\n\n' +
                'Surat perjanjian lengkap: ' + L.urlPerjanjian(t.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)\n\n' +
                'Mohon balas *SETUJU* bila data dan ketentuannya sudah sesuai. Terima kasih 🙏';
        },
        pengingat: function (t) {
            var i = L.infoTebus(t);
            return 'Halo Kak ' + t.nama + ', kami mengingatkan batas membeli kembali gitar ' + L.namaGitar(t, 'gitar') + ' (kode *' + t.kode + '*) adalah *' + L.tgl(t.batas_tebus) + '*' +
                (i.sisa > 0 ? ' (' + i.sisa + ' hari lagi)' : i.sisa === 0 ? ' (hari ini)' : '') + ', dengan harga *' + L.rupiah(i.harga) + '*.\n\n' +
                'Setelah tanggal tersebut, sesuai perjanjian, gitar menjadi milik toko.\n' + jamBuka() + '\nPerjanjian: ' + L.urlPerjanjian(t.kode);
        },
        ditebus: function (t) {
            return 'Halo Kak ' + t.nama + ', terima kasih. Gitar ' + L.namaGitar(t, 'gitar') + ' (kode *' + t.kode + '*) sudah Kakak beli kembali pada ' + L.tgl(t.tgl_tebus || L.hariIni()) + ' seharga ' + L.rupiah(L.hargaTebus(t)) + '. Transaksi selesai ✅\n\nBukti: ' + L.urlPerjanjian(t.kode);
        },
        berakhir: function (t) {
            return 'Halo Kak ' + t.nama + ', masa membeli kembali gitar ' + L.namaGitar(t, 'gitar') + ' (kode *' + t.kode + '*) telah berakhir pada ' + L.tgl(t.batas_tebus) + '. Sesuai perjanjian, gitar kini sepenuhnya milik toko. Terima kasih atas kerja samanya 🙏\n\nPerjanjian: ' + L.urlPerjanjian(t.kode);
        }
    };

    /* ---------- penitipan gitar yang sudah selesai (dihitung dari tanggal status Selesai) ---------- */
    L.biayaTitip = function () { return C.biayaTitipPerHari; };
    L.biayaTitipTeks = function () { return L.rupiah(C.biayaTitipPerHari) + ' per hari'; };
    /* keadaan penitipan: null bila belum selesai. lama = hari sejak selesai (sampai diambil atau hari ini) */
    L.titip = function (s, hariIni) {
        if (!s.tgl_selesai || !L.beres(s)) return null;
        var akhir = s.status === 'diambil' && s.tgl_diambil ? s.tgl_diambil : hariIni || L.hariIni(), lama = Math.max(0, L.hariAntara(s.tgl_selesai, akhir));
        var gratis = C.gratisTitipHari, hariBiaya = Math.max(0, lama - gratis);
        return {
            lama: lama, sisaGratis: Math.max(0, gratis - lama), hariBiaya: hariBiaya, biaya: hariBiaya * C.biayaTitipPerHari,
            batasGratis: L.tambahHari(s.tgl_selesai, gratis), batasGaransi: L.tambahHari(s.tgl_selesai, C.garansiHangusHari),
            garansiHangus: lama > C.garansiHangusHari, lepas: lama > C.penyimpananLamaHari
        };
    };
    L.batasGratis = function (s) { var t = s.status === 'selesai' && L.titip(s); return t ? t.batasGratis : null; };
    L.garansiHangus = function (s) { var t = L.titip(s); return !!(t && t.garansiHangus); };
    /* perlu dikirim pengingat ambil? hari ke-7 dan ke-12 (pengingatHari), lalu seminggu sekali setelah biaya berjalan */
    L.perluIngat = function (s, hariIni) {
        if (s.status !== 'selesai') return false;
        var t = L.titip(s, hariIni); if (!t) return false;
        var terakhir = (s.pengingat || []).slice(-1)[0] || '';
        var titik = C.pengingatHari.filter(function (d) { return t.lama >= d; });
        if (titik.length && terakhir < L.tambahHari(s.tgl_selesai, titik[titik.length - 1])) return true;
        return t.hariBiaya > 0 && (!terakhir || L.hariAntara(terakhir, hariIni || L.hariIni()) >= 7);
    };
    L.ketentuan = function () {
        return C.ketentuan.map(function (k) {
            return k.replace('{dp}', C.dpJasaPersen).replace('{gratis}', C.gratisTitipHari).replace('{biaya}', L.biayaTitipTeks())
                .replace('{hangus}', C.garansiHangusHari).replace('{lepas}', C.penyimpananLamaHari);
        });
    };

    /* ---------- pesan WhatsApp servis ---------- */
    function jasaTeks(items) { return (items || []).map(function (i) { return '• ' + i.nama + (i.qty > 1 ? ' ×' + i.qty : '') + ' – ' + L.rupiah(i.harga * (i.qty || 1)); }).join('\n'); }
    L.pesan = {
        tandaTerima: function (s) {
            var h = L.hitung(s, s.items, s.bayar), t = 'Halo Kak ' + s.nama + ', gitar ' + L.namaGitar(s, 'Kakak') + ' sudah kami terima di ' + C.toko.nama + ' 🙏\n\n';
            t += 'Kode servis: *' + s.kode + '*\nTanggal masuk: ' + L.tgl(s.tgl_masuk) + '\n';
            if (s.estimasi) t += 'Estimasi selesai: ' + L.tgl(s.estimasi) + '\n';
            if (s.items && s.items.length) t += '\nPekerjaan:\n' + jasaTeks(s.items) + '\n';
            if (h.diskon) t += 'Diskon: ' + L.rupiah(-h.diskon) + '\n';
            t += '*Total: ' + L.rupiah(h.total) + '*\n';
            if (h.total) {
                t += '\nPengerjaan dimulai setelah pembayaran awal (DP ' + C.dpJasaPersen + '% jasa + part lunas): *' + L.rupiah(h.wajibAwal) + '*\n';
                if (h.dibayar) t += 'Sudah dibayar: ' + L.rupiah(h.dibayar) + (h.kurangAwal ? ' (kurang ' + L.rupiah(h.kurangAwal) + ')' : ' ✅') + '\n';
                if (h.kurangAwal) t += 'Transfer ke ' + L.rekeningTeks() + '\n';
            }
            t += '\nCek status & nota: ' + L.urlCek(s.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)';
            t += '\n\nKetentuan servis (DP, garansi, penitipan) tercantum di nota pada tautan di atas. Silakan tanyakan kalau ada yang kurang jelas.';
            return t;
        },
        update: function (s) {
            var t = 'Halo Kak ' + s.nama + ', update servis gitar ' + L.namaGitar(s, 'Kakak') + ' (kode *' + s.kode + '*):\n';
            t += 'Status: *' + L.STATUS[s.status].label + '*\n';
            if (s.estimasi && !L.beres(s)) t += 'Estimasi selesai: ' + L.tgl(s.estimasi) + '\n';
            if (s.catatan_publik) t += '\n' + s.catatan_publik + '\n';
            return t + '\nDetail, foto, dan biaya: ' + L.urlCek(s.kode);
        },
        selesai: function (s) {
            var h = L.hitung(s, s.items, s.bayar), t = 'Halo Kak ' + s.nama + ', kabar baik! Gitar ' + L.namaGitar(s, 'Kakak') + ' (kode *' + s.kode + '*) sudah selesai dan bisa diambil ✅\n\n';
            t += h.sisa ? 'Sisa pembayaran: *' + L.rupiah(h.sisa) + '*\n(bisa tunai saat ambil atau transfer ke ' + L.rekeningTeks() + ')\n' : 'Pembayaran sudah lunas. Terima kasih!\n';
            var bg = L.batasGratis(s);
            if (bg) t += '\nGratis dititipkan sampai ' + L.tgl(bg) + '; setelah itu biaya penitipan ' + L.biayaTitipTeks() + '.\n';
            return t + jamBuka() + '\nFoto hasil servis, saran dari kami, dan nota: ' + L.urlCek(s.kode);
        },
        /* pengingat gitar yang sudah selesai tapi belum diambil */
        pengingat: function (s) {
            var t = L.titip(s), h = L.hitung(s, s.items, s.bayar);
            var m = 'Halo Kak ' + s.nama + ', kami mengingatkan gitar ' + L.namaGitar(s, 'Kakak') + ' (kode *' + s.kode + '*) sudah selesai sejak ' + L.tgl(s.tgl_selesai) + ' dan bisa diambil di toko 🙏\n\n';
            if (!t.hariBiaya) m += 'Gratis dititipkan sampai *' + L.tgl(t.batasGratis) + '*' + (t.sisaGratis ? ' (' + t.sisaGratis + ' hari lagi)' : ' (hari ini terakhir)') + '. Setelah itu biaya penitipan ' + L.biayaTitipTeks() + '.\n';
            else m += 'Masa gratis penitipan sudah lewat sejak ' + L.tgl(t.batasGratis) + '. Biaya penitipan sampai hari ini: ' + t.hariBiaya + ' hari × ' + L.rupiah(C.biayaTitipPerHari) + ' = *' + L.rupiah(t.biaya) + '*.\n';
            m += t.garansiHangus ? 'Garansi servis sudah hangus karena gitar belum diambil lebih dari ' + C.garansiHangusHari + ' hari.\n'
                : 'Garansi servis tetap berlaku bila gitar diambil paling lambat ' + L.tgl(t.batasGaransi) + '.\n';
            if (t.lama >= C.garansiHangusHari) m += 'Mohon gitar diambil secepatnya; biaya penitipan terus bertambah setiap hari.\n';
            if (h.sisa) m += '\nSisa pembayaran servis: ' + L.rupiah(h.sisa) + '\n';
            return m + jamBuka() + '\nDetail & nota: ' + L.urlCek(s.kode);
        },
        nota: function (s) {
            return 'Halo Kak ' + s.nama + ', berikut nota servis gitar ' + L.namaGitar(s, 'Kakak') + ' (kode *' + s.kode + '*):\n' + L.urlNota(s.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)\n\nTerima kasih sudah servis di ' + C.toko.nama + ' 🎸';
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
    /* dukungan WebP dicek sekali (Safari lama belum bisa membuat WebP, jadi pakai JPEG) */
    var tipeFoto = null;
    function cekTipe() {
        if (tipeFoto) return Promise.resolve(tipeFoto);
        var c = document.createElement('canvas'); c.width = c.height = 1;
        return new Promise(function (ok) { c.toBlob(function (b) { ok(tipeFoto = b && b.type === 'image/webp' ? 'image/webp' : 'image/jpeg'); }, 'image/webp'); });
    }
    function kanvas(src, w, h, sisi) {
        var k = Math.min(1, sisi / Math.max(w, h)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        return c;
    }
    function keBlob(c, q) { return cekTipe().then(function (t) { return new Promise(function (ok) { c.toBlob(ok, t, q); }); }); }
    /* hasil: { besar, kecil } (sisi terpanjang 1440 px dan 400 px; kecil dibuat dari kanvas besar). opsi.kecil === false: tanpa versi kecil */
    L.kompres = function (file, opsi) {
        var muat = window.createImageBitmap ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return muatGambar(file); }) : muatGambar(file);
        return muat.then(function (img) {
            var besar = kanvas(img, img.width, img.height, 1440);
            if (img.close) img.close();
            return Promise.all([keBlob(besar, 0.78), opsi && opsi.kecil === false ? null : keBlob(kanvas(besar, besar.width, besar.height, 400), 0.7)])
                .then(function (r) { return { besar: r[0], kecil: r[1] }; });
        });
    };

    /* ================= kriptografi (WebCrypto) ================= */
    var te = new TextEncoder(), td = new TextDecoder();
    function b64(buf) { var s = '', b = new Uint8Array(buf); for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
    function unb64(s) { var bin = atob(s), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
    function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
    function acakHex(n) { var r = new Uint8Array(n); crypto.getRandomValues(r); return hex(r); }
    function aes(raw) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
    function enkripsi(key, data) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data).then(function (ct) { var out = new Uint8Array(12 + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), 12); return out; });
    }
    function dekripsi(key, data) { data = new Uint8Array(data); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12) }, key, data.subarray(12)); }
    function pbkdf2(teks, garam, putaran, bit) {
        return crypto.subtle.importKey('raw', te.encode(teks), 'PBKDF2', false, ['deriveBits'])
            .then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: typeof garam === 'string' ? te.encode(garam) : garam, iterations: putaran, hash: 'SHA-256' }, k, bit); });
    }
    /* kunci satu catatan publik: nama file + kunci AES, dari kode + 4 digit HP (dibuat lambat supaya sulit ditebak) */
    var kunciCache = {};
    L.kunciServis = function (kode, hp4) {
        var k = String(kode).trim().toUpperCase() + '|' + String(hp4).trim();
        if (!kunciCache[k]) kunciCache[k] = pbkdf2(k, 'ayri-servis-v1', 150000, 512).then(function (bits) {
            return aes(bits.slice(32, 64)).then(function (key) { return { id: hex(bits.slice(0, 12)), key: key }; });
        });
        return kunciCache[k];
    };
    function kunciFoto(fk) { return aes(unb64(fk)); }

    /* ================= halaman publik ================= */
    var fotoCache = {};
    function simpanUrl(c, p) { fotoCache[c] = p; p.catch(function () { delete fotoCache[c]; }); return p; }
    function keUrl(b) { return URL.createObjectURL(b); }
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
        return fotoCache[c] || simpanUrl(c, fetch('data/foto/' + file).then(function (r) { if (!r.ok) throw new Error('Foto belum tersedia'); return r.arrayBuffer(); })
            .then(function (buf) { return kunciFoto(s.fk).then(function (key) { return dekripsi(key, buf); }); })
            .then(function (b) { return keUrl(new Blob([b], { type: f.tipe || 'image/webp' })); }));
    };
    /* isi semua <img data-foto="i"> di dalam el dengan foto terdekripsi */
    L.isiFoto = function (el, s, ambil) {
        [].forEach.call(el.querySelectorAll('img[data-foto]'), function (img) {
            var f = s.foto[+img.dataset.foto]; if (!f) return;
            (ambil || L.api.fotoPublik)(s, f, false).then(function (u) { img.src = u; }, function () { img.alt = 'Foto belum tersedia'; });
        });
    };
    /* halaman yang dibuka dengan kode + 4 digit HP (nota, surat perjanjian); kode terakhir diingat di perangkat */
    L.ingatKode = function (kunci, kode) { try { var m = JSON.parse(localStorage.getItem(kunci) || 'null'); return m && (!kode || m.k === kode) ? m : null; } catch (e) { return null; } };
    L.simpanKode = function (kunci, k, h) { try { localStorage.setItem(kunci, JSON.stringify({ k: k, h: h })); } catch (e) {} };
    /* o: { isi, kunci, jenis, halaman, judul, labelKode, contoh, tombol, tampil(data) } */
    L.halamanKode = function (o) {
        var q = new URLSearchParams(location.search), k = (q.get('k') || '').toUpperCase(), h = q.get('h'), m = L.ingatKode(o.kunci, k);
        if (!h && m) h = m.h;
        function gerbang(pesan) {
            o.isi.innerHTML = '<form class="ly-card ly-f nota-gate" id="f"><h2>' + E(o.judul) + '</h2>' + (pesan ? '<p class="cek-err">' + E(pesan) + '</p>' : '') +
                '<label>' + E(o.labelKode) + '<input name="k" value="' + E(k) + '" placeholder="' + E(o.contoh) + '" autocapitalize="characters" required></label>' +
                '<label>4 digit terakhir HP<input name="h" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>' +
                '<button class="ly-btn ly-btn--pri">' + E(o.tombol) + '</button></form>';
            var f = o.isi.querySelector('#f');
            (k ? f.h : f.k).focus();
            f.addEventListener('submit', function (e) { e.preventDefault(); k = f.k.value.trim().toUpperCase(); h = f.h.value.replace(/\D/g, ''); muat(); });
        }
        function muat() {
            o.isi.innerHTML = '<p class="ly-kosong">Memuat&hellip;</p>';
            L.api.cekPublik(k, h, o.jenis).then(function (d) {
                if (!d) return gerbang('Data tidak ditemukan. Periksa kode dan 4 digit terakhir HP.');
                L.simpanKode(o.kunci, k, h);
                if (history.replaceState) history.replaceState(null, '', o.halaman + '?k=' + encodeURIComponent(d.kode));
                o.tampil(d);
            }).catch(function () { gerbang('Gagal terhubung. Periksa koneksi internet.'); });
        }
        if (k && h) muat(); else gerbang('');
    };
    /* struk untuk printer thermal Bluetooth (ESC/POS, kertas 58 mm = 32 huruf per baris). Hasil: daftar baris
       { t: teks ASCII, a: 'c' tengah / 'l' kiri, b: tebal, besar: huruf dua kali lipat }; dicetak oleh aplikasi Android */
    function penyusunStruk(lebar) {
        var W = lebar || 32, out = [];
        function ascii(x) {
            return String(x == null ? '' : x).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[–—]/g, '-').replace(/·/g, '-')
                .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/×/g, 'x').replace(/[^ -~]/g, '').replace(/\s+/g, ' ').trim();
        }
        function bungkus(x, w) {
            var baris = [], kini = '';
            ascii(x).split(' ').forEach(function (kata) {
                while (kata.length > w) { if (kini) { baris.push(kini); kini = ''; } baris.push(kata.slice(0, w)); kata = kata.slice(w); }
                if (!kata) return;
                if (!kini) kini = kata; else if (kini.length + 1 + kata.length <= w) kini += ' ' + kata; else { baris.push(kini); kini = kata; }
            });
            if (kini) baris.push(kini);
            return baris;
        }
        function tengah(x, opsi) { bungkus(x, opsi && opsi.besar ? Math.floor(W / 2) : W).forEach(function (b) { out.push(Object.assign({ t: b, a: 'c' }, opsi)); }); }
        function kiri(x, opsi) { bungkus(x, W).forEach(function (b) { out.push(Object.assign({ t: b, a: 'l' }, opsi)); }); }
        /* kiri ... kanan dalam satu baris; bila tidak muat, teks kiri dibungkus dan angka di baris terakhir */
        function dua(k, n, opsi) {
            var awal = /^ */.exec(k)[0]; k = ascii(k); n = ascii(n);
            if (awal.length + k.length + 1 + n.length <= W) { out.push(Object.assign({ t: awal + k + new Array(W - awal.length - k.length - n.length + 1).join(' ') + n, a: 'l' }, opsi)); return; }
            var b = bungkus(k, W), akhir = b.pop() || '';
            b.forEach(function (x) { out.push(Object.assign({ t: x, a: 'l' }, opsi)); });
            if (akhir.length + 1 + n.length > W) { out.push(Object.assign({ t: akhir, a: 'l' }, opsi)); akhir = ''; }
            out.push(Object.assign({ t: akhir + new Array(Math.max(1, W - akhir.length - n.length) + 1).join(' ') + n, a: 'l' }, opsi));
        }
        function garis() { out.push({ t: new Array(W + 1).join('-'), a: 'l' }); }
        function kop() { var t = C.toko; tengah(t.nama.toUpperCase(), { b: true, besar: true }); tengah(t.alamat); tengah('WA +' + t.wa); garis(); }
        return { out: out, tengah: tengah, kiri: kiri, dua: dua, garis: garis, kop: kop, kosong: function () { out.push({ t: '', a: 'l' }); } };
    }
    L.strukThermal = function (s, lebar) {
        var p = penyusunStruk(lebar), tengah = p.tengah, kiri = p.kiri, dua = p.dua, garis = p.garis, out = p.out, METODE = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };
        var d = s.waktu instanceof Date ? s.waktu : new Date(s.waktu), sisa = s.total - s.dibayar;
        var jam = L.tgl(L.tglStr(d)) + ' ' + ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
        p.kop();
        (s.kode || []).forEach(function (k) { kiri(k); });
        kiri(jam);
        if (s.nama) dua('Pelanggan', s.nama);
        garis();
        (s.items || []).forEach(function (i) { kiri(i.nama); dua('  ' + i.qty + ' x ' + L.rupiah(i.harga), L.rupiah(i.qty * i.harga)); });
        garis();
        dua('TOTAL', L.rupiah(s.total), { b: true });
        if (s.dp) {
            dua('DP (' + METODE[s.metode] + ')', L.rupiah(s.dibayar));
            dua('SISA', L.rupiah(sisa), { b: true });
            if (s.jual && s.jual.batas_lunas) dua('Lunasi s/d', L.tgl(s.jual.batas_lunas));
        } else {
            dua('Bayar (' + METODE[s.metode] + ')', L.rupiah(s.diterima != null ? s.diterima : s.total));
            if (s.diterima != null) dua('Kembali', L.rupiah(s.diterima - s.total));
        }
        garis();
        tengah('Terima kasih sudah berbelanja!');
        if ((s.nota || []).length) tengah('Nota online: ayrigitar.com (kode + 4 digit HP)');
        tengah('ayrigitar.com');
        return out;
    };
    /* tanda terima servis 58 mm untuk pelanggan, lalu (bila label) potongan kecil untuk ditempel/diikat di gitar
       supaya tidak tertukar di antrian. Ketentuan diambil dari pengaturan toko (masa gratis titip, biaya, garansi) */
    L.strukServis = function (s, opsi) {
        opsi = opsi || {};
        var p = penyusunStruk(opsi.lebar), h = L.hitung(s, s.items, s.bayar), gitar = L.namaGitar(s, 'Gitar');
        p.kop();
        p.tengah('TANDA TERIMA SERVIS', { b: true });
        p.tengah(s.kode, { b: true, besar: true });
        p.garis();
        p.dua('Masuk', L.tgl(s.tgl_masuk));
        p.dua('Pelanggan', s.nama);
        p.dua('No. HP', '****' + L.hp4(s.hp));
        p.kiri('Gitar: ' + gitar);
        if (s.keluhan) p.kiri('Keluhan: ' + s.keluhan);
        if (s.estimasi) p.dua('Perkiraan selesai', L.tgl(s.estimasi));
        if ((s.items || []).length) {
            p.garis();
            s.items.forEach(function (i) {
                var q = +i.qty || 1;
                if (q > 1) { p.kiri(i.nama); p.dua('  ' + q + ' x ' + L.rupiah(i.harga), L.rupiah(q * i.harga)); }
                else p.dua(i.nama, L.rupiah(i.harga));
            });
            p.garis();
            if (h.diskon) p.dua('Diskon', '-' + L.rupiah(h.diskon));
            p.dua('TOTAL', L.rupiah(h.total), { b: true });
            if (h.dibayar) p.dua('Sudah dibayar', L.rupiah(h.dibayar));
            p.dua('SISA', L.rupiah(h.sisa), { b: true });
            if (h.kurangAwal) p.kiri('Dikerjakan setelah bayar awal ' + L.rupiah(h.wajibAwal) + ' (DP ' + C.dpJasaPersen + '% jasa + part lunas).');
        }
        p.garis();
        p.kiri('Cek status & nota: ayrigitar.com/cek-servis.html, masukkan kode + 4 digit terakhir HP.');
        p.kosong();
        p.kiri('- Garansi dihitung sejak gitar diambil.');
        p.kiri('- Gratis dititipkan ' + C.gratisTitipHari + ' hari setelah selesai, lalu ' + L.rupiah(C.biayaTitipPerHari) + '/hari.');
        p.kiri('- Garansi hangus bila belum diambil ' + C.garansiHangusHari + ' hari setelah selesai.');
        p.kiri('- Bawa tanda terima ini saat mengambil.');
        p.garis();
        p.tengah('Terima kasih!');
        if (opsi.label) {
            p.kosong(); p.kosong();
            p.tengah('- - - - sobek di sini - - - -');
            p.kosong();
            p.tengah('LABEL GITAR', { b: true });
            p.tengah(s.kode, { b: true, besar: true });
            p.tengah(s.nama, { b: true });
            p.tengah(gitar);
            p.tengah('Masuk ' + L.tgl(s.tgl_masuk));
            if (s.estimasi) p.tengah('Target ' + L.tgl(s.estimasi));
            if (s.keluhan) p.kiri(String(s.keluhan).slice(0, 96));
        }
        return p.out;
    };
    /* kop dokumen (nota servis & surat perjanjian) */
    L.kopNota = function (judul, kode, cap) {
        return '<header class="nota-head"><div class="nota-toko"><b>Toko Gitar <span>AYRI</span></b><p>' + E(C.toko.alamat) + '</p><p>WhatsApp +' + E(C.toko.wa) + ' · ayrigitar.com</p></div>' +
            '<div class="nota-id"><h1>' + E(judul) + '</h1><p>' + E(kode) + '</p>' + (cap || '') + '</div></header>';
    };

    /* ================= admin: GitHub sebagai tempat data ================= */
    var G = C.github, CABANG = G.cabang || 'main', RAW = 'application/vnd.github.raw+json';
    var KUNCI_TOKEN = 'ayri-admin-token', KUNCI_SESI = 'ayri-admin-sesi', KUNCI_GAGAL = 'ayri-pin-gagal';
    /* token hanya hidup di memori halaman ini (tidak lagi disalin ke sessionStorage): muat ulang halaman = masukkan PIN lagi */
    var token = null;
    try { sessionStorage.removeItem(KUNCI_SESI); } catch (e) {} /* sisa dari versi lama */
    L.siapAdmin = !!(G.pemilik && G.repoSitus && G.repoData);

    function pesanGh(status, teks) {
        if (status === 401) return 'Token GitHub ditolak (salah atau sudah kedaluwarsa). Buat token baru (panduan langkah 2), lalu pasang ulang di admin.';
        if (status === 403 && /rate limit/i.test(teks)) return 'Batas akses GitHub tercapai. Tunggu beberapa menit.';
        if (status === 403) return 'Token tidak punya izin menulis. Pastikan izin Contents: Read and write untuk kedua repo.';
        if (status === 404) return 'Repo tidak ditemukan, atau token tidak diberi akses ke repo itu.';
        if (status === 409) return 'Repo masih kosong.';
        return 'GitHub error ' + status + ': ' + String(teks).slice(0, 160);
    }
    /* simpanCache: untuk file yang isinya tidak pernah berubah (foto bernama acak) */
    function gh(method, path, body, accept, simpanCache) {
        if (!token) return Promise.reject(new Error('Admin terkunci. Masukkan PIN lagi.'));
        function putus() { var e = new Error('Koneksi internet bermasalah. Coba lagi.'); e.offline = true; throw e; }
        if (navigator.onLine === false) { try { putus(); } catch (e) { return Promise.reject(e); } }
        var h = { Authorization: 'Bearer ' + token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
        if (body) h['Content-Type'] = 'application/json';
        return fetch('https://api.github.com/repos/' + path, { method: method, cache: simpanCache ? 'default' : 'no-store', headers: h, body: body ? JSON.stringify(body) : undefined })
            .catch(putus)
            .then(function (r) {
                if (r.ok) return accept ? r : r.status === 204 ? null : r.json();
                return r.text().then(function (t) { var e = new Error(pesanGh(r.status, t)); e.status = r.status; e.detail = t; throw e; });
            });
    }
    /* repo: 'situs' (publik), 'data' (daftar servis/stok/jual/artikel), 'owner' (khusus owner: tebus, KTP, modal stok).
       Sebelum dipisah (repoBersama kosong), 'data' dan 'owner' adalah repo yang sama. */
    var PISAH = !!G.repoBersama, peran = 'owner';
    function repo(jenis) { return G.pemilik + '/' + (jenis === 'situs' ? G.repoSitus : jenis === 'data' && PISAH ? G.repoBersama : G.repoData); }
    function repoJenis(jenis) { return PISAH && jenis === 'tebus' ? 'owner' : 'data'; }
    L.api.peran = function () { return peran; };
    L.api.pisah = function () { return PISAH; };
    function jalur(p) { return p.split('/').map(encodeURIComponent).join('/'); }
    function bacaFile(jenis, p, biner) {
        return gh('GET', repo(jenis) + '/contents/' + jalur(p) + '?ref=' + CABANG, null, RAW, biner)
            .then(function (r) { return biner ? r.arrayBuffer() : r.text(); }, function (e) { if (e.status === 404) return null; throw e; });
    }
    /* ---------- menulis ke GitHub tanpa saling menimpa ----------
       Satu penulisan = SATU commit (situs hanya dibangun ulang sekali) di atas "kepala" repo yang barusan dibaca.
       Bila perangkat lain sempat menyimpan di antaranya, GitHub menolak (422 "not a fast forward") dan SELURUH langkah
       baca-hitung-tulis diulang dengan data terbaru, sehingga perubahan perangkat lain tidak pernah tertimpa. */
    function tunda(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
    function bentrok(pesan) { var e = new Error(pesan || 'Data ini baru diubah di perangkat lain. Muat ulang data (tombol ⟳ di atas), lalu ulangi.'); e.bentrok = true; return e; }
    function ambilKepala(rp, bolehMulai) {
        return gh('GET', rp + '/git/ref/heads/' + CABANG).catch(function (e) {
            if ((e.status === 409 || e.status === 404) && bolehMulai) return gh('PUT', rp + '/contents/README.md', { message: 'Mulai repo', content: b64(te.encode('Data layanan Toko Gitar AYRI\n')), branch: CABANG }).then(function () { return gh('GET', rp + '/git/ref/heads/' + CABANG); });
            throw e;
        }).then(function (ref) { return ref.object.sha; });
    }
    /* blob dibuat sekali per berkas (foto besar tidak diunggah ulang saat commit diulang) */
    function blobDari(rp, f) {
        if (f.hapus) return Promise.resolve(null);
        if (f._sha) return Promise.resolve(f._sha);
        return gh('POST', rp + '/git/blobs', { content: f.base64 != null ? f.base64 : b64(te.encode(f.teks)), encoding: 'base64' }).then(function (b) { f._sha = b.sha; return b.sha; });
    }
    function tulisDi(rp, kepala, files, pesan, tanpaHapus) {
        return Promise.all(files.map(function (f) { return blobDari(rp, f); })).then(function (sha) {
            var pohon = [];
            files.forEach(function (f, i) { if (!f.hapus) pohon.push({ path: f.path, mode: '100644', type: 'blob', sha: sha[i] }); else if (!tanpaHapus) pohon.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); });
            if (!pohon.length) return kepala;
            return gh('GET', rp + '/git/commits/' + kepala).then(function (c) { return gh('POST', rp + '/git/trees', { base_tree: c.tree.sha, tree: pohon }); })
                .then(function (t) { return gh('POST', rp + '/git/commits', { message: pesan, tree: t.sha, parents: [kepala] }); })
                .then(function (nc) { return gh('PATCH', rp + '/git/refs/heads/' + CABANG, { sha: nc.sha }).then(function () { return nc.sha; }); });
        });
    }
    /* hitung(baca) mengembalikan Promise berisi array file, atau { files: [...], hasil: ... }. baca(path) membaca isi file (teks, atau
       null bila belum ada) PADA kepala yang sama dengan yang akan ditulisi. hitung boleh dipanggil lebih dari sekali (tiap bentrok),
       jadi tidak boleh punya efek samping yang tidak bisa diulang. Hasil: nilai `hasil`, atau sha commit untuk array file biasa. */
    function ubahAtomik(jenis, hitung, pesan) {
        var rp = repo(jenis);
        function coba(n, tanpaHapus) {
            return ambilKepala(rp, n < 2).then(function (kepala) {
                function baca(path) { return gh('GET', rp + '/contents/' + jalur(path) + '?ref=' + kepala, null, RAW).then(function (r) { return r.text(); }, function (e) { if (e.status === 404) return null; throw e; }); }
                return Promise.resolve(hitung(baca)).then(function (h) {
                    var biasa = Array.isArray(h), files = biasa ? h : (h && h.files) || [];
                    return tulisDi(rp, kepala, files, pesan, tanpaHapus).then(function (sha) { return biasa ? sha : h && h.hasil; });
                });
            }).catch(function (e) {
                var d = e && e.detail || '';
                if (e && e.status === 422 && /tree|path/i.test(d) && !/fast forward/i.test(d) && !tanpaHapus) return coba(n, true); /* file yang mau dihapus ternyata sudah tidak ada */
                if (e && e.status === 422 && n < 6) return tunda(300 * (n + 1) + Math.random() * 300).then(function () { return coba(n + 1, tanpaHapus); }); /* commit lain masuk di saat yang sama: ulangi dari membaca */
                throw e;
            });
        }
        return coba(0, false);
    }
    /* tulis file baru/hapus tanpa membaca isi lama (foto, halaman publik, katalog) */
    function commit(jenis, files, pesan) { return ubahAtomik(jenis, function () { return files; }, pesan); }
    function commitBila(jenis, files, pesan) { return files.length ? commit(jenis, files, pesan) : Promise.resolve(null); }

    /* ---------- token: disimpan di perangkat ini, dikunci PIN ----------
       PIN minimal 6 karakter (angka atau huruf), kunci diturunkan dengan 600.000 putaran PBKDF2 (versi lama: 200.000, tetap bisa dibuka
       lalu otomatis ditingkatkan). Salah PIN 5 kali berturut-turut: dikunci sementara, makin lama bila terus salah. */
    var PIN_MIN = 6, PIN_PUTARAN = 600000, PIN_PUTARAN_LAMA = 200000, SALAH_MAKS = 5;
    L.api.PIN_MIN = PIN_MIN;
    function kunciPin(pin, garam, putaran) { return pbkdf2('ayri-pin|' + pin, garam, putaran || PIN_PUTARAN_LAMA, 256).then(aes); }
    function bacaGagal() { try { var g = JSON.parse(localStorage.getItem(KUNCI_GAGAL) || 'null'); return g && typeof g.n === 'number' ? g : { n: 0, sampai: 0 }; } catch (e) { return { n: 0, sampai: 0 }; } }
    function bersihkanGagal() { try { localStorage.removeItem(KUNCI_GAGAL); } catch (e) {} }
    function simpanBlobToken(pin, tokenIni) {
        var garam = crypto.getRandomValues(new Uint8Array(16));
        return kunciPin(pin, garam, PIN_PUTARAN).then(function (k) { return enkripsi(k, te.encode(tokenIni)); }).then(function (ct) {
            localStorage.setItem(KUNCI_TOKEN, JSON.stringify({ v: 2, it: PIN_PUTARAN, g: b64(garam), d: b64(ct), dibuat: L.hariIni() }));
            bersihkanGagal();
        });
    }
    function cekPin(pin) { return String(pin || '').length >= PIN_MIN ? null : new Error('PIN minimal ' + PIN_MIN + ' karakter (angka atau huruf).'); }
    L.api.adaToken = function () { try { return !!localStorage.getItem(KUNCI_TOKEN); } catch (e) { return false; } };
    L.api.terbuka = function () { return !!token; };
    L.api.pasangToken = function (tokenBaru, pin) {
        var salah = cekPin(pin); if (salah) return Promise.reject(salah);
        tokenBaru = String(tokenBaru || '').trim(); token = tokenBaru;
        return Promise.all([gh('GET', repo('data')), gh('GET', repo('situs'))]).then(function (r) {
            if (!r[0].private) throw new Error('Repo data "' + (PISAH ? G.repoBersama : G.repoData) + '" masih PUBLIK. Ubah jadi Private dulu (Settings → Danger Zone → Change visibility).');
            return simpanBlobToken(String(pin), tokenBaru);
        }).catch(function (e) { token = null; throw e; });
    };
    L.api.buka = function (pin) {
        var s = null; try { s = JSON.parse(localStorage.getItem(KUNCI_TOKEN) || 'null'); } catch (e) {}
        if (!s || !s.g || !s.d) return Promise.reject(new Error('Token belum dipasang.'));
        var g = bacaGagal(), kini = Date.now(); pin = String(pin || '');
        if (g.sampai > kini) return Promise.reject(new Error('Terlalu banyak PIN yang salah. Coba lagi dalam ' + Math.ceil((g.sampai - kini) / 60000) + ' menit.'));
        return kunciPin(pin, unb64(s.g), s.it).then(function (k) { return dekripsi(k, unb64(s.d)); }).then(function (b) {
            token = td.decode(b); bersihkanGagal();
            if (s.v !== 2) simpanBlobToken(pin, token).catch(function () {}); /* tingkatkan blob lama ke 600.000 putaran, diam-diam */
        }, function () {
            var n = g.n + 1, menit = Math.min(60, 5 * (n - SALAH_MAKS + 1));
            try { localStorage.setItem(KUNCI_GAGAL, JSON.stringify({ n: n, sampai: n >= SALAH_MAKS ? kini + menit * 60000 : 0 })); } catch (e) {}
            throw new Error(n >= SALAH_MAKS ? 'PIN salah. Terlalu banyak percobaan: coba lagi dalam ' + menit + ' menit.' : 'PIN salah. Sisa percobaan: ' + (SALAH_MAKS - n) + '.');
        });
    };
    /* ganti PIN perangkat ini (admin harus sedang terbuka) */
    L.api.gantiPin = function (pinBaru) {
        if (!token) return Promise.reject(new Error('Admin terkunci. Masukkan PIN dulu.'));
        var salah = cekPin(pinBaru); if (salah) return Promise.reject(salah);
        return simpanBlobToken(String(pinBaru), token);
    };
    L.api.kunci = function () { token = null; try { sessionStorage.removeItem(KUNCI_SESI); } catch (e) {} return Promise.resolve(); };
    L.api.lupakan = function () { L.api.kunci(); bersihkanGagal(); try { localStorage.removeItem(KUNCI_TOKEN); } catch (e) {} return Promise.resolve(); };

    /* ---------- data (repo privat) ---------- */
    var data = { servis: [], artikel: [], tebus: [], stok: [], jual: [], absen: [], opname: [], pengaturan: {}, kas: [] }, rahasia = {}, statusPisah = null;
    function cari(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
    function bacaJson(nama, rp) { return bacaFile(rp || 'data', nama).then(function (t) { return t ? JSON.parse(t) : []; }); }
    /* modal & asal barang: setelah dipisah, disimpan di repo owner (stok-rahasia.json), bukan di stok.json bersama */
    var RAHASIA_STOK = ['harga_beli', 'asal'];
    function bersihStok(s) { var x = Object.assign({}, s); RAHASIA_STOK.forEach(function (k) { delete x[k]; }); return x; }
    function gabungStok(list) { return PISAH ? list.map(function (s) { return rahasia[s.id] ? Object.assign({}, s, rahasia[s.id]) : s; }) : list; }
    function isiRahasia(s) { return { harga_beli: +s.harga_beli || 0, asal: s.asal || '' }; }
    /* peran ditentukan dari akses token: bisa membuka repo owner = owner, tidak bisa = karyawan */
    function cekPeran() {
        if (!PISAH) { peran = 'owner'; return Promise.resolve(); }
        return gh('GET', repo('owner')).then(function () { peran = 'owner'; }, function (e) { if (e.status === 404 || e.status === 403) { peran = 'karyawan'; return; } throw e; });
    }
    function muatOnline() {
        return cekPeran().then(function () {
            var owner = peran === 'owner';
            return Promise.all([
                Promise.all(['servis', 'artikel', 'stok', 'jual', 'absen', 'opname', 'pengaturan', 'kas'].map(function (j) { return bacaFile('data', j + '.json'); })),
                owner ? bacaJson('tebus.json', repoJenis('tebus')) : Promise.resolve([]),
                owner && PISAH ? bacaFile('owner', 'stok-rahasia.json') : Promise.resolve(null),
                owner && PISAH ? bacaFile('owner', 'servis.json') : Promise.resolve(null)
            ]);
        }).then(function (r) {
            var b = r[0], json = function (t) { return t ? JSON.parse(t) : []; };
            /* data belum dipindah ke repo bersama: owner diminta memindahkan, karyawan menunggu */
            statusPisah = PISAH && !b[0] ? (peran === 'owner' && r[3] ? 'pindah' : 'kosong') : null;
            rahasia = r[2] ? JSON.parse(r[2]) : {};
            data.servis = json(b[0]); data.artikel = json(b[1]); data.stok = gabungStok(json(b[2])); data.jual = json(b[3]); data.tebus = r[1];
            data.absen = json(b[4]); data.opname = json(b[5]); data.pengaturan = b[6] ? JSON.parse(b[6]) : {}; data.kas = json(b[7]);
            return salin(data);
        });
    }
    L.api.statusPisah = function () { return statusPisah; };
    /* cadangan: hanya data yang boleh dilihat pemegang token ini */
    L.api.cadangan = function () { var c = salin(data); if (peran !== 'owner') { delete c.tebus; c.stok = c.stok.map(bersihStok); } return c; };
    /* cadangan terenkripsi: berisi data pelanggan (dan kunci foto), jadi dikunci dengan sandi pilihan pemilik (AES-GCM, PBKDF2 600.000 putaran) */
    var CAD_PUTARAN = 600000;
    L.api.cadanganTerenkripsi = function (sandi) {
        sandi = String(sandi || '');
        if (sandi.length < PIN_MIN) return Promise.reject(new Error('Sandi cadangan minimal ' + PIN_MIN + ' karakter.'));
        var garam = crypto.getRandomValues(new Uint8Array(16)), isi = te.encode(JSON.stringify(L.api.cadangan()));
        return pbkdf2('ayri-cadangan|' + sandi, garam, CAD_PUTARAN, 256).then(aes).then(function (k) { return enkripsi(k, isi); })
            .then(function (ct) { return JSON.stringify({ app: 'ayri-cadangan', v: 1, it: CAD_PUTARAN, g: b64(garam), d: b64(ct), dibuat: new Date().toISOString() }); });
    };
    L.api.bukaCadangan = function (teks, sandi) {
        var j = null; try { j = JSON.parse(teks); } catch (e) {}
        if (!j || j.app !== 'ayri-cadangan' || !j.g || !j.d) return Promise.reject(new Error('Berkas ini bukan cadangan AYRI.'));
        return pbkdf2('ayri-cadangan|' + String(sandi || ''), unb64(j.g), j.it || CAD_PUTARAN, 256).then(aes).then(function (k) { return dekripsi(k, unb64(j.d)); })
            .then(function (b) { return td.decode(b); }, function () { throw new Error('Sandi salah, atau berkas rusak.'); });
    };
    /* pindahkan data dari repo owner (repo data lama) ke repo bersama, sekali saja:
       (1) modal stok ke stok-rahasia.json di repo owner, (2) daftar ke repo bersama tanpa modal, (3) salinan lama di repo owner dihapus
       (tetap ada di riwayat repo owner sebagai arsip). Bila terputus di tengah, menekan Pindahkan lagi aman. */
    L.api.pindahkanData = function () {
        if (!PISAH || peran !== 'owner') return Promise.reject(new Error('Hanya owner yang bisa memindahkan data.'));
        var nama = ['servis', 'artikel', 'stok', 'jual'];
        return Promise.all(nama.map(function (j) { return bacaFile('owner', j + '.json'); })).then(function (r) {
            var stok = r[2] ? JSON.parse(r[2]) : [], rh = {};
            stok.forEach(function (s) { if (+s.harga_beli || s.asal) rh[s.id] = isiRahasia(s); });
            var keBersama = [];
            nama.forEach(function (j, i) { if (r[i] != null) keBersama.push({ path: j + '.json', teks: j === 'stok' ? JSON.stringify(stok.map(bersihStok), null, 1) + '\n' : r[i] }); });
            return commit('owner', [{ path: 'stok-rahasia.json', teks: JSON.stringify(rh, null, 1) + '\n' }], 'Pisahkan modal stok (khusus owner)')
                .then(function () { return commitBila('data', keBersama, 'Pindahan data dari repo owner'); })
                .then(function () {
                    return commit('owner', nama.filter(function (j, i) { return r[i] != null; }).map(function (j) { return { path: j + '.json', hapus: true }; }).concat([{ path: 'PINDAH.md', teks: 'Sejak ' + L.hariIni() + ', servis, stok (tanpa modal), penjualan, dan artikel disimpan di repo ' + G.repoBersama + '.\nRepo ini khusus owner: tebus, foto KTP, dan modal stok (stok-rahasia.json). Versi lama ada di riwayat commit.\n' }]), 'Data dipindah ke repo bersama');
                });
        });
    };
    /* ---------- catatan di layar yang basi ----------
       dasar = updated_at catatan saat dibuka di layar. Bila di GitHub versinya sudah lain (perangkat lain menyimpan lebih dulu),
       simpanan ditolak (bentrok) daripada menimpa perubahan itu. Antrian offline membawa dasar aslinya di rec._dasar. */
    function ambilDasar(rec) {
        var ulang = rec._dasar !== undefined, d = ulang ? rec._dasar : rec.updated_at;
        delete rec._dasar;
        return { d: d == null ? undefined : d, ulang: ulang };
    }
    function tandaiRec(rec, dasar) { return function (e) { if (e && e.offline && !e.rec) { e.rec = salin(rec); e.rec._dasar = dasar === undefined ? null : dasar; } throw e; }; }
    /* bentrok bila versi di GitHub bukan versi yang dibuka di layar (dasar) dan bukan versi yang sedang akan ditulis
       (simpanan yang sudah masuk sebelumnya lalu diulang tetap aman). Catatan lama tanpa updated_at tidak bisa dibandingkan.
       Batas yang diketahui: dua perangkat yang menyimpan catatan yang sama pada MILIDETIK yang persis sama dianggap tulisan sendiri (praktis mustahil
       untuk dua orang; tes gagal-sebagian/offline sengaja memberi jeda beberapa milidetik). */
    function cekVersi(list, rec, dasar) {
        var ada = cari(list, rec.id);
        if (ada && ada.updated_at != null && ada.updated_at !== dasar && ada.updated_at !== rec.updated_at) throw bentrok();
        return ada;
    }
    /* pemeriksaan awal sebelum foto/halaman publik ditulis ke situs (urutan situs dulu, baru data utama); lama = catatan ini sudah ada di layar */
    function cekBentrok(jenis, rec, dasar, lama) {
        if (!rec.id || (dasar === undefined && !lama)) return Promise.resolve();
        return bacaJson(jenis + '.json', repoJenis(jenis)).then(function (list) { cekVersi(list, rec, dasar); });
    }
    function urutTerbaru(a, b) { var x = a.created_at || '', y = b.created_at || ''; return x < y ? 1 : x > y ? -1 : 0; }
    /* simpan satu catatan ke file daftar, ATOMIK: dibaca & ditulis di atas kepala yang sama (lihat ubahAtomik), jadi perubahan perangkat
       lain pada catatan LAIN tidak tertimpa. file lain di repo data (mis. foto tebus) ikut dalam commit yang sama */
    function simpanDaftar(jenis, rec, hapus, tambahan, dasar) {
        var nama = jenis + '.json', rp = repoJenis(jenis), stokPisah = PISAH && jenis === 'stok', list, simpan = salin(rec);
        delete simpan._dasar;
        return ubahAtomik(rp, function (baca) {
            return baca(nama).then(function (t) {
                var l = t ? JSON.parse(t) : [];
                if (!hapus) cekVersi(l, rec, dasar);
                l = l.filter(function (x) { return x.id !== rec.id; });
                if (!hapus) l.unshift(stokPisah ? bersihStok(simpan) : simpan);
                l.sort(urutTerbaru); list = l;
                return { files: [{ path: nama, teks: JSON.stringify(l, null, 1) + '\n' }].concat(tambahan || []) };
            });
        }, (hapus ? 'Hapus ' : 'Simpan ') + (rec.kode || rec.slug || rec.id)).then(function () {
            data[jenis] = stokPisah ? gabungStok(list) : list; return stokPisah && !hapus ? simpanRahasia(rec) : null;
        }).then(function () { return data[jenis]; });
    }
    /* owner menyimpan stok: modal & asal ke repo owner bila berubah (karyawan tidak pernah melihat atau menulisnya) */
    function simpanRahasia(rec) {
        if (peran !== 'owner') return null;
        var baru = isiRahasia(rec), rh;
        if (JSON.stringify(rahasia[rec.id] || isiRahasia({})) === JSON.stringify(baru)) return null;
        return ubahAtomik('owner', function (baca) {
            return baca('stok-rahasia.json').then(function (t) { rh = t ? JSON.parse(t) : {}; rh[rec.id] = baru; return [{ path: 'stok-rahasia.json', teks: JSON.stringify(rh, null, 1) + '\n' }]; });
        }, 'Modal ' + (rec.kode || rec.id)).then(function () { rahasia = rh; data.stok = gabungStok(data.stok.map(bersihStok)); });
    }
    /* simpan catatan + file pendukungnya di dua repo (files: { situs: [], data: [] }). Repo yang memuat foto baru
       di-commit lebih dulu, supaya catatan tidak pernah merujuk foto yang belum terunggah. Bila langkah kedua gagal,
       catatan yang sudah lengkap (e.rec) dikembalikan supaya admin cukup menekan Simpan lagi */
    function simpanDua(jenis, rec, files, pesanSitus, dataDulu, dasar) {
        function situs() { return commitBila('situs', files.situs, pesanSitus); }
        function utama() { return simpanDaftar(jenis, rec, false, files[repoJenis(jenis)], dasar); }
        return (dataDulu ? utama : situs)().then(function () {
            return (dataDulu ? situs : utama)().catch(function (e) {
                e.sebagian = true; e.rec = salin(rec);
                if (!dataDulu) { if (dasar === undefined) delete e.rec.updated_at; else e.rec.updated_at = dasar; } /* data utama belum berubah: versinya tetap yang lama */
                e.message = (dataDulu ? 'Data tersimpan, tapi halaman di situs belum diperbarui: ' : 'Halaman di situs sudah diperbarui, tapi data utama gagal disimpan: ') + e.message + ' Tekan Simpan sekali lagi.';
                throw e;
            });
        }).then(function () { return salin(rec); });
    }
    function hapusDua(jenis, rec, files, pesanSitus) {
        return commitBila('situs', files.situs, pesanSitus).then(function () { return simpanDaftar(jenis, rec, true, files[repoJenis(jenis)]); });
    }
    function idBaru() { return crypto.randomUUID ? crypto.randomUUID() : acakHex(16); }
    /* catatan baru: id, kode unik (mis. AYR-XXXXXX), waktu dibuat */
    function siapkanBaru(rec, list, awalan, sekarang) {
        if (rec.id) return;
        var dipakai = list.map(function (x) { return x.kode; });
        do { rec.kode = L.kodeBaru(awalan); } while (dipakai.indexOf(rec.kode) > -1);
        rec.id = idBaru(); rec.created_at = sekarang;
    }

    /* ---------- tempat foto ----------
       servis: terenkripsi di repo situs (data/foto/), tebus: terenkripsi di repo data (foto/), stok: publik di repo situs (foto/stok/) */
    function lokasiFoto(f, besar) {
        if (f.repo === 'publik') return { repo: 'situs', path: besar ? f.path : f.thumb_path || f.path, kunci: false };
        var nama = besar ? f.file : f.thumb || f.file;
        return f.repo === 'data' ? { repo: PISAH ? 'owner' : 'data', path: 'foto/' + nama, kunci: true } : { repo: 'situs', path: 'data/foto/' + nama, kunci: true };
    }
    /* file foto (besar & kecil) yang dihapus, dimasukkan ke daftar file repo masing-masing */
    function hapusFoto(daftar, files) {
        daftar.forEach(function (f) { [true, false].forEach(function (b) { var l = lokasiFoto(f, b); (files[l.repo] = files[l.repo] || []).push({ path: l.path, hapus: true }); }); });
        return files;
    }
    function hapusFotoHilang(lama, rec, files) {
        hapusFoto((lama && lama.foto || []).filter(function (f) { return !rec.foto.some(function (x) { return x.id === f.id; }); }), files);
    }
    function fotoMentah(s, f, besar) {
        var l = lokasiFoto(f, besar);
        return bacaFile(l.repo, l.path, true).then(function (buf) {
            if (!buf) throw new Error('Foto tidak ditemukan');
            return l.kunci ? kunciFoto(s.fk).then(function (k) { return dekripsi(k, buf); }) : buf;
        }).then(function (b) { return new Blob([b], { type: f.tipe || 'image/webp' }); });
    }
    L.api.fotoBlob = fotoMentah;
    /* foto untuk admin: dibaca langsung dari repo (tidak perlu menunggu situs diperbarui) */
    L.api.fotoAdmin = function (s, f, besar) {
        var c = 'a:' + lokasiFoto(f, besar).path;
        return fotoCache[c] || simpanUrl(c, fotoMentah(s, f, besar).then(keUrl));
    };
    /* foto yang baru diunggah langsung dipakai untuk tampilan admin, tanpa diunduh lagi */
    function pratinjauAdmin(f, kecil) { fotoCache['a:' + lokasiFoto(f, false).path] = Promise.resolve(keUrl(kecil)); }
    /* foto baru dienkripsi dengan kunci foto catatan; menambah catatan foto ke rec dan file ke files */
    function unggahTerkunci(rec, fotoBaru, folder, files, meta) {
        if (!fotoBaru.length) return Promise.resolve();
        return kunciFoto(rec.fk).then(function (key) {
            return Promise.all(fotoBaru.map(function (fb) {
                var nama = acakHex(12);
                return Promise.all([fb.hasil.besar.arrayBuffer(), fb.hasil.kecil.arrayBuffer()])
                    .then(function (buf) { return Promise.all([enkripsi(key, buf[0]), enkripsi(key, buf[1])]); })
                    .then(function (ct) { return { fb: fb, nama: nama, ct: ct }; });
            }));
        }).then(function (hasil) {
            hasil.forEach(function (x) {
                var f = Object.assign({ id: x.nama, tahap: x.fb.tahap, file: x.nama + '.bin', thumb: x.nama + '-k.bin', tipe: x.fb.hasil.besar.type }, meta(x.fb));
                files.push({ path: folder + f.file, base64: b64(x.ct[0]) }, { path: folder + f.thumb, base64: b64(x.ct[1]) });
                rec.foto.push(f); pratinjauAdmin(f, x.fb.hasil.kecil);
            });
        });
    }
    /* versi publik terenkripsi (data/<folder>/<id>.json): dihapus bila batal, dipindah bila nomor HP (kunci) berubah,
       dan hanya ditulis bila berbeda dari yang ada di situs (mis. mencatat pengingat WA tidak membangun ulang situs) */
    function filePublik(folder, rec, lama, proyeksi, files, simpanBatal) {
        return L.kunciServis(rec.kode, L.hp4(rec.hp)).then(function (k) {
            var p = 'data/' + folder + '/', path = p + k.id + '.json', diSitus = lama && lama.pubId === k.id;
            if (lama && lama.pubId && !diSitus) files.push({ path: p + lama.pubId + '.json', hapus: true });
            if (rec.status === 'batal' && !simpanBatal) { if (diSitus) files.push({ path: path, hapus: true }); rec.pubId = null; return; }
            var teks = JSON.stringify(proyeksi(rec));
            rec.pubId = k.id;
            return (diSitus ? bacaFile('situs', path).then(function (ada) {
                return ada ? dekripsi(k.key, unb64(JSON.parse(ada).d)).then(function (b) { return td.decode(b); }) : null;
            }).catch(function () { return null; }) : Promise.resolve(null)).then(function (sekarang) {
                if (sekarang !== teks) return enkripsi(k.key, te.encode(teks)).then(function (ct) { files.push({ path: path, teks: JSON.stringify({ v: 1, d: b64(ct) }) }); });
            });
        });
    }

    /* ---------- servis ---------- */
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
            fk: foto.length ? s.fk : undefined
        };
    }
    /* simpan servis: (1) foto + versi publik terenkripsi ke situs dalam satu commit, (2) data lengkap ke repo privat */
    L.api.simpanServis = function (rec, fotoBaru) {
        rec = salin(rec);
        var dv = ambilDasar(rec), dasar = dv.d, sekarang = new Date().toISOString(), lama = cari(data.servis, rec.id), files = { situs: [], data: [] }, t = L.hariIni();
        siapkanBaru(rec, data.servis, 'AYR', sekarang);
        L.kunciServis(rec.kode, L.hp4(rec.hp)); /* mulai hitung kunci (lambat) bersamaan dengan enkripsi foto */
        if (!rec.fk) rec.fk = b64(crypto.getRandomValues(new Uint8Array(32)));
        rec.items = rec.items || []; rec.bayar = rec.bayar || []; rec.foto = rec.foto || []; rec.updated_at = dv.ulang && rec.updated_at ? rec.updated_at : sekarang;
        if (L.beres(rec) && !rec.tgl_selesai) rec.tgl_selesai = t;
        if (rec.status === 'diambil' && !rec.tgl_diambil) rec.tgl_diambil = t;
        return cekBentrok('servis', rec, dasar, lama)
            .then(function () { return unggahTerkunci(rec, fotoBaru || [], 'data/foto/', files.situs, function (fb) { return { keterangan: fb.keterangan || '', tampil: fb.tampil !== false, created_at: sekarang }; }); })
            .then(function () { hapusFotoHilang(lama, rec, files); return filePublik('servis', rec, lama, versiPublik, files.situs); })
            .then(function () { return simpanDua('servis', rec, files, 'Servis: perbarui data pelanggan', false, dasar); }).catch(tandaiRec(rec, dasar));
    };
    L.api.hapusServis = function (rec) {
        var files = hapusFoto(rec.foto || [], { situs: rec.pubId ? [{ path: 'data/servis/' + rec.pubId + '.json', hapus: true }] : [], data: [] });
        return hapusDua('servis', rec, files, 'Servis: hapus data pelanggan');
    };

    /* ---------- beli dengan hak tebus ----------
       Data lengkap + foto (gitar & KTP) hanya di repo PRIVAT (satu commit, disimpan lebih dulu).
       Surat perjanjian untuk penjual disimpan terenkripsi di situs (data/tebus), dibuka dengan kode + 4 digit HP. */
    function versiPerjanjian(t) {
        return {
            kode: t.kode, nama: t.nama, hp_samar: '••••' + L.hp4(t.hp), nik_samar: t.nik ? '••••••••••••' + String(t.nik).replace(/\D/g, '').slice(-4) : '',
            gitar_jenis: t.gitar_jenis, gitar_merk: t.gitar_merk, warna: t.warna || '', no_seri: t.no_seri || '', kelengkapan: t.kelengkapan || '',
            tgl_beli: t.tgl_beli, harga_beli: t.harga_beli, batas_tebus: t.batas_tebus, metode: t.metode,
            status: t.status, tgl_tebus: t.tgl_tebus || null, tgl_berakhir: t.tgl_berakhir || null, disetujui: t.disetujui || null
        };
    }
    L.api.simpanTebus = function (rec, fotoBaru) {
        rec = salin(rec);
        var dasar = ambilDasar(rec).d, sekarang = new Date().toISOString(), lama = cari(data.tebus, rec.id), files = { situs: [], data: [], owner: [] };
        if (peran !== 'owner') return Promise.reject(new Error('Tebus hanya untuk owner.'));
        siapkanBaru(rec, data.tebus, 'TBS', sekarang);
        L.kunciServis(rec.kode, L.hp4(rec.hp));
        if (!rec.fk) rec.fk = b64(crypto.getRandomValues(new Uint8Array(32)));
        rec.foto = rec.foto || []; rec.updated_at = sekarang; delete rec.biaya_admin; /* kebijakan toko: tanpa biaya tambahan */
        if (rec.status === 'ditebus' && !rec.tgl_tebus) rec.tgl_tebus = L.hariIni();
        if (rec.status === 'milik_toko' && !rec.tgl_berakhir) rec.tgl_berakhir = L.hariIni();
        return cekBentrok('tebus', rec, dasar, lama)
            .then(function () { return unggahTerkunci(rec, fotoBaru || [], 'foto/', files[repoJenis('tebus')], function () { return { repo: 'data', created_at: sekarang }; }); })
            .then(function () { hapusFotoHilang(lama, rec, files); return filePublik('tebus', rec, lama, versiPerjanjian, files.situs); })
            .then(function () { return simpanDua('tebus', rec, files, 'Tebus: perbarui surat perjanjian', true, dasar); });
    };
    L.api.hapusTebus = function (rec) {
        var files = hapusFoto(rec.foto || [], { situs: rec.pubId ? [{ path: 'data/tebus/' + rec.pubId + '.json', hapus: true }] : [], data: [], owner: [] });
        return hapusDua('tebus', rec, files, 'Tebus: hapus surat perjanjian');
    };

    /* ---------- stok (gitar & aksesoris) ----------
       Data lengkap (modal, asal barang, no. seri, penjualan) hanya di repo PRIVAT (stok.json).
       Barang yang tersedia + foto produk dipublikasikan ke situs: data/katalog.json dan foto/stok/ (tanpa enkripsi). */
    L.KONDISI = { baru: 'Baru', bekas: 'Bekas' };
    L.STATUS_STOK = { tersedia: 'Tersedia', dipesan: 'Dipesan', terjual: 'Terjual', ditarik: 'Ditarik' };
    L.namaStok = function (s) { return s.kategori === 'aksesoris' ? (s.nama || 'Aksesoris') : (s.gitar_merk || s.gitar_jenis || 'Gitar'); };
    L.jenisStok = function (s) { return s.kategori === 'aksesoris' ? (s.sub || 'Aksesoris') : (s.gitar_jenis || 'Gitar'); };
    L.diKatalog = function (s) { return s.tampil !== false && (s.status === 'tersedia' || s.status === 'dipesan') && +s.harga_jual > 0 && +s.jumlah > 0; };
    function versiKatalog(s) {
        var aks = s.kategori === 'aksesoris';
        return {
            kode: s.kode, kategori: aks ? 'aksesoris' : 'gitar', jenis: L.jenisStok(s), kondisi: s.kondisi || 'baru', nama: L.namaStok(s), warna: s.warna || '',
            deskripsi: s.deskripsi || '', harga: +s.harga_jual, status: s.status, sisa: aks && +s.jumlah <= C.katalogSisaTampil ? +s.jumlah : null,
            foto: (s.foto || []).filter(function (f) { return f.repo === 'publik'; }).map(function (f) { return { src: f.path, kecil: f.thumb_path || f.path }; }),
            masuk: s.tgl_masuk || ''
        };
    }
    L.untungStok = function (s) {
        var untung = 0, unit = 0;
        (s.penjualan || []).forEach(function (p) { untung += (p.harga - (+s.harga_beli || 0)) * p.qty; unit += p.qty; });
        return { unitTerjual: unit, untung: untung, potensi: (+s.jumlah || 0) * ((+s.harga_jual || 0) - (+s.harga_beli || 0)) };
    };
    /* katalog publik dibuat ulang dari seluruh stok terbaru; ditulis hanya bila isinya berubah */
    function fileKatalog(ganti, hapus) {
        return bacaJson('stok.json').then(function (list) {
            return fileKatalogDari(list.filter(function (x) { return x.id !== (ganti || hapus).id; }).concat(ganti ? [ganti] : []));
        });
    }
    function fileKatalogDari(list) {
        return bacaFile('situs', 'data/katalog.json').then(function (lama) {
            var item = list.filter(L.diKatalog).sort(function (a, b) { return (b.tgl_masuk || '') < (a.tgl_masuk || '') ? -1 : 1; }).map(versiKatalog);
            var teks = JSON.stringify({ toko: C.toko.nama, item: item }, null, 1) + '\n';
            return lama === teks ? [] : [{ path: 'data/katalog.json', teks: teks }];
        });
    }
    function fotoPublikStok(besar, kecil, tipe, files, sekarang) {
        var nama = acakHex(10), ext = tipe === 'image/jpeg' ? '.jpg' : '.webp', p = 'foto/stok/' + nama + ext, pk = 'foto/stok/' + nama + '-k' + ext;
        return Promise.all([besar.arrayBuffer(), kecil.arrayBuffer()]).then(function (buf) {
            var f = { id: nama, tahap: 'gitar', path: p, thumb_path: pk, tipe: tipe, repo: 'publik', created_at: sekarang };
            files.push({ path: p, base64: b64(buf[0]) }, { path: pk, base64: b64(buf[1]) });
            pratinjauAdmin(f, kecil); return f;
        });
    }
    L.api.simpanStok = function (rec, fotoBaru) {
        rec = salin(rec);
        var dasar = ambilDasar(rec).d, sekarang = new Date().toISOString(), lama = cari(data.stok, rec.id), files = { situs: [], data: [] };
        siapkanBaru(rec, data.stok, 'STK', sekarang);
        rec.kategori = rec.kategori || 'gitar';
        rec.foto = rec.foto || []; rec.penjualan = rec.penjualan || []; rec.updated_at = sekarang;
        /* habis tapi masih ditahan pesanan DP: tetap Dipesan */
        if (rec.status !== 'ditarik') rec.status = +rec.jumlah > 0 ? (rec.status === 'dipesan' ? 'dipesan' : 'tersedia') : (rec.status === 'dipesan' ? 'dipesan' : 'terjual');
        /* foto lama yang masih terenkripsi (dari tebus / versi sebelumnya) dijadikan foto produk publik; file lamanya
           terhapus lewat hapusFotoHilang karena id-nya berganti */
        return cekBentrok('stok', rec, dasar, lama).then(function () {
            return Promise.all(rec.foto.map(function (f) {
                if (f.repo === 'publik') return f;
                return Promise.all([fotoMentah(rec, f, true), fotoMentah(rec, f, false)]).then(function (b) { return fotoPublikStok(b[0], b[1], f.tipe, files.situs, sekarang); });
            }));
        }).then(function (foto) {
            rec.foto = foto;
            return Promise.all((fotoBaru || []).map(function (fb) { return fotoPublikStok(fb.hasil.besar, fb.hasil.kecil, fb.hasil.besar.type, files.situs, sekarang); }));
        }).then(function (fotoTambah) {
            rec.foto = rec.foto.concat(fotoTambah);
            hapusFotoHilang(lama, rec, files);
            if (rec.foto.every(function (f) { return f.repo === 'publik'; })) delete rec.fk;
            return fileKatalog(rec);
        }).then(function (kat) {
            /* foto produk + katalog ke situs dulu (data utama merujuk ke file itu), lalu data utama ke repo privat */
            files.situs = files.situs.concat(kat);
            return simpanDua('stok', rec, files, 'Stok: perbarui katalog', false, dasar);
        });
    };
    L.api.hapusStok = function (rec) {
        var files = hapusFoto(rec.foto || [], { situs: [], data: [] });
        return fileKatalog(null, rec).then(function (kat) { files.situs = files.situs.concat(kat); return hapusDua('stok', rec, files, 'Stok: perbarui katalog'); });
    };

    /* ---------- jual stok (lunas, atau DP lalu pelunasan) ----------
       Satu transaksi = pembeli + barang dari stok + pembayaran bertahap. Saat dibuat, jumlah stok langsung dikurangi
       (barang ditahan dan hilang dari katalog); bila batal, stok dikembalikan. Data lengkap di repo privat (jual.json);
       nota untuk pembeli disimpan terenkripsi di situs (data/jual), dibuka dengan kode + 4 digit HP. */
    L.STATUS_JUAL = { dp: 'Dipesan (DP)', lunas: 'Lunas, belum diambil', selesai: 'Selesai', batal: 'Batal' };
    L.urlNotaJual = function (kode) { return L.situs() + 'nota-jual.html?k=' + encodeURIComponent(kode); };
    L.hitungJual = function (j) {
        var total = 0, dibayar = 0, kembali = 0, bulat = C.bulatkanKe;
        (j.items || []).forEach(function (i) { total += (+i.harga || 0) * (+i.qty || 1); });
        (j.bayar || []).forEach(function (b) { if (b.jenis === 'refund') kembali += +b.jumlah || 0; else dibayar += +b.jumlah || 0; });
        /* biaya pembatalan oleh pembeli: % harga barang, paling banyak sebesar uang yang sudah dibayar; batal oleh toko tanpa potongan */
        var potongan = j.batal_oleh === 'toko' ? 0 : Math.min(dibayar, Math.round(total * C.jual.potonganPersen / 100 / bulat) * bulat);
        return {
            total: total, dibayar: dibayar, kembali: kembali, sisa: Math.max(0, total - dibayar), lunas: total > 0 && dibayar >= total,
            potongan: potongan, harusKembali: Math.max(0, dibayar - potongan)
        };
    };
    L.infoJual = function (j, hariIni) {
        var sisa = j.status === 'dp' && j.batas_lunas ? L.hariAntara(hariIni || L.hariIni(), j.batas_lunas) : null;
        return { sisa: sisa, lewat: sisa != null && sisa < 0 };
    };
    L.perluIngatJual = function (j, hariIni) {
        var i = L.infoJual(j, hariIni), terakhir = (j.pengingat || []).slice(-1)[0] || '';
        if (i.sisa == null) return false;
        if (i.lewat) return true;
        return C.jual.pengingatHari.some(function (d) { return i.sisa <= d && terakhir < L.tambahHari(j.batas_lunas, -d); });
    };
    L.namaJual = function (j) { return (j.items || []).map(function (i) { return i.nama + (i.qty > 1 ? ' ×' + i.qty : ''); }).join(', ') || 'Barang'; };
    L.ketentuanJual = function (j) {
        return C.jual.ketentuan.map(function (k) {
            return k.split('{batas}').join(j.batas_lunas ? L.tglPanjang(j.batas_lunas) : 'batas yang disepakati').split('{potongan}').join(String(C.jual.potonganPersen));
        });
    };
    function barisBarang(j) { return (j.items || []).map(function (i) { return '• ' + i.nama + (i.qty > 1 ? ' ×' + i.qty : '') + ' – ' + L.rupiah(i.harga * (i.qty || 1)); }).join('\n'); }
    L.pesanJual = {
        /* bukti pesanan dengan DP: pembeli diminta membalas SETUJU atas ketentuan */
        dp: function (j) {
            var h = L.hitungJual(j);
            return 'Halo Kak ' + j.nama + ', terima kasih sudah memesan di ' + C.toko.nama + ' 🙏\n\n' + barisBarang(j) + '\n\n' +
                'Kode pesanan: *' + j.kode + '*\nTotal: *' + L.rupiah(h.total) + '*\nSudah dibayar (DP): ' + L.rupiah(h.dibayar) + '\nSisa: *' + L.rupiah(h.sisa) + '*\n' +
                'Barang kami tahan sampai *' + L.tgl(j.batas_lunas) + '*. Pelunasan tunai di toko atau transfer ke ' + L.rekeningTeks() + '.\n\n' +
                'Bila batal atau belum lunas sampai tanggal tersebut, DP dikembalikan dipotong biaya pembatalan ' + C.jual.potonganPersen + '% dari harga barang (paling banyak sebesar DP' + (h.potongan ? ', yaitu ' + L.rupiah(h.potongan) : '') + ').\n\n' +
                'Nota & ketentuan lengkap: ' + L.urlNotaJual(j.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)\n\nMohon balas *SETUJU* bila ketentuan di atas sudah sesuai.';
        },
        pengingat: function (j) {
            var h = L.hitungJual(j), i = L.infoJual(j);
            return 'Halo Kak ' + j.nama + ', kami mengingatkan pesanan ' + L.namaJual(j) + ' (kode *' + j.kode + '*) masih kami tahan.\n\n' +
                'Sisa pembayaran: *' + L.rupiah(h.sisa) + '*\nBatas pelunasan: *' + L.tgl(j.batas_lunas) + '*' + (i.lewat ? ' (sudah lewat)' : i.sisa ? ' (' + i.sisa + ' hari lagi)' : ' (hari ini)') + '\n' +
                'Pelunasan tunai di toko atau transfer ke ' + L.rekeningTeks() + '.\n' + jamBuka() + '\nNota: ' + L.urlNotaJual(j.kode);
        },
        lunas: function (j) {
            return 'Halo Kak ' + j.nama + ', pembayaran ' + L.namaJual(j) + ' (kode *' + j.kode + '*) sudah *LUNAS* ✅ Terima kasih!\n' +
                (j.status === 'selesai' ? '' : 'Barang bisa diambil di toko.\n' + jamBuka()) + '\nNota: ' + L.urlNotaJual(j.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)\n\nSelamat bermain musik 🎸';
        },
        batal: function (j) {
            var h = L.hitungJual(j);
            return 'Halo Kak ' + j.nama + ', pesanan ' + L.namaJual(j) + ' (kode *' + j.kode + '*) sudah kami batalkan' + (j.tgl_batal ? ' pada ' + L.tgl(j.tgl_batal) : '') + '.\n\n' +
                'Uang yang sudah dibayar: ' + L.rupiah(h.dibayar) + '\n' + (h.potongan ? 'Biaya pembatalan (' + C.jual.potonganPersen + '% dari harga barang, paling banyak sebesar DP): ' + L.rupiah(h.potongan) + '\n' : 'Tanpa potongan.\n') +
                'Dikembalikan: *' + L.rupiah(h.kembali || h.harusKembali) + '*\n\nNota: ' + L.urlNotaJual(j.kode);
        }
    };
    function versiNotaJual(j) {
        return {
            kode: j.kode, nama: j.nama, hp_samar: '••••' + L.hp4(j.hp), tgl: j.tgl, status: j.status, batas_lunas: j.batas_lunas || null,
            tgl_lunas: j.tgl_lunas || null, tgl_selesai: j.tgl_selesai || null, tgl_batal: j.tgl_batal || null, batal_oleh: j.batal_oleh || null, disetujui: j.disetujui || null,
            items: (j.items || []).map(function (i) { return { nama: i.nama, qty: i.qty, harga: i.harga }; }),
            bayar: (j.bayar || []).map(function (b) { return { tgl: b.tgl, jumlah: b.jumlah, jenis: b.jenis, metode: b.metode }; })
        };
    }
    /* status barang setelah transaksi berubah: habis + masih ada pesanan berjalan = Dipesan, habis saja = Terjual */
    function statusStokDari(s, jualList) {
        if (s.status === 'ditarik') return 'ditarik';
        var ditahan = jualList.some(function (j) { return (j.status === 'dp' || j.status === 'lunas') && (j.items || []).some(function (i) { return i.stok_id === s.id; }); });
        /* masih ada unit: tetap "Dipesan" hanya selama memang ada pesanan berjalan; pesanan batal/dihapus mengembalikannya jadi Tersedia */
        if (+s.jumlah > 0) return s.status === 'dipesan' && ditahan ? 'dipesan' : 'tersedia';
        return ditahan ? 'dipesan' : 'terjual';
    }
    /* terapkan transaksi ke daftar stok (jumlah + catatan penjualan). aktif = transaksi masih menahan barang */
    function terapkanStok(rec, stokList, aktifLama, aktifBaru) {
        var diubah = {};
        (rec.items || []).forEach(function (it, n) {
            var s = stokList.filter(function (x) { return x.id === it.stok_id; })[0];
            if (!s) { if (!aktifLama && aktifBaru) throw new Error('Barang ' + it.nama + ' tidak ada lagi di stok.'); return; }
            s.penjualan = s.penjualan || [];
            if (!aktifLama && aktifBaru) {
                if ((+s.jumlah || 0) < it.qty) throw new Error('Stok ' + it.nama + ' tinggal ' + (+s.jumlah || 0) + ' unit.');
                s.jumlah = (+s.jumlah || 0) - it.qty;
                s.penjualan.push({ id: rec.id + '-' + n, tgl: rec.tgl, qty: it.qty, harga: it.harga, catatan: rec.kode + (rec.nama ? ' · ' + rec.nama : ''), jual_id: rec.id });
            } else if (aktifLama && !aktifBaru) {
                s.jumlah = (+s.jumlah || 0) + it.qty;
                s.penjualan = s.penjualan.filter(function (p) { return p.jual_id !== rec.id; });
            }
            diubah[s.id] = s;
        });
        return diubah;
    }
    function aturStatusStok(diubah, jualList, sekarang) {
        Object.keys(diubah).forEach(function (id) { var s = diubah[id]; s.status = statusStokDari(s, jualList); s.updated_at = sekarang; });
    }
    function urutBaru(list) { return list.sort(urutTerbaru); }
    /* jual.json + stok.json dalam SATU commit atomik di repo privat (dihitung ulang dari data terbaru bila ada bentrok), lalu nota + katalog di situs.
       hitung({ jual, stok }) -> Promise { jualBaru, stokBaru, adaStok, situs } */
    function simpanJualStok(rec, hitung, pesan) {
        var h;
        return ubahAtomik('data', function (baca) {
            return Promise.all([baca('jual.json'), baca('stok.json')]).then(function (r) {
                return hitung({ jual: r[0] ? JSON.parse(r[0]) : [], stok: r[1] ? JSON.parse(r[1]) : [] });
            }).then(function (x) {
                h = x;
                var files = [{ path: 'jual.json', teks: JSON.stringify(x.jualBaru, null, 1) + '\n' }];
                if (x.adaStok) files.push({ path: 'stok.json', teks: JSON.stringify(x.stokBaru, null, 1) + '\n' });
                return files;
            });
        }, pesan).then(function () {
            data.jual = h.jualBaru; if (h.adaStok) data.stok = gabungStok(h.stokBaru);
            return commitBila('situs', h.situs, 'Jual: perbarui nota & katalog').catch(function (e) {
                e.sebagian = true; e.rec = salin(rec);
                e.message = 'Data tersimpan, tapi nota/katalog di situs belum diperbarui: ' + e.message + ' Tekan Simpan sekali lagi.';
                throw e;
            });
        });
    }
    L.api.simpanJual = function (rec) {
        rec = salin(rec);
        var dv = ambilDasar(rec), dasar = dv.d, sekarang = new Date().toISOString(), t = L.hariIni();
        siapkanBaru(rec, data.jual, 'JUL', sekarang);
        rec.items = rec.items || []; rec.bayar = rec.bayar || []; rec.updated_at = dv.ulang && rec.updated_at ? rec.updated_at : sekarang; rec.tgl = rec.tgl || t;
        var h = L.hitungJual(rec);
        if (rec.status !== 'batal' && rec.status !== 'selesai') rec.status = h.lunas ? 'lunas' : 'dp';
        if (rec.status === 'dp' && !rec.batas_lunas) rec.batas_lunas = L.tambahHari(rec.tgl, C.jual.batasHari);
        if (h.lunas && !rec.tgl_lunas) rec.tgl_lunas = t;
        if (rec.status === 'selesai' && !rec.tgl_selesai) rec.tgl_selesai = t;
        if (rec.status === 'batal' && !rec.tgl_batal) rec.tgl_batal = t;
        if (L.hp4(rec.hp)) L.kunciServis(rec.kode, L.hp4(rec.hp));
        return simpanJualStok(rec, function (b) {
            /* versi di repo (bukan di memori) yang menentukan apakah stok sudah dikurangi: aman bila Simpan diulang */
            var diFile = cekVersi(b.jual, rec, dasar), aktifLama = !!diFile && diFile.status !== 'batal', aktifBaru = rec.status !== 'batal', situs = [];
            var jualBaru = urutBaru(b.jual.filter(function (x) { return x.id !== rec.id; }).concat([rec]));
            var stokBaru = b.stok, diubah = terapkanStok(rec, stokBaru, aktifLama, aktifBaru);
            aturStatusStok(diubah, jualBaru, sekarang);
            var adaStok = Object.keys(diubah).length > 0, langkah;
            if (L.hp4(rec.hp)) langkah = filePublik('jual', rec, diFile, versiNotaJual, situs, true);
            else { if (diFile && diFile.pubId) situs.push({ path: 'data/jual/' + diFile.pubId + '.json', hapus: true }); rec.pubId = null; langkah = Promise.resolve(); }
            /* katalog selalu dicocokkan dengan stok terbaru (file ditulis hanya bila isinya beda): kalau simpanan sebelumnya gagal di langkah ini, ulangan Simpan yang menuntaskannya */
            return langkah.then(function () { return fileKatalogDari(stokBaru); }).then(function (kat) {
                return { jualBaru: jualBaru, stokBaru: stokBaru, adaStok: adaStok, situs: situs.concat(kat) };
            });
        }, 'Simpan ' + rec.kode).then(function () { return salin(rec); }, tandaiRec(rec, dasar));
    };
    L.api.hapusJual = function (rec) {
        var sekarang = new Date().toISOString();
        return simpanJualStok(rec, function (b) {
            var diFile = cari(b.jual, rec.id), situs = [], jualBaru = b.jual.filter(function (x) { return x.id !== rec.id; }), stokBaru = b.stok;
            var diubah = diFile ? terapkanStok(diFile, stokBaru, diFile.status !== 'batal', false) : {};
            aturStatusStok(diubah, jualBaru, sekarang);
            if (diFile && diFile.pubId) situs.push({ path: 'data/jual/' + diFile.pubId + '.json', hapus: true });
            var adaStok = Object.keys(diubah).length > 0;
            return fileKatalogDari(stokBaru).then(function (kat) { return { jualBaru: jualBaru, stokBaru: stokBaru, adaStok: adaStok, situs: situs.concat(kat) }; });
        }, 'Hapus ' + rec.kode);
    };
    L.api.daftar = function (jenis) { return salin(data[jenis] || []); };

    /* ---------- karyawan & jam masuk ----------
       pengaturan.json (repo bersama): daftar karyawan + jam shift, diatur owner. absen.json: catatan masuk/keluar. */
    L.api.pengaturan = function () { return salin(data.pengaturan || {}); };
    L.api.simpanPengaturan = function (atur) {
        if (peran !== 'owner') return Promise.reject(new Error('Pengaturan karyawan hanya untuk owner.'));
        atur = salin(atur); var dasar = atur.updated_at; atur.updated_at = new Date().toISOString();
        return ubahAtomik('data', function (baca) {
            return baca('pengaturan.json').then(function (t) {
                var ada = t ? JSON.parse(t) : null;
                if (ada && ada.updated_at != null && ada.updated_at !== dasar && ada.updated_at !== atur.updated_at) throw bentrok();
                return [{ path: 'pengaturan.json', teks: JSON.stringify(atur, null, 1) + '\n' }];
            });
        }, 'Pengaturan karyawan & shift').then(function () { data.pengaturan = atur; return salin(atur); });
    };
    /* jadwal masuk hari itu: Jumat boleh beda jam */
    L.jadwalStaf = function (st, tgl) {
        var d = L.tglObj(tgl) || new Date(), jumat = d.getDay() === 5;
        return { masuk: (jumat && st.masuk_jumat) || st.masuk || '12:00', pulang: st.pulang || '19:00' };
    };
    function menit(hhmm) { var m = /^(\d{1,2})[:.](\d{2})/.exec(hhmm || ''); return m ? +m[1] * 60 + +m[2] : null; }
    L.telatMenit = function (jamMasuk, jadwal) { var a = menit(jamMasuk), b = menit(jadwal); return a == null || b == null ? 0 : Math.max(0, a - b); };
    L.statusAbsen = function (a, toleransi) {
        var t = a.telat || 0;
        return t > (toleransi || 0) ? { telat: true, label: 'Terlambat ' + t + ' menit' } : { telat: false, label: 'Tepat waktu' };
    };
    L.api.simpanAbsen = function (rec) {
        rec = salin(rec); var dv = ambilDasar(rec), sekarang = new Date().toISOString();
        if (!rec.id) { rec.id = idBaru(); rec.created_at = sekarang; }
        rec.updated_at = dv.ulang && rec.updated_at ? rec.updated_at : sekarang;
        return simpanDaftar('absen', rec, false, undefined, dv.d).then(function () { return salin(rec); }, tandaiRec(rec, dv.d));
    };

    /* ---------- kas harian: buka kasir (saldo awal), pengeluaran, tutup kasir (hitung uang laci) ----------
       Satu catatan per tanggal di kas.json (repo bersama). Perubahan selalu diterapkan ke versi terbaru di repo,
       supaya pengeluaran yang dicatat dari dua perangkat tidak saling menimpa. */
    L.KATEGORI_KELUAR = ['Part & bahan servis', 'Perlengkapan toko', 'Transport & ongkir', 'Makan & minum', 'Gaji & bonus', 'Listrik, internet, sewa', 'Lainnya'];
    L.api.ubahKas = function (tgl, ubah) {
        var hasil;
        return ubahAtomik('data', function (baca) {
            return baca('kas.json').then(function (t) {
                var list = t ? JSON.parse(t) : [], sekarang = new Date().toISOString(), rec = list.filter(function (x) { return x.tgl === tgl; })[0];
                if (!rec) { rec = { id: idBaru(), tgl: tgl, created_at: sekarang, pengeluaran: [] }; list.push(rec); }
                rec.pengeluaran = rec.pengeluaran || [];
                ubah(rec); rec.updated_at = sekarang;
                list.sort(function (a, b) { return a.tgl < b.tgl ? 1 : -1; });
                hasil = { list: list, rec: rec };
                return [{ path: 'kas.json', teks: JSON.stringify(list, null, 1) + '\n' }];
            });
        }, 'Kas ' + tgl).then(function () { data.kas = hasil.list; return salin(hasil.rec); });
    };

    /* ---------- stock opname ----------
       Karyawan menghitung fisik dan mengirim laporan; owner menyesuaikan stok (langsung, atau menyetujui laporan karyawan).
       Laporan tidak menyimpan rupiah: nilai selisih dihitung dari modal saat ditampilkan, hanya untuk owner. */
    L.api.simpanOpname = function (rec, sesuaikan) {
        rec = salin(rec);
        var dasar = ambilDasar(rec).d, sekarang = new Date().toISOString(), t = L.hariIni(), h;
        if (sesuaikan && peran !== 'owner') return Promise.reject(new Error('Penyesuaian stok hanya oleh owner.'));
        siapkanBaru(rec, data.opname, 'OPN', sekarang);
        rec.updated_at = sekarang; rec.tgl = rec.tgl || t;
        rec.status = sesuaikan ? 'disesuaikan' : rec.status === 'disesuaikan' ? 'disesuaikan' : 'menunggu';
        if (sesuaikan && !rec.tgl_sesuai) rec.tgl_sesuai = t;
        return ubahAtomik('data', function (baca) {
            return Promise.all([baca('opname.json'), baca('stok.json')]).then(function (r) {
                var lama = r[0] ? JSON.parse(r[0]) : [], stok = r[1] ? JSON.parse(r[1]) : [], ubah = false;
                var diFile = cari(lama, rec.id), sudah = diFile && diFile.status === 'disesuaikan', list = urutBaru(lama.filter(function (x) { return x.id !== rec.id; }).concat([rec]));
                if (sesuaikan && !sudah) (rec.items || []).forEach(function (it) {
                    var s = stok.filter(function (x) { return x.id === it.stok_id; })[0];
                    if (!s || it.fisik === it.sistem) return;
                    /* dihitung ulang dari jumlah di repo saat ini: penjualan sejak hitung fisik tetap terhitung */
                    var beda = it.fisik - it.sistem; s.jumlah = Math.max(0, (+s.jumlah || 0) + beda); s.updated_at = sekarang;
                    s.catatan_admin = ((s.catatan_admin ? s.catatan_admin + '\n' : '') + 'Opname ' + rec.kode + ' ' + L.tgl(t) + ': ' + (beda > 0 ? '+' : '') + beda + (it.catatan ? ' (' + it.catatan + ')' : '')).slice(-600);
                    if (+s.jumlah > 0 && (s.status === 'terjual')) s.status = 'tersedia';
                    if (!(+s.jumlah > 0) && s.status === 'tersedia') s.status = 'ditarik';
                    ubah = true;
                });
                h = { list: list, stok: stok, ubah: ubah };
                var files = [{ path: 'opname.json', teks: JSON.stringify(list, null, 1) + '\n' }];
                if (ubah) files.push({ path: 'stok.json', teks: JSON.stringify(PISAH ? stok.map(bersihStok) : stok, null, 1) + '\n' });
                return files;
            });
        }, (sesuaikan ? 'Opname disesuaikan ' : 'Opname ') + rec.kode).then(function () {
            data.opname = h.list; if (h.ubah) data.stok = gabungStok(h.stok);
            return h.ubah ? fileKatalogDari(h.stok).then(function (kat) { return commitBila('situs', kat, 'Opname: perbarui katalog'); }).catch(function (e) {
                e.sebagian = true; e.rec = salin(rec);
                e.message = 'Opname tersimpan dan stok sudah disesuaikan, tapi katalog di situs belum diperbarui: ' + e.message + ' Tekan Simpan sekali lagi.';
                throw e;
            }) : null;
        }).then(function () { return salin(rec); }, tandaiRec(rec, dasar));
    };

    /* ---------- artikel ---------- */
    L.api.simpanArtikel = function (art) {
        art = salin(art); var dasar = ambilDasar(art).d, sekarang = new Date().toISOString(), lama = cari(data.artikel, art.id);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(art.slug || ''))) return Promise.reject(new Error('Alamat halaman hanya boleh huruf kecil, angka, dan tanda minus (contoh: setup-gitar-akustik).'));
        if (data.artikel.some(function (x) { return x.slug === art.slug && x.id !== art.id; })) return Promise.reject(new Error('Alamat halaman sudah dipakai artikel lain.'));
        if (!art.id) { art.id = idBaru(); art.created_at = sekarang; }
        art.updated_at = sekarang;
        if (art.status === 'terbit' && !art.terbit_at) art.terbit_at = sekarang;
        var perluSitus = art.status === 'terbit' || (lama && lama.status === 'terbit');
        return cekBentrok('artikel', art, dasar, lama).then(function () { return perluSitus ? terbitkan(art, lama) : null; }).then(function () { return simpanDaftar('artikel', art, false, undefined, dasar); }).then(function () { return salin(art); });
    };
    L.api.hapusArtikel = function (art) {
        var lama = cari(data.artikel, art.id);
        return (lama && lama.status === 'terbit' ? terbitkan(Object.assign({}, lama, { status: 'draf' }), lama) : Promise.resolve()).then(function () { return simpanDaftar('artikel', art, true); });
    };
    /* foto artikel bersifat publik (tidak dienkripsi); beberapa foto sekaligus dalam satu commit */
    L.api.unggahFotoArtikel = function (daftarHasil) {
        var paths = daftarHasil.map(function (h) { return 'foto/artikel/' + acakHex(10) + (h.besar.type === 'image/webp' ? '.webp' : '.jpg'); });
        return Promise.all(daftarHasil.map(function (h) { return h.besar.arrayBuffer(); })).then(function (bufs) {
            return commit('situs', bufs.map(function (b, i) { return { path: paths[i], base64: b64(b) }; }), 'Artikel: unggah foto');
        }).then(function () {
            daftarHasil.forEach(function (h, i) { fotoCache['u:' + paths[i]] = Promise.resolve(keUrl(h.besar)); });
            return paths;
        });
    };
    function fotoServisArtikel(f) {
        var s = cari(data.servis, f.servis), ff = s && cari(s.foto || [], f.foto);
        return ff ? { s: s, f: ff } : null;
    }
    L.api.fotoArtikel = function (f) {
        if (f.path) return fotoCache['u:' + f.path] || Promise.resolve(f.path);
        var x = fotoServisArtikel(f);
        return x ? L.api.fotoAdmin(x.s, x.f, false) : Promise.reject(new Error('Foto servis tidak ditemukan'));
    };
    /* tulis/hapus halaman artikel + perbarui kartu di beranda dan sitemap, semuanya dalam satu commit */
    function terbitkan(art, lama) {
        var B = window.ArtikelBuilder, tampil = art.status === 'terbit', fotoFile = [];
        /* foto dari servis (terenkripsi) disalin jadi foto publik saat pertama terbit (sekali saja, tidak ikut diulang saat bentrok) */
        return Promise.all((tampil ? art.foto || [] : []).map(function (f, i) {
            if (f.path) return;
            var x = fotoServisArtikel(f);
            if (!x) throw new Error('Foto servis untuk artikel tidak ditemukan.');
            return fotoMentah(x.s, x.f, true).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
                var p2 = 'foto/artikel/' + acakHex(10) + (x.f.tipe === 'image/jpeg' ? '.jpg' : '.webp');
                fotoFile.push({ path: p2, base64: b64(buf) }); art.foto[i] = { path: p2, alt: f.alt || '' };
            });
        })).then(function () {
            return ubahAtomik('situs', function (baca) {
                return Promise.all([baca('scripts/artikel-template.html'), baca('index.html'), baca('sitemap.xml'), tampil ? baca('artikel-' + art.slug + '.html') : null]).then(function (r) {
                    var tpl = r[0], beranda = r[1], peta = r[2], ada = r[3], files = fotoFile.slice();
                    if (!tpl || !beranda || !peta) throw new Error('File template/beranda/sitemap tidak ditemukan di repo situs.');
                    if (ada && ada.indexOf(B.PENANDA) < 0) throw new Error('Alamat artikel-' + art.slug + '.html sudah dipakai halaman buatan tangan. Ganti alamatnya.');
                    if (lama && lama.status === 'terbit' && lama.slug !== art.slug) files.push({ path: 'artikel-' + lama.slug + '.html', hapus: true });
                    if (tampil) files.push({ path: 'artikel-' + art.slug + '.html', teks: B.halaman(tpl, art, L.situs()) });
                    else if (lama) files.push({ path: 'artikel-' + lama.slug + '.html', hapus: true });
                    var semua = data.artikel.filter(function (x) { return x.id !== art.id && x.status === 'terbit'; }).concat(tampil ? [art] : [])
                        .sort(function (a, b) { return a.terbit_at < b.terbit_at ? 1 : -1; });
                    files.push({ path: 'index.html', teks: B.gantiBlok(beranda, semua.slice(0, 12).map(B.kartu).join('\n'), 'index.html') });
                    files.push({ path: 'sitemap.xml', teks: B.gantiBlok(peta, semua.map(function (a) { return B.entriSitemap(a, L.situs()); }).join('\n'), 'sitemap.xml') });
                    return files;
                });
            }, (tampil ? 'Artikel: terbitkan ' : 'Artikel: tarik ') + art.slug);
        });
    }

    /* ---------- mode offline ----------
       Salinan data terakhir disimpan di perangkat ini (IndexedDB), terenkripsi dengan kunci dari token: hanya terbaca
       setelah PIN dibuka. Saat internet putus, transaksi kasir (jual, servis tanpa foto baru, kas, jam masuk) masuk
       antrian lalu dikirim otomatis begitu online lagi. Simpan ulang aman: setiap fungsi simpan membaca versi terbaru di repo. */
    var antrian = [], gagalKirim = [], offline = false, pantau = [], lokalSiap = null, mengirim = null, jedaSalinan = null, adaMemori = false;
    function idb(mode, kerja) {
        return new Promise(function (ok, gagal) {
            var r = indexedDB.open('ayri-admin', 1);
            r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
            r.onerror = function () { gagal(r.error); };
            r.onsuccess = function () {
                var db = r.result, tx = db.transaction('kv', mode), q = kerja(tx.objectStore('kv'));
                tx.oncomplete = function () { db.close(); ok(q && q.result); };
                tx.onerror = tx.onabort = function () { db.close(); gagal(tx.error); };
            };
        });
    }
    function kunciLokal() { return crypto.subtle.digest('SHA-256', te.encode('ayri-lokal|' + token)).then(aes); }
    function tulisLokal(nama, isi) {
        if (!token || !window.indexedDB) return Promise.resolve();
        return kunciLokal().then(function (k) { return enkripsi(k, te.encode(JSON.stringify(isi))); })
            .then(function (ct) { return idb('readwrite', function (st) { return st.put(ct, nama); }); }).catch(function () {});
    }
    function bacaLokal(nama) {
        if (!token || !window.indexedDB) return Promise.resolve(null);
        return idb('readonly', function (st) { return st.get(nama); }).then(function (ct) {
            return ct ? kunciLokal().then(function (k) { return dekripsi(k, ct); }).then(function (b) { return JSON.parse(td.decode(b)); }) : null;
        }).catch(function () { return null; });
    }
    function simpanSalinan() {
        clearTimeout(jedaSalinan);
        jedaSalinan = setTimeout(function () { tulisLokal('data', { peran: peran, statusPisah: statusPisah, rahasia: rahasia, data: data, waktu: new Date().toISOString() }); }, 300);
    }
    function kabari(terkirim) { var s = L.api.statusOffline(); s.terkirim = terkirim || 0; pantau.forEach(function (fn) { try { fn(s); } catch (e) {} }); }
    function simpanAntrian() { return tulisLokal('antrian', { antri: antrian, gagal: gagalKirim }).then(function () { kabari(); }); }
    /* antrian dibaca sekali per token yang dibuka */
    function siapkanLokal() {
        var t = token;
        if (!lokalSiap || lokalSiap.t !== t) {
            lokalSiap = bacaLokal('antrian').then(function (a) { antrian = (a && a.antri) || []; gagalKirim = (a && a.gagal) || []; });
            lokalSiap.t = t;
        }
        return lokalSiap;
    }
    function taruhLokal(list, rec) { var i = list.map(function (x) { return x.id; }).indexOf(rec.id); if (i > -1) list[i] = rec; else list.unshift(rec); return list; }
    function antrikan(op, args) {
        antrian.push({ id: idBaru(), op: op, args: args, waktu: new Date().toISOString() }); offline = true;
        return simpanAntrian();
    }
    var ASLI = {};
    /* fungsi simpan yang boleh diantrikan: bila gagal karena internet, catatan diterapkan di perangkat lalu diantrikan */
    function bisaAntri(nama, terapkan) {
        var asli = ASLI[nama] = L.api[nama];
        L.api[nama] = function (rec, fotoBaru) {
            var pesanFoto = 'Tidak ada internet. Foto baru perlu internet untuk diunggah: simpan dulu tanpa foto baru, tambahkan fotonya setelah online.';
            if (fotoBaru && fotoBaru.length && navigator.onLine === false) return Promise.reject(new Error(pesanFoto));
            return asli.apply(null, arguments).catch(function (e) {
                if (!e || !e.offline || !e.rec) throw e;
                if (fotoBaru && fotoBaru.length) throw new Error(pesanFoto);
                terapkan(e.rec);
                return antrikan(nama, [e.rec]).then(function () { var r = salin(e.rec); delete r._dasar; r._antri = true; return r; });
            });
        };
    }
    bisaAntri('simpanServis', function (rec) { taruhLokal(data.servis, rec); });
    bisaAntri('simpanAbsen', function (rec) { taruhLokal(data.absen, rec); });
    bisaAntri('simpanJual', function (rec) {
        /* stok di perangkat ikut dikurangi/dikembalikan supaya barang yang sama tidak terjual dua kali saat offline */
        var lama = cari(data.jual, rec.id), stok = salin(data.stok);
        var diubah = terapkanStok(rec, stok, !!lama && lama.status !== 'batal', rec.status !== 'batal');
        data.jual = urutBaru(taruhLokal(data.jual, rec)); data.stok = stok;
        aturStatusStok(diubah, data.jual, rec.updated_at);
    });
    /* kas: perubahan dicatat sebagai selisih (kolom yang berubah + pengeluaran tambah/hapus), lalu diterapkan ke versi terbaru saat dikirim */
    function bedaKas(a, b) {
        var set = {}, abaikan = ['id', 'tgl', 'created_at', 'updated_at', 'pengeluaran'];
        Object.keys(Object.assign({}, a, b)).forEach(function (k) { if (abaikan.indexOf(k) < 0 && JSON.stringify(a[k]) !== JSON.stringify(b[k])) set[k] = k in b ? b[k] : null; });
        var pa = a.pengeluaran || [], pb = b.pengeluaran || [];
        return {
            set: set,
            tambah: pb.filter(function (p) { var x = cari(pa, p.id); return !x || JSON.stringify(x) !== JSON.stringify(p); }),
            hapus: pa.filter(function (p) { return !cari(pb, p.id); }).map(function (p) { return p.id; })
        };
    }
    function terapkanBedaKas(rec, d) {
        Object.keys(d.set).forEach(function (k) { if (d.set[k] === null) delete rec[k]; else rec[k] = d.set[k]; });
        rec.pengeluaran = (rec.pengeluaran || []).filter(function (p) { return d.hapus.indexOf(p.id) < 0 && !cari(d.tambah, p.id); }).concat(d.tambah);
    }
    ASLI.ubahKas = L.api.ubahKas;
    L.api.ubahKas = function (tgl, ubah) {
        return ASLI.ubahKas(tgl, ubah).catch(function (e) {
            if (!e || !e.offline) throw e;
            var sekarang = new Date().toISOString(), lama = data.kas.filter(function (x) { return x.tgl === tgl; })[0];
            var sebelum = lama ? salin(lama) : { id: idBaru(), tgl: tgl, created_at: sekarang, pengeluaran: [] }, rec = salin(sebelum);
            rec.pengeluaran = rec.pengeluaran || [];
            ubah(rec); rec.updated_at = sekarang;
            data.kas = data.kas.filter(function (x) { return x.tgl !== tgl; }).concat([rec]).sort(function (a, b) { return a.tgl < b.tgl ? 1 : -1; });
            return antrikan('ubahKas', [tgl, bedaKas(sebelum, rec)]).then(function () { var r = salin(rec); r._antri = true; return r; });
        });
    };
    function jalankan(x) {
        if (x.op === 'ubahKas') return ASLI.ubahKas(x.args[0], function (rec) { terapkanBedaKas(rec, x.args[1]); });
        return ASLI[x.op](x.args[0], []);
    }
    var LABEL_OP = { simpanJual: 'Penjualan', simpanServis: 'Servis', simpanAbsen: 'Jam masuk', ubahKas: 'Kas' };
    /* kirim antrian berurutan. Putus lagi: berhenti (dicoba lagi nanti). Ditolak (mis. stok sudah terjual dari perangkat lain): pindah ke daftar gagal */
    function kirimAntrian() {
        if (mengirim) return mengirim;
        if (!token || !antrian.length) return Promise.resolve(0);
        var n = 0;
        function lanjut() {
            if (!antrian.length) return Promise.resolve();
            var x = antrian[0];
            return jalankan(x).then(function () { n++; }, function (e) {
                if (e && e.offline) throw e;
                var a = x.args[0] || {};
                gagalKirim.push({ id: x.id, jenis: LABEL_OP[x.op] || x.op, ket: x.op === 'ubahKas' ? 'tanggal ' + a : [a.kode, a.nama].filter(Boolean).join(' · '), pesan: pesanError(e), waktu: x.waktu, isi: x });
            }).then(function () { antrian.shift(); return simpanAntrian(); }).then(lanjut);
        }
        mengirim = lanjut().then(function () { mengirim = null; offline = false; kabari(n); return n; }, function (e) { mengirim = null; offline = true; kabari(n); throw e; });
        return mengirim;
    }
    function pesanError(e) { return (e && e.message) || String(e); }
    L.api.muat = function () {
        return siapkanLokal().then(kirimAntrian).then(muatOnline).then(function (d) {
            adaMemori = true; offline = false; simpanSalinan(); kabari(); return d;
        }, function (e) {
            if (!e || !e.offline) throw e;
            /* tanpa internet: pakai data di memori (sudah termasuk perubahan offline), atau salinan terakhir di perangkat */
            return (adaMemori ? Promise.resolve(null) : bacaLokal('data')).then(function (s) {
                if (!adaMemori && !s) throw new Error('Tidak ada internet, dan belum ada salinan data di perangkat ini. Sambungkan internet sekali dulu.');
                if (s) { peran = s.peran; statusPisah = s.statusPisah; rahasia = s.rahasia || {}; data = s.data; adaMemori = true; }
                offline = true; kabari(); return salin(data);
            });
        });
    };
    L.api.statusOffline = function () {
        return { offline: offline, antri: antrian.length, gagal: salin(gagalKirim), daftar: antrian.map(function (x) { var a = x.args[0] || {}; return { jenis: LABEL_OP[x.op] || x.op, ket: x.op === 'ubahKas' ? 'tanggal ' + a : [a.kode, a.nama].filter(Boolean).join(' · '), waktu: x.waktu }; }) };
    };
    L.api.pantauOffline = function (fn) { pantau.push(fn); };
    L.api.kirimAntrian = function () { return siapkanLokal().then(kirimAntrian); };
    L.api.buangGagal = function () { gagalKirim = []; return simpanAntrian(); };
    /* setiap simpan yang berhasil (atau diantrikan) memperbarui salinan di perangkat */
    Object.keys(L.api).forEach(function (n) {
        if (!/^(simpan|hapus|ubah|pindahkan)/.test(n)) return;
        var f = L.api[n];
        L.api[n] = function () { return f.apply(null, arguments).then(function (r) { simpanSalinan(); return r; }); };
    });
    /* kunci: data di memori dibuang, antrian dibaca ulang saat dibuka lagi */
    var kunciAsli = L.api.kunci, lupakanAsli = L.api.lupakan;
    L.api.kunci = function () { adaMemori = false; lokalSiap = null; return kunciAsli(); };
    L.api.lupakan = function () { adaMemori = false; lokalSiap = null; if (window.indexedDB) try { indexedDB.deleteDatabase('ayri-admin'); } catch (e) {} return lupakanAsli(); };
    function cobaKirim() { if (token && antrian.length && navigator.onLine !== false) kirimAntrian().catch(function () {}); }
    window.addEventListener('online', cobaKirim);
    setInterval(cobaKirim, 60000);
})();
