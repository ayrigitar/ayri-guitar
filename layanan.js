/* Layanan servis Toko Gitar AYRI: koneksi Supabase + fungsi bersama untuk admin, cek status, dan nota.
   Semua akses database lewat Layanan.api, supaya mudah diuji dan diganti. */
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
    L.bulanTahun = function (d) { return BULAN[d.getMonth()] + ' ' + d.getFullYear(); };

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
    L.hitung = function (s, items, bayar) {
        var jasa = 0, part = 0, dibayar = 0, bulat = C.bulatkanKe || 1000;
        (items || []).forEach(function (i) { var v = (+i.harga || 0) * (+i.qty || 1); if (i.jenis === 'part') part += v; else jasa += v; });
        (bayar || []).forEach(function (b) { dibayar += +b.jumlah || 0; });
        var diskon = Math.min(+s.diskon || 0, jasa + part), jasaNet = Math.max(0, jasa - diskon), partNet = part - Math.max(0, diskon - jasa);
        var total = jasaNet + partNet;
        var wajib = Math.min(total, Math.ceil(jasaNet * (C.dpJasaPersen == null ? 50 : C.dpJasaPersen) / 100 / bulat) * bulat + partNet);
        return {
            jasa: jasa, part: part, diskon: diskon, total: total, wajibAwal: wajib, dibayar: dibayar,
            sisa: Math.max(0, total - dibayar), kurangAwal: Math.max(0, wajib - dibayar), lebih: Math.max(0, dibayar - total),
            lunas: total > 0 && dibayar >= total
        };
    };
    L.statusBayar = function (h) { return h.lunas ? 'Lunas' : h.dibayar > 0 ? (h.kurangAwal > 0 ? 'DP kurang' : 'DP') : 'Belum bayar'; };

    /* ---------- kode servis & tautan ---------- */
    var ABJAD = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; /* tanpa I, L, O, 0, 1 yang mudah tertukar */
    L.kodeBaru = function () {
        var r = new Uint8Array(5), s = 'AYR-'; crypto.getRandomValues(r);
        for (var i = 0; i < 5; i++) s += ABJAD[r[i] % ABJAD.length];
        return s;
    };
    L.hp4 = function (hp) { return String(hp || '').replace(/\D/g, '').slice(-4); };
    L.waNomor = function (hp) { var n = String(hp || '').replace(/\D/g, ''); if (n.charAt(0) === '0') n = '62' + n.slice(1); else if (n.charAt(0) === '8') n = '62' + n; return n; };
    L.waLink = function (hp, teks) { return 'https://wa.me/' + L.waNomor(hp) + '?text=' + encodeURIComponent(teks); };
    L.urlCek = function (kode) { return (C.situsUrl || location.origin + '/') + 'cek-servis.html?k=' + encodeURIComponent(kode); };
    L.urlNota = function (kode) { return (C.situsUrl || location.origin + '/') + 'nota.html?k=' + encodeURIComponent(kode); };
    L.rekeningTeks = function () { return (C.toko && C.toko.rekening || []).map(function (r) { return r.bank + ' ' + r.nomor + ' a.n. ' + r.atasNama; }).join(' / '); };
    L.ketentuan = function () {
        return (C.ketentuan || []).map(function (k) {
            return k.replace('{dp}', C.dpJasaPersen == null ? 50 : C.dpJasaPersen).replace('{hari}', C.batasAmbilHari || 30).replace('{biaya}', C.biayaPenitipan ? ' (' + C.biayaPenitipan + ')' : '');
        });
    };

    /* ---------- pesan WhatsApp ---------- */
    function gitarTeks(s) { return [s.gitar_jenis, s.gitar_merk].filter(Boolean).join(' ') || 'Kakak'; }
    function jasaTeks(items) { return (items || []).map(function (i) { return '• ' + i.nama + (i.qty > 1 ? ' ×' + i.qty : '') + ' – ' + L.rupiah(i.harga * (i.qty || 1)); }).join('\n'); }
    L.pesan = {
        tandaTerima: function (s, items, bayar) {
            var h = L.hitung(s, items, bayar), t = 'Halo Kak ' + s.nama + ', gitar ' + gitarTeks(s) + ' sudah kami terima di ' + (C.toko && C.toko.nama || 'Toko Gitar AYRI') + ' 🙏\n\n';
            t += 'Kode servis: *' + s.kode + '*\nTanggal masuk: ' + L.tgl(s.tgl_masuk) + '\n';
            if (s.estimasi) t += 'Estimasi selesai: ' + L.tgl(s.estimasi) + '\n';
            if (items && items.length) t += '\nPekerjaan:\n' + jasaTeks(items) + '\n';
            if (h.diskon) t += 'Diskon: ' + L.rupiah(-h.diskon) + '\n';
            t += '*Total: ' + L.rupiah(h.total) + '*\n';
            if (h.total) {
                t += '\nPengerjaan dimulai setelah pembayaran awal (DP ' + (C.dpJasaPersen == null ? 50 : C.dpJasaPersen) + '% jasa + part lunas): *' + L.rupiah(h.wajibAwal) + '*\n';
                if (h.dibayar) t += 'Sudah dibayar: ' + L.rupiah(h.dibayar) + (h.kurangAwal ? ' (kurang ' + L.rupiah(h.kurangAwal) + ')' : ' ✅') + '\n';
                if (h.kurangAwal) t += 'Transfer ke ' + L.rekeningTeks() + '\n';
            }
            t += '\nCek status & nota: ' + L.urlCek(s.kode) + '\n(masukkan 4 digit terakhir no. HP Kakak)';
            return t;
        },
        update: function (s) {
            var t = 'Halo Kak ' + s.nama + ', update servis gitar ' + gitarTeks(s) + ' (kode *' + s.kode + '*):\n';
            t += 'Status: *' + L.STATUS[s.status].label + '*\n';
            if (s.estimasi) t += 'Estimasi selesai: ' + L.tgl(s.estimasi) + '\n';
            if (s.catatan_publik) t += '\n' + s.catatan_publik + '\n';
            return t + '\nDetail, foto, dan biaya: ' + L.urlCek(s.kode);
        },
        selesai: function (s, items, bayar) {
            var h = L.hitung(s, items, bayar), t = 'Halo Kak ' + s.nama + ', kabar baik! Gitar ' + gitarTeks(s) + ' (kode *' + s.kode + '*) sudah selesai dan bisa diambil ✅\n\n';
            t += h.sisa ? 'Sisa pembayaran: *' + L.rupiah(h.sisa) + '*\n(bisa tunai saat ambil atau transfer ke ' + L.rekeningTeks() + ')\n' : 'Pembayaran sudah lunas. Terima kasih!\n';
            if (C.toko && C.toko.jam) t += '\nJam buka: ' + C.toko.jam + '\n';
            return t + '\nFoto hasil servis, saran dari kami, dan nota: ' + L.urlCek(s.kode);
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
    /* hasil: { besar, kecil } (sisi terpanjang 1600 px dan 480 px) */
    L.kompres = function (file) {
        var muat = window.createImageBitmap ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return muatGambar(file); }) : muatGambar(file);
        return muat.then(function (img) {
            function buat(sisi, q) {
                var w = img.width, h = img.height, k = Math.min(1, sisi / Math.max(w, h)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                return keBlob(c, q);
            }
            return Promise.all([buat(1600, 0.8), buat(480, 0.72)]).then(function (r) { if (img.close) img.close(); return { besar: r[0], kecil: r[1] }; });
        });
    };

    /* ---------- koneksi Supabase ---------- */
    L.siap = !!(C.supabaseUrl && C.supabaseAnonKey && !/GANTI/.test(C.supabaseUrl + C.supabaseAnonKey) && window.supabase);
    var db = L.siap ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey) : null;
    function q(p) { return p.then(function (r) { if (r.error) { var e = new Error(r.error.message || 'Gagal menghubungi database'); e.code = r.error.code; throw e; } return r.data; }); }
    function acak() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }
    var KOLOM_SERVIS = ['nama', 'hp', 'tgl_masuk', 'gitar_jenis', 'gitar_merk', 'keluhan', 'status', 'estimasi', 'tgl_selesai', 'tgl_diambil', 'diskon', 'saran', 'catatan_publik', 'catatan_admin', 'izin_publikasi'];
    var KOLOM_ARTIKEL = ['slug', 'judul', 'ringkasan', 'isi', 'tag', 'foto', 'status', 'servis_id'];
    function pilih(o, kolom) { var r = {}; kolom.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k] === '' && /^(estimasi|tgl_|servis_id)/.test(k) ? null : o[k]; }); return r; }

    L.api = {
        sesi: function () { return db.auth.getSession().then(function (r) { return r.data && r.data.session; }); },
        masuk: function (email, sandi) { return q(db.auth.signInWithPassword({ email: email, password: sandi })); },
        keluar: function () { return db.auth.signOut(); },
        cekAdmin: function () { return q(db.rpc('is_admin')); },

        daftarServis: function () {
            return q(db.from('servis').select('*, servis_item(*), servis_bayar(*)').order('created_at', { ascending: false }).limit(500));
        },
        ambilServis: function (id) {
            return q(db.from('servis').select('*, servis_item(*), servis_bayar(*), servis_foto(*)').eq('id', id).single());
        },
        /* servis baru: kode dibuat acak, diulang bila kebetulan sudah dipakai */
        buatServis: function (data, coba) {
            var row = pilih(data, KOLOM_SERVIS); row.kode = L.kodeBaru();
            return q(db.from('servis').insert(row).select().single()).catch(function (e) {
                if (e.code === '23505' && (coba || 0) < 5) return L.api.buatServis(data, (coba || 0) + 1);
                throw e;
            });
        },
        ubahServis: function (id, data) { return q(db.from('servis').update(pilih(data, KOLOM_SERVIS)).eq('id', id).select().single()); },
        hapusServis: function (s) {
            var paths = []; (s.servis_foto || []).forEach(function (f) { paths.push(f.path); if (f.thumb_path) paths.push(f.thumb_path); });
            return (paths.length ? q(db.storage.from('servis').remove(paths)) : Promise.resolve()).then(function () { return q(db.from('servis').delete().eq('id', s.id)); });
        },
        /* daftar jasa/part disimpan ulang seluruhnya (paling sederhana dan konsisten) */
        simpanItem: function (servisId, items) {
            return q(db.from('servis_item').delete().eq('servis_id', servisId)).then(function () {
                if (!items.length) return [];
                return q(db.from('servis_item').insert(items.map(function (i, n) {
                    return { servis_id: servisId, jenis: i.jenis, nama: i.nama, harga: +i.harga || 0, qty: +i.qty || 1, garansi: i.garansi || '', garansi_syarat: i.garansi_syarat || '', urut: n };
                })).select());
            });
        },
        tambahBayar: function (servisId, b) { return q(db.from('servis_bayar').insert({ servis_id: servisId, tgl: b.tgl, jumlah: b.jumlah, jenis: b.jenis, metode: b.metode, catatan: b.catatan || '' }).select().single()); },
        hapusBayar: function (id) { return q(db.from('servis_bayar').delete().eq('id', id)); },
        unggahFoto: function (servisId, hasil, tahap, ket, tampil) {
            var id = acak(), ext = hasil.besar.type === 'image/webp' ? 'webp' : 'jpg', p = servisId + '/' + id + '.' + ext, pk = servisId + '/' + id + '-kecil.' + ext, st = db.storage.from('servis');
            var opsi = { contentType: hasil.besar.type, cacheControl: '31536000', upsert: false };
            return Promise.all([q(st.upload(p, hasil.besar, opsi)), q(st.upload(pk, hasil.kecil, opsi))]).then(function () {
                return q(db.from('servis_foto').insert({
                    servis_id: servisId, tahap: tahap, path: p, url: st.getPublicUrl(p).data.publicUrl, thumb_path: pk, thumb_url: st.getPublicUrl(pk).data.publicUrl,
                    keterangan: ket || '', tampil: tampil !== false
                }).select().single());
            });
        },
        ubahFoto: function (id, data) { return q(db.from('servis_foto').update(data).eq('id', id).select().single()); },
        hapusFoto: function (f) {
            return q(db.storage.from('servis').remove([f.path, f.thumb_path].filter(Boolean))).then(function () { return q(db.from('servis_foto').delete().eq('id', f.id)); });
        },
        /* foto khusus artikel (tidak terikat servis) */
        unggahFotoArtikel: function (hasil) {
            var id = acak(), ext = hasil.besar.type === 'image/webp' ? 'webp' : 'jpg', p = 'artikel/' + id + '.' + ext, st = db.storage.from('servis');
            return q(st.upload(p, hasil.besar, { contentType: hasil.besar.type, cacheControl: '31536000', upsert: false })).then(function () { return st.getPublicUrl(p).data.publicUrl; });
        },

        cekPublik: function (kode, hp4) { return q(db.rpc('cek_servis', { p_kode: kode, p_hp4: hp4 })); },

        daftarArtikel: function () { return q(db.from('artikel').select('id, slug, judul, status, terbit_at, updated_at, servis_id').order('updated_at', { ascending: false })); },
        ambilArtikel: function (id) { return q(db.from('artikel').select('*').eq('id', id).single()); },
        simpanArtikel: function (id, data) {
            var row = pilih(data, KOLOM_ARTIKEL);
            return id ? q(db.from('artikel').update(row).eq('id', id).select().single()) : q(db.from('artikel').insert(row).select().single());
        },
        hapusArtikel: function (id) { return q(db.from('artikel').delete().eq('id', id)); }
    };
})();
