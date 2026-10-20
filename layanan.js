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
    var L = window.Layanan = { C: C };

    /* ---------- tema (sama dengan situs) ---------- */
    try { if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {}

    /* ---------- format & tanggal ---------- */
    var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    E = L.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    L.rupiah = function (n) { n = Math.round(+n || 0); return (n < 0 ? '−' : '') + 'Rp' + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
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
    L.gratisHari = function () { return C.gratisTitipHari; };
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
    /* kop dokumen (nota servis & surat perjanjian) */
    L.kopNota = function (judul, kode, cap) {
        return '<header class="nota-head"><div class="nota-toko"><b>Toko Gitar <span>AYRI</span></b><p>' + E(C.toko.alamat) + '</p><p>WhatsApp +' + E(C.toko.wa) + ' · ayrigitar.com</p></div>' +
            '<div class="nota-id"><h1>' + E(judul) + '</h1><p>' + E(kode) + '</p>' + (cap || '') + '</div></header>';
    };

    /* ================= admin: GitHub sebagai tempat data ================= */
    var G = C.github, CABANG = G.cabang || 'main', RAW = 'application/vnd.github.raw+json';
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
    /* simpanCache: untuk file yang isinya tidak pernah berubah (foto bernama acak) */
    function gh(method, path, body, accept, simpanCache) {
        if (!token) return Promise.reject(new Error('Admin terkunci. Masukkan PIN lagi.'));
        var h = { Authorization: 'Bearer ' + token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
        if (body) h['Content-Type'] = 'application/json';
        return fetch('https://api.github.com/repos/' + path, { method: method, cache: simpanCache ? 'default' : 'no-store', headers: h, body: body ? JSON.stringify(body) : undefined })
            .catch(function () { throw new Error('Koneksi internet bermasalah. Coba lagi.'); })
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
    function commitBila(jenis, files, pesan) { return files.length ? commit(jenis, files, pesan) : Promise.resolve(null); }

    /* ---------- token: disimpan di perangkat ini, dikunci PIN ---------- */
    function kunciPin(pin, garam) { return pbkdf2('ayri-pin|' + pin, garam, 200000, 256).then(aes); }
    L.api.adaToken = function () { try { return !!localStorage.getItem(KUNCI_TOKEN); } catch (e) { return false; } };
    L.api.terbuka = function () { return !!token; };
    L.api.pasangToken = function (tokenBaru, pin) {
        tokenBaru = String(tokenBaru || '').trim(); token = tokenBaru;
        return Promise.all([gh('GET', repo('data')), gh('GET', repo('situs'))]).then(function (r) {
            if (!r[0].private) throw new Error('Repo data "' + (PISAH ? G.repoBersama : G.repoData) + '" masih PUBLIK. Ubah jadi Private dulu (Settings → Danger Zone → Change visibility).');
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
    L.api.kunci = function () { token = null; try { sessionStorage.removeItem(KUNCI_SESI); } catch (e) {} return Promise.resolve(); };
    L.api.lupakan = function () { L.api.kunci(); try { localStorage.removeItem(KUNCI_TOKEN); } catch (e) {} return Promise.resolve(); };

    /* ---------- data (repo privat) ---------- */
    var data = { servis: [], artikel: [], tebus: [], stok: [], jual: [], absen: [], opname: [], pengaturan: {}, kas: [] }, rahasia = {}, statusPisah = null;
    function salin(o) { return JSON.parse(JSON.stringify(o)); }
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
    L.api.muat = function () {
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
    };
    L.api.statusPisah = function () { return statusPisah; };
    /* cadangan: hanya data yang boleh dilihat pemegang token ini */
    L.api.cadangan = function () { var c = salin(data); if (peran !== 'owner') { delete c.tebus; c.stok = c.stok.map(bersihStok); } return c; };
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
    /* simpan satu catatan ke file daftar: baca versi terbaru dulu supaya perubahan dari perangkat lain tidak tertimpa.
       file lain di repo data (mis. foto tebus) ikut dalam commit yang sama */
    function simpanDaftar(jenis, rec, hapus, tambahan) {
        var nama = jenis + '.json', rp = repoJenis(jenis), stokPisah = PISAH && jenis === 'stok';
        return bacaJson(nama, rp).then(function (list) {
            list = list.filter(function (x) { return x.id !== rec.id; });
            if (!hapus) list.unshift(stokPisah ? bersihStok(rec) : rec);
            list.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
            return commit(rp, [{ path: nama, teks: JSON.stringify(list, null, 1) + '\n' }].concat(tambahan || []), (hapus ? 'Hapus ' : 'Simpan ') + (rec.kode || rec.slug || rec.id))
                .then(function () { data[jenis] = stokPisah ? gabungStok(list) : list; return stokPisah && !hapus ? simpanRahasia(rec) : null; })
                .then(function () { return data[jenis]; });
        });
    }
    /* owner menyimpan stok: modal & asal ke repo owner bila berubah (karyawan tidak pernah melihat atau menulisnya) */
    function simpanRahasia(rec) {
        if (peran !== 'owner') return null;
        var baru = isiRahasia(rec);
        if (JSON.stringify(rahasia[rec.id] || isiRahasia({})) === JSON.stringify(baru)) return null;
        return bacaFile('owner', 'stok-rahasia.json').then(function (t) {
            var rh = t ? JSON.parse(t) : {}; rh[rec.id] = baru;
            return commit('owner', [{ path: 'stok-rahasia.json', teks: JSON.stringify(rh, null, 1) + '\n' }], 'Modal ' + (rec.kode || rec.id)).then(function () {
                rahasia = rh; data.stok = gabungStok(data.stok.map(bersihStok));
            });
        });
    }
    /* simpan catatan + file pendukungnya di dua repo (files: { situs: [], data: [] }). Repo yang memuat foto baru
       di-commit lebih dulu, supaya catatan tidak pernah merujuk foto yang belum terunggah. Bila langkah kedua gagal,
       catatan yang sudah lengkap (e.rec) dikembalikan supaya admin cukup menekan Simpan lagi */
    function simpanDua(jenis, rec, files, pesanSitus, dataDulu) {
        function situs() { return commitBila('situs', files.situs, pesanSitus); }
        function utama() { return simpanDaftar(jenis, rec, false, files[repoJenis(jenis)]); }
        return (dataDulu ? utama : situs)().then(function () {
            return (dataDulu ? situs : utama)().catch(function (e) {
                e.sebagian = true; e.rec = salin(rec);
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
        var sekarang = new Date().toISOString(), lama = cari(data.servis, rec.id), files = { situs: [], data: [] }, t = L.hariIni();
        siapkanBaru(rec, data.servis, 'AYR', sekarang);
        L.kunciServis(rec.kode, L.hp4(rec.hp)); /* mulai hitung kunci (lambat) bersamaan dengan enkripsi foto */
        if (!rec.fk) rec.fk = b64(crypto.getRandomValues(new Uint8Array(32)));
        rec.items = rec.items || []; rec.bayar = rec.bayar || []; rec.foto = rec.foto || []; rec.updated_at = sekarang;
        if (L.beres(rec) && !rec.tgl_selesai) rec.tgl_selesai = t;
        if (rec.status === 'diambil' && !rec.tgl_diambil) rec.tgl_diambil = t;
        return unggahTerkunci(rec, fotoBaru || [], 'data/foto/', files.situs, function (fb) { return { keterangan: fb.keterangan || '', tampil: fb.tampil !== false, created_at: sekarang }; })
            .then(function () { hapusFotoHilang(lama, rec, files); return filePublik('servis', rec, lama, versiPublik, files.situs); })
            .then(function () { return simpanDua('servis', rec, files, 'Servis: perbarui data pelanggan'); });
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
        var sekarang = new Date().toISOString(), lama = cari(data.tebus, rec.id), files = { situs: [], data: [], owner: [] };
        if (peran !== 'owner') return Promise.reject(new Error('Tebus hanya untuk owner.'));
        siapkanBaru(rec, data.tebus, 'TBS', sekarang);
        L.kunciServis(rec.kode, L.hp4(rec.hp));
        if (!rec.fk) rec.fk = b64(crypto.getRandomValues(new Uint8Array(32)));
        rec.foto = rec.foto || []; rec.updated_at = sekarang; delete rec.biaya_admin; /* kebijakan toko: tanpa biaya tambahan */
        if (rec.status === 'ditebus' && !rec.tgl_tebus) rec.tgl_tebus = L.hariIni();
        if (rec.status === 'milik_toko' && !rec.tgl_berakhir) rec.tgl_berakhir = L.hariIni();
        return unggahTerkunci(rec, fotoBaru || [], 'foto/', files[repoJenis('tebus')], function () { return { repo: 'data', created_at: sekarang }; })
            .then(function () { hapusFotoHilang(lama, rec, files); return filePublik('tebus', rec, lama, versiPerjanjian, files.situs); })
            .then(function () { return simpanDua('tebus', rec, files, 'Tebus: perbarui surat perjanjian', true); });
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
        var sekarang = new Date().toISOString(), lama = cari(data.stok, rec.id), files = { situs: [], data: [] };
        siapkanBaru(rec, data.stok, 'STK', sekarang);
        rec.kategori = rec.kategori || 'gitar';
        rec.foto = rec.foto || []; rec.penjualan = rec.penjualan || []; rec.updated_at = sekarang;
        /* habis tapi masih ditahan pesanan DP: tetap Dipesan */
        if (rec.status !== 'ditarik') rec.status = +rec.jumlah > 0 ? (rec.status === 'dipesan' ? 'dipesan' : 'tersedia') : (rec.status === 'dipesan' ? 'dipesan' : 'terjual');
        /* foto lama yang masih terenkripsi (dari tebus / versi sebelumnya) dijadikan foto produk publik; file lamanya
           terhapus lewat hapusFotoHilang karena id-nya berganti */
        return Promise.all(rec.foto.map(function (f) {
            if (f.repo === 'publik') return f;
            return Promise.all([fotoMentah(rec, f, true), fotoMentah(rec, f, false)]).then(function (b) { return fotoPublikStok(b[0], b[1], f.tipe, files.situs, sekarang); });
        })).then(function (foto) {
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
            return simpanDua('stok', rec, files, 'Stok: perbarui katalog');
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
        if (+s.jumlah > 0) return s.status === 'dipesan' ? 'dipesan' : 'tersedia';
        var ditahan = jualList.some(function (j) { return (j.status === 'dp' || j.status === 'lunas') && (j.items || []).some(function (i) { return i.stok_id === s.id; }); });
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
    function urutBaru(list) { return list.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }
    /* jual.json + stok.json dalam satu commit di repo privat, lalu nota + katalog di situs */
    function simpanJualStok(rec, jualBaru, stokBaru, adaStok, filesSitus, pesan) {
        var files = [{ path: 'jual.json', teks: JSON.stringify(jualBaru, null, 1) + '\n' }];
        if (adaStok) files.push({ path: 'stok.json', teks: JSON.stringify(stokBaru, null, 1) + '\n' });
        return commit('data', files, pesan).then(function () {
            data.jual = jualBaru; if (adaStok) data.stok = gabungStok(stokBaru);
            return commitBila('situs', filesSitus, 'Jual: perbarui nota & katalog').catch(function (e) {
                e.sebagian = true; e.rec = salin(rec);
                e.message = 'Data tersimpan, tapi nota/katalog di situs belum diperbarui: ' + e.message + ' Tekan Simpan sekali lagi.';
                throw e;
            });
        });
    }
    L.api.simpanJual = function (rec) {
        rec = salin(rec);
        var sekarang = new Date().toISOString(), t = L.hariIni(), situs = [];
        siapkanBaru(rec, data.jual, 'JUL', sekarang);
        rec.items = rec.items || []; rec.bayar = rec.bayar || []; rec.updated_at = sekarang; rec.tgl = rec.tgl || t;
        var h = L.hitungJual(rec);
        if (rec.status !== 'batal' && rec.status !== 'selesai') rec.status = h.lunas ? 'lunas' : 'dp';
        if (rec.status === 'dp' && !rec.batas_lunas) rec.batas_lunas = L.tambahHari(rec.tgl, C.jual.batasHari);
        if (h.lunas && !rec.tgl_lunas) rec.tgl_lunas = t;
        if (rec.status === 'selesai' && !rec.tgl_selesai) rec.tgl_selesai = t;
        if (rec.status === 'batal' && !rec.tgl_batal) rec.tgl_batal = t;
        if (L.hp4(rec.hp)) L.kunciServis(rec.kode, L.hp4(rec.hp));
        return Promise.all([bacaJson('jual.json'), bacaJson('stok.json')]).then(function (r) {
            /* versi di repo (bukan di memori) yang menentukan apakah stok sudah dikurangi: aman bila Simpan diulang */
            var diFile = cari(r[0], rec.id), aktifLama = !!diFile && diFile.status !== 'batal', aktifBaru = rec.status !== 'batal';
            var jualBaru = urutBaru(r[0].filter(function (x) { return x.id !== rec.id; }).concat([rec]));
            var stokBaru = r[1], diubah = terapkanStok(rec, stokBaru, aktifLama, aktifBaru);
            aturStatusStok(diubah, jualBaru, sekarang);
            var adaStok = Object.keys(diubah).length > 0;
            var langkah;
            if (L.hp4(rec.hp)) langkah = filePublik('jual', rec, diFile, versiNotaJual, situs, true);
            else { if (diFile && diFile.pubId) situs.push({ path: 'data/jual/' + diFile.pubId + '.json', hapus: true }); rec.pubId = null; langkah = Promise.resolve(); }
            return langkah.then(function () { return adaStok ? fileKatalogDari(stokBaru) : []; }).then(function (kat) {
                return simpanJualStok(rec, jualBaru, stokBaru, adaStok, situs.concat(kat), 'Simpan ' + rec.kode);
            });
        }).then(function () { return salin(rec); });
    };
    L.api.hapusJual = function (rec) {
        return Promise.all([bacaJson('jual.json'), bacaJson('stok.json')]).then(function (r) {
            var diFile = cari(r[0], rec.id), situs = [], sekarang = new Date().toISOString();
            var jualBaru = r[0].filter(function (x) { return x.id !== rec.id; }), stokBaru = r[1];
            var diubah = diFile ? terapkanStok(diFile, stokBaru, diFile.status !== 'batal', false) : {};
            aturStatusStok(diubah, jualBaru, sekarang);
            if (diFile && diFile.pubId) situs.push({ path: 'data/jual/' + diFile.pubId + '.json', hapus: true });
            var adaStok = Object.keys(diubah).length > 0;
            return (adaStok ? fileKatalogDari(stokBaru) : Promise.resolve([])).then(function (kat) { return simpanJualStok(rec, jualBaru, stokBaru, adaStok, situs.concat(kat), 'Hapus ' + rec.kode); });
        });
    };
    L.api.daftar = function (jenis) { return salin(data[jenis] || []); };

    /* ---------- karyawan & jam masuk ----------
       pengaturan.json (repo bersama): daftar karyawan + jam shift, diatur owner. absen.json: catatan masuk/keluar. */
    L.api.pengaturan = function () { return salin(data.pengaturan || {}); };
    L.api.simpanPengaturan = function (atur) {
        if (peran !== 'owner') return Promise.reject(new Error('Pengaturan karyawan hanya untuk owner.'));
        atur = salin(atur); atur.updated_at = new Date().toISOString();
        return commit('data', [{ path: 'pengaturan.json', teks: JSON.stringify(atur, null, 1) + '\n' }], 'Pengaturan karyawan & shift').then(function () { data.pengaturan = atur; return salin(atur); });
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
        rec = salin(rec); var sekarang = new Date().toISOString();
        if (!rec.id) { rec.id = idBaru(); rec.created_at = sekarang; }
        rec.updated_at = sekarang;
        return simpanDaftar('absen', rec).then(function () { return salin(rec); });
    };

    /* ---------- kas harian: buka kasir (saldo awal), pengeluaran, tutup kasir (hitung uang laci) ----------
       Satu catatan per tanggal di kas.json (repo bersama). Perubahan selalu diterapkan ke versi terbaru di repo,
       supaya pengeluaran yang dicatat dari dua perangkat tidak saling menimpa. */
    L.KATEGORI_KELUAR = ['Part & bahan servis', 'Perlengkapan toko', 'Transport & ongkir', 'Makan & minum', 'Gaji & bonus', 'Listrik, internet, sewa', 'Lainnya'];
    L.api.ubahKas = function (tgl, ubah) {
        return bacaJson('kas.json').then(function (list) {
            var sekarang = new Date().toISOString(), rec = list.filter(function (x) { return x.tgl === tgl; })[0];
            if (!rec) { rec = { id: idBaru(), tgl: tgl, created_at: sekarang, pengeluaran: [] }; list.push(rec); }
            rec.pengeluaran = rec.pengeluaran || [];
            ubah(rec); rec.updated_at = sekarang;
            list.sort(function (a, b) { return a.tgl < b.tgl ? 1 : -1; });
            return commit('data', [{ path: 'kas.json', teks: JSON.stringify(list, null, 1) + '\n' }], 'Kas ' + tgl).then(function () { data.kas = list; return salin(rec); });
        });
    };

    /* ---------- stock opname ----------
       Karyawan menghitung fisik dan mengirim laporan; owner menyesuaikan stok (langsung, atau menyetujui laporan karyawan).
       Laporan tidak menyimpan rupiah: nilai selisih dihitung dari modal saat ditampilkan, hanya untuk owner. */
    L.api.simpanOpname = function (rec, sesuaikan) {
        rec = salin(rec);
        var sekarang = new Date().toISOString(), t = L.hariIni();
        if (sesuaikan && peran !== 'owner') return Promise.reject(new Error('Penyesuaian stok hanya oleh owner.'));
        siapkanBaru(rec, data.opname, 'OPN', sekarang);
        rec.updated_at = sekarang; rec.tgl = rec.tgl || t;
        rec.status = sesuaikan ? 'disesuaikan' : rec.status === 'disesuaikan' ? 'disesuaikan' : 'menunggu';
        if (sesuaikan && !rec.tgl_sesuai) rec.tgl_sesuai = t;
        return Promise.all([bacaJson('opname.json'), bacaJson('stok.json')]).then(function (r) {
            var diFile = cari(r[0], rec.id), sudah = diFile && diFile.status === 'disesuaikan', list = urutBaru(r[0].filter(function (x) { return x.id !== rec.id; }).concat([rec]));
            var stok = r[1], ubah = false;
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
            var files = [{ path: 'opname.json', teks: JSON.stringify(list, null, 1) + '\n' }];
            if (ubah) files.push({ path: 'stok.json', teks: JSON.stringify(PISAH ? stok.map(bersihStok) : stok, null, 1) + '\n' });
            return commit('data', files, (sesuaikan ? 'Opname disesuaikan ' : 'Opname ') + rec.kode).then(function () {
                data.opname = list; if (ubah) data.stok = gabungStok(stok);
                return ubah ? fileKatalogDari(stok).then(function (kat) { return commitBila('situs', kat, 'Opname: perbarui katalog'); }) : null;
            });
        }).then(function () { return salin(rec); });
    };

    /* ---------- artikel ---------- */
    L.api.simpanArtikel = function (art) {
        art = salin(art); var sekarang = new Date().toISOString(), lama = cari(data.artikel, art.id);
        if (data.artikel.some(function (x) { return x.slug === art.slug && x.id !== art.id; })) return Promise.reject(new Error('Alamat halaman sudah dipakai artikel lain.'));
        if (!art.id) { art.id = idBaru(); art.created_at = sekarang; }
        art.updated_at = sekarang;
        if (art.status === 'terbit' && !art.terbit_at) art.terbit_at = sekarang;
        var perluSitus = art.status === 'terbit' || (lama && lama.status === 'terbit');
        return (perluSitus ? terbitkan(art, lama) : Promise.resolve()).then(function () { return simpanDaftar('artikel', art); }).then(function () { return salin(art); });
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
        var B = window.ArtikelBuilder, files = [], tampil = art.status === 'terbit';
        return Promise.all([bacaFile('situs', 'scripts/artikel-template.html'), bacaFile('situs', 'index.html'), bacaFile('situs', 'sitemap.xml'),
            tampil ? bacaFile('situs', 'artikel-' + art.slug + '.html') : null]).then(function (r) {
            var tpl = r[0], beranda = r[1], peta = r[2], ada = r[3];
            if (!tpl || !beranda || !peta) throw new Error('File template/beranda/sitemap tidak ditemukan di repo situs.');
            if (ada && ada.indexOf(B.PENANDA) < 0) throw new Error('Alamat artikel-' + art.slug + '.html sudah dipakai halaman buatan tangan. Ganti alamatnya.');
            /* foto dari servis (terenkripsi) disalin jadi foto publik saat pertama terbit */
            return Promise.all((tampil ? art.foto || [] : []).map(function (f, i) {
                if (f.path) return;
                var x = fotoServisArtikel(f);
                if (!x) throw new Error('Foto servis untuk artikel tidak ditemukan.');
                return fotoMentah(x.s, x.f, true).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
                    var p2 = 'foto/artikel/' + acakHex(10) + (x.f.tipe === 'image/jpeg' ? '.jpg' : '.webp');
                    files.push({ path: p2, base64: b64(buf) }); art.foto[i] = { path: p2, alt: f.alt || '' };
                });
            })).then(function () {
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
