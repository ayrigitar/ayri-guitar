/* AYRI POS: antarmuka admin (kasir, servis, stok, jual, kas, jam masuk, opname, tebus, artikel). Dimuat oleh admin.html;
   skrip dipisah dari HTML supaya Content-Security-Policy bisa melarang skrip inline. */
(function () {
    var L = Layanan, C = L.C, A = L.api, E = L.esc, app = document.getElementById('app');
    var WA_IKON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.3.7a2.8 2.8 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
    var cache = { servis: [], artikel: [], tebus: [], stok: [], jual: [], absen: [], opname: [], kas: [], sewa: [], titip: [] }, dimuat = false, ed = null, ae = null, te = null, sk = null, filterTb = 'aktif', filterSk = 'tersedia', cariSk = '', dirty = false, filter = 'aktif', cari = '', menyimpan = false;
    var AKTIF = ['menunggu_dp', 'antri', 'dikerjakan', 'selesai'];

    function $(s, r) { return (r || document).querySelector(s); }
    function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
    function toast(msg, err) {
        var t = $('#toast'); t.textContent = msg; t.className = 'ly-toast on' + (err ? ' err' : '');
        clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = 'ly-toast'; }, err ? 8000 : 4000);
    }
    function pesanError(e) { return (e && e.message) || String(e); }
    function gagal(e) { if (window.console) console.error(e); toast(pesanError(e), true); }
    function sibuk(btn, on, teks) {
        if (!btn) return;
        if (on) { if (btn._asli == null) btn._asli = btn.innerHTML; btn.textContent = teks || 'Menyimpan…'; btn.disabled = true; }
        else { if (btn._asli != null) { btn.innerHTML = btn._asli; btn._asli = null; } btn.disabled = false; }
    }
    /* ---------- tombol aksi seragam: baris WhatsApp (judul + keterangan + panah) dan kartu aksi berikon ---------- */
    var IKON = {
        lihat: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
        cetak: '<path d="M7 9V4h10v5"/><path d="M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14h10v6H7z"/>',
        nota: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
        artikel: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
        hapus: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
        bagikan: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
        luar: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
        stok: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
        surat: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h4"/>'
    };
    function ikon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IKON[n] + '</svg>'; }
    var PANAH = '<svg class="ly-wa__go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    /* baris WhatsApp: w = [kunci, judul, keterangan]; atr = nama atribut data (data-wa / data-wat) */
    function barisWa(daftar, atr) {
        return '<div class="ly-wa">' + daftar.map(function (w) {
            return '<button type="button" class="ly-wa__b" data-' + atr + '="' + w[0] + '"><span class="ly-wa__i" aria-hidden="true">' + WA_IKON + '</span><span class="ly-wa__t"><b>' + w[1] + '</b><small>' + w[2] + '</small></span>' + PANAH + '</button>';
        }).join('') + '</div>';
    }
    /* kartu aksi: o.href (tautan; o.luar = tab baru) atau o.id (tombol); o.kelas: 'ly-akt--pri' | 'ly-akt--del' */
    function aksi(o) {
        var isi = '<span class="ly-akt__i">' + ikon(o.ikon) + '</span><span class="ly-akt__t">' + o.teks + '</span>', kls = 'ly-akt' + (o.kelas ? ' ' + o.kelas : '');
        if (o.href) return '<a class="' + kls + '"' + (o.luar ? ' target="_blank"' : '') + ' href="' + o.href + '">' + isi + '</a>';
        return '<button type="button" class="' + kls + '" id="' + o.id + '">' + isi + '</button>';
    }
    function kisiAksi(daftar) { return '<div class="ly-aksi">' + daftar.join('') + '</div>'; }
    function owner() { return A.peran() === 'owner'; }
    function setDirty(v) { dirty = v; var d = $('#dirty'); if (d) d.hidden = !v; }
    function opsi(list, cur) { return list.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + E(v) + '"' + (String(v) === String(cur == null ? '' : cur) ? ' selected' : '') + '>' + E(t) + '</option>'; }).join(''); }
    /* pilih pelanggan dari kontak HP. Di browser: Contact Picker API (Chrome Android, HTTPS, dari ketukan). Di aplikasi AYRI POS 1.4.0 ke atas:
       pemilih kontak bawaan Android lewat jembatan (op pilihKontak), hasilnya datang sebagai peristiwa 'ayri-kontak'. Hanya satu kontak yang dipilih yang terbaca. */
    function kontakAplikasi() {
        var m = /AyriApp\/(\d+)\.(\d+)/.exec(navigator.userAgent);
        return !!m && adaAplikasi() && typeof window.AyriApp.postMessage === 'function' && (+m[1] > 1 || (+m[1] === 1 && +m[2] >= 4));
    }
    function bisaPilihKontak() { return kontakAplikasi() || !!(navigator.contacts && typeof navigator.contacts.select === 'function' && window.ContactsManager); }
    function tombolKontak(selNama, selHp) {
        return bisaPilihKontak() ? '<div class="ly-btns"><button type="button" class="ly-btn ly-btn--sm" data-kn="' + E(selNama) + '" data-kh="' + E(selHp) + '">📇 Pilih dari kontak</button></div>' : '';
    }
    function bersihHp(t) { var n = String(t || '').replace(/[^\d+]/g, ''); return n.charAt(0) === '+' ? '+' + n.slice(1).replace(/\+/g, '') : n.replace(/\+/g, ''); }
    function isiKolom(sel, nilai) { var el = sel && $(sel); if (!el || !nilai) return; el.value = nilai; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    var tombolKontakAktif = null;
    function terapkanKontak(b, nama, hp) {
        nama = String(nama || '').trim(); hp = bersihHp(hp);
        if (!nama && !hp) return toast('Kontak itu tidak punya nama atau nomor.', true);
        isiKolom(b.dataset.kn, nama); isiKolom(b.dataset.kh, hp);
        toast(hp ? 'Kontak dipilih: ' + (nama || hp) : 'Kontak dipilih, tetapi tidak punya nomor. Isi nomornya.', !hp);
    }
    window.addEventListener('ayri-kontak', function (e) {
        var d = e.detail || {}, b = tombolKontakAktif; tombolKontakAktif = null;
        if (d.galat) return toast(d.galat, true);
        if (b && document.body.contains(b)) terapkanKontak(b, d.nama, d.hp);
    });
    document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-kn]'); if (!b) return;
        if (kontakAplikasi()) { tombolKontakAktif = b; kirimKeAplikasi('pilihKontak', {}); return; }
        navigator.contacts.select(['name', 'tel'], { multiple: false }).then(function (daftar) {
            var k = daftar && daftar[0]; if (k) terapkanKontak(b, (k.name || [])[0], (k.tel || [])[0]);
        }).catch(function (err) { if (err && err.name !== 'AbortError') toast('Tidak bisa membuka kontak: ' + (err.message || err), true); });
    });
    function bukaWa(hp, teks) { window.open(L.waLink(hp, teks), '_blank', 'noopener'); }
    var salin = AYRI_UTIL.salin;
    function idAcak() { var r = new Uint8Array(6); crypto.getRandomValues(r); return Date.now().toString(36) + [].map.call(r, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
    function pindah(h) { hashLama = h; location.hash = h; }
    /* data di memori: cari satu catatan, atau taruh hasil simpan (catatan baru paling atas) */
    function cariId(jenis, id) { return cache[jenis].filter(function (x) { return x.id === id; })[0]; }
    function taruh(jenis, row) {
        var i = cache[jenis].map(function (x) { return x.id; }).indexOf(row.id);
        if (i > -1) cache[jenis][i] = row; else cache[jenis].unshift(row);
    }
    /* salinan catatan untuk diedit, atau catatan kosong bila id null. Data yang dibuat dari perangkat lain belum ada
       di memori: muat ulang dari GitHub sekali sebelum menyerah */
    function ambilCatatan(jenis, id, kosong, lanjut) {
        if (!id) return lanjut(kosong());
        if (cariId(jenis, id)) return lanjut(salin(cariId(jenis, id)));
        app.innerHTML = '<p class="ly-kosong">Memuat data terbaru…</p>';
        A.muat().then(function (d) {
            cache = d; var x = cariId(jenis, id);
            if (x) lanjut(salin(x)); else app.innerHTML = '<p class="ly-kosong">Data tidak ditemukan. <a href="#' + jenis + '">Kembali ke daftar</a></p>';
        }).catch(gagal);
    }
    /* simpan lewat Layanan.api lalu perbarui data di memori. Gagal sebagian (satu repo sudah berubah, yang lain belum):
       form memakai catatan yang sudah dibuat, supaya Simpan berikutnya tidak membuat data ganda */
    function prosesSimpan(jenis, btn, teks, janji, berhasil, pulih) {
        sibuk(btn, true, teks); menyimpan = true;
        janji().then(function (row) { menyimpan = false; taruh(jenis, row); setDirty(false); berhasil(row); }, function (e) {
            menyimpan = false; sibuk(btn, false);
            if (e.bentrok) return tawarMuatUlang(e);
            if (e.sebagian && e.rec && pulih) { pulih(e.rec); setDirty(true); }
            gagal(e);
        });
    }
    function teksUnggah(antri) { return antri.length ? 'Mengunggah ' + antri.length + ' foto…' : 'Menyimpan…'; }
    function konfirmasiKode(pesan, kode) {
        var k = prompt(pesan + '\nKetik kode (' + kode + ') untuk konfirmasi:');
        if (k == null) return false;
        if (k.trim().toUpperCase() !== kode) { toast('Kode tidak cocok, tidak jadi dihapus.', true); return false; }
        return true;
    }
    function hapusData(jenis, rec, btn, hapus, pesan) {
        sibuk(btn, true, 'Menghapus…');
        hapus(rec).then(function () { cache[jenis] = cache[jenis].filter(function (x) { return x.id !== rec.id; }); setDirty(false); toast(pesan); location.hash = '#' + jenis; })
            .catch(function (e) { sibuk(btn, false); gagal(e); });
    }
    var NAMA_METODE = { tunai: 'tunai', transfer: 'transfer', qris: 'QRIS' };
    /* simpanan ditolak karena catatan sudah diubah di perangkat lain: tawarkan memuat data terbaru */
    function tawarMuatUlang(e) {
        if (confirm(e.message + '\n\nMuat data terbaru sekarang? Perubahan yang belum disimpan di layar ini akan dibuang.')) {
            setDirty(false); A.muat().then(function (d) { cache = d; rute(); toast('Data terbaru dimuat. Silakan ulangi.'); }).catch(gagal);
        } else toast(e.message, true);
    }
    function simpanBerkas(nama, teks, mime) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([teks], { type: mime || 'application/json' }));
        a.download = nama; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 15000);
    }
    /* kotak isian sandi/PIN (kolom disamarkan). aksi(sandi) -> Promise; berhasil = kotak ditutup, gagal = pesan dan kotak tetap terbuka */
    function dialogSandi(o, aksi) {
        var m = document.createElement('div'); m.className = 'ly-modal';
        m.innerHTML = '<form class="ly-modal__in ks-m ly-f" role="dialog" aria-modal="true" aria-label="' + E(o.judul) + '" autocomplete="off">' +
            '<div class="ks-m__head"><b>' + E(o.judul) + '</b><button type="button" class="ly-x" data-tutup aria-label="Tutup">×</button></div>' +
            (o.ket ? '<p class="ly-hint" style="margin:0">' + E(o.ket) + '</p>' : '') +
            '<label>' + E(o.label || 'Sandi') + '<input type="password" name="sandi" autocomplete="new-password" required></label>' +
            (o.ulang ? '<label>Ulangi<input type="password" name="sandi2" autocomplete="new-password" required></label>' : '') +
            '<div class="ly-btns ks-m__aksi"><button type="button" class="ly-btn" data-tutup>Batal</button><button class="ly-btn ly-btn--pri">' + E(o.tombol || 'Lanjut') + '</button></div></form>';
        document.body.appendChild(m);
        var f = $('form', m); f.sandi.focus();
        function tutup() { m.remove(); }
        m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-tutup]')) tutup(); });
        m.addEventListener('keydown', function (e) { if (e.key === 'Escape') tutup(); });
        f.addEventListener('submit', function (e) {
            e.preventDefault(); var b = $('.ly-btn--pri', f);
            if (f.sandi.value.length < A.PIN_MIN) return toast('Minimal ' + A.PIN_MIN + ' karakter.', true);
            if (o.ulang && f.sandi.value !== f.sandi2.value) return toast('Isian dan ulangannya tidak sama.', true);
            sibuk(b, true, o.sibuk || 'Memproses…');
            Promise.resolve(aksi(f.sandi.value)).then(tutup, function (err) { sibuk(b, false); gagal(err); });
        });
    }
    /* jembatan ke aplikasi Android (APK). APK baru memakai AyriApp.postMessage (hanya diterima dari ayrigitar.com); APK lama memakai fungsi langsung */
    function adaAplikasi() { var a = window.AyriApp; return !!(a && (typeof a.postMessage === 'function' || typeof a.bagikan === 'function')); }
    function kirimKeAplikasi(op, d) {
        var a = window.AyriApp;
        if (typeof a.postMessage === 'function') a.postMessage(JSON.stringify(Object.assign({ op: op }, d)));
        else if (op === 'bagikan') a.bagikan(d.nama, d.mime, d.b64, d.teks);
    }
    /* cetak langsung ke printer thermal Bluetooth: aplikasi AYRI POS versi 1.3.0 ke atas */
    function bisaCetakBt() {
        var m = /AyriApp\/(\d+)\.(\d+)/.exec(navigator.userAgent);
        return !!m && adaAplikasi() && typeof window.AyriApp.postMessage === 'function' && (+m[1] > 1 || (+m[1] === 1 && +m[2] >= 3));
    }
    /* cetak baris struk 58 mm (Layanan.strukThermal / strukServis): ke printer Bluetooth lewat aplikasi, atau lewat dialog cetak browser */
    function cetakBaris(baris) {
        if (bisaCetakBt()) { kirimKeAplikasi('cetakStruk', { baris: baris }); toast('Mencetak…'); return; }
        var el = $('#struk-cetak'); if (!el) { el = document.createElement('div'); el.id = 'struk-cetak'; document.body.appendChild(el); }
        el.innerHTML = '<div class="struk struk-pre">' + baris.map(function (x) {
            return '<div class="' + (x.a === 'c' ? 'c' : '') + (x.besar ? ' besar' : '') + '">' + (x.b ? '<b>' + E(x.t) + '</b>' : E(x.t)) + '&nbsp;</div>';
        }).join('') + '</div>';
        document.body.classList.add('cetak-struk');
        var lepas = function () { document.body.classList.remove('cetak-struk'); window.removeEventListener('afterprint', lepas); };
        window.addEventListener('afterprint', lepas); window.print();
        if (!window.AyriApp) setTimeout(lepas, 1500);
    }
    /* hasil cetak dari aplikasi (berhasil, printer mati, belum dipasangkan, dll.) */
    window.addEventListener('ayri-cetak', function (e) { var d = e.detail || {}; if (d.pesan) toast(d.pesan, !d.ok); });
    /* gambar produk yang gagal dimuat dihapus (pengganti atribut onerror, supaya Content-Security-Policy bisa melarang skrip inline) */
    document.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.closest && t.closest('.ks-p__img')) t.remove(); }, true);
    function kodeBaris(x, lain) { return '<div class="ly-kode">' + E(x.kode) + (lain == null ? ' <small>· 4 digit HP: ' + E(L.hp4(x.hp)) + '</small>' : lain) + '</div>'; }

    /* ---------- foto di form (servis, tebus, stok) ----------
       foto baru langsung dikecilkan di HP dan menunggu di antrian; diunggah bersama data saat Simpan */
    var qn = 0;
    function antriFoto(antri, files, isi, gambar) {
        if (!files.length) return;
        var baru = files.map(function (file) { return Object.assign({ qid: 'q' + (++qn), pratinjau: URL.createObjectURL(file), file: file }, isi); });
        [].push.apply(antri, baru); gambar(); setDirty(true);
        baru.reduce(function (p, q) {
            return p.then(function () {
                return L.kompres(q.file).then(function (h) { URL.revokeObjectURL(q.pratinjau); q.hasil = h; q.file = null; q.pratinjau = URL.createObjectURL(h.kecil); gambar(); });
            });
        }, Promise.resolve()).catch(gagal);
    }
    function lepasAntri(antri) { antri.forEach(function (q) { URL.revokeObjectURL(q.pratinjau); }); return []; }
    function buangQ(antri, qid) { return antri.filter(function (q) { if (q.qid !== qid) return true; URL.revokeObjectURL(q.pratinjau); }); }
    function tombolTampil(on, attr, id) { return '<button type="button" class="ly-ft" ' + attr + '="' + E(id) + '" aria-pressed="' + !!on + '">' + (on ? 'Tampil' : 'Sembunyi') + '</button>'; }
    /* satu grup foto: yang tersimpan (img data-foto = indeks, diisi L.isiFoto) + antrian. tahap null = semua foto */
    function grupFoto(judul, tahap, foto, antri, tampil) {
        var ada = [], tunggu = antri.filter(function (q) { return !tahap || q.tahap === tahap; });
        foto.forEach(function (f, i) { if (!tahap || f.tahap === tahap) ada.push([f, i]); });
        return '<div class="ly-fgrup"><h3>' + judul + '<label class="ly-btn ly-btn--sm ly-file">+ Foto<input type="file" accept="image/*" multiple' + (tahap ? ' data-tahap="' + tahap + '"' : '') + '></label></h3>' +
            (ada.length || tunggu.length ? '<div class="ly-foto">' + ada.map(function (x) {
                return '<figure><img data-foto="' + x[1] + '" alt="">' + (tampil ? tombolTampil(x[0].tampil, 'data-tampil', x[0].id) : '') + '<button type="button" class="ly-fx" data-hapusfoto="' + E(x[0].id) + '" aria-label="Hapus foto">×</button></figure>';
            }).join('') + tunggu.map(function (q) {
                return '<figure' + (q.hasil ? '' : ' class="ly-up"') + '><img src="' + q.pratinjau + '" alt="">' + (tampil ? tombolTampil(q.tampil, 'data-tampilq', q.qid) : '') + '<button type="button" class="ly-fx" data-hapusq="' + q.qid + '" aria-label="Batal">×</button></figure>';
            }).join('') + '</div>' : '<p class="ly-muted">Belum ada foto.</p>') + '</div>';
    }
    function pilihFoto(el, tambah) { el.addEventListener('change', function (e) { if (e.target.type === 'file') { tambah(e.target.dataset.tahap, [].slice.call(e.target.files)); e.target.value = ''; } }); }
    /* buka WA dulu (harus langsung dari ketukan), lalu catat tanggal pengingat di data */
    function catatPengingat(jenis, id, btn) {
        var x = cariId(jenis, id), servis = jenis === 'servis'; if (!x) return;
        bukaWa(x.hp, (servis ? L.pesan : L.pesanTebus).pengingat(x));
        var rec = salin(x); rec.pengingat = (rec.pengingat || []).concat(L.hariIni());
        if (btn) sibuk(btn, true, 'Mencatat…');
        (servis ? A.simpanServis : A.simpanTebus)(rec).then(function (row) {
            taruh(jenis, row);
            var f = servis ? ed && ed.s : te && te.t;
            if (f && f.id === row.id) { f.pengingat = row.pengingat; f.updated_at = row.updated_at; if (servis && $('#sv-titip')) gambarStatus(); }
            toast('Pengingat dicatat (' + L.tgl(L.hariIni()) + ').');
            if (servis) gambarDaftar(); else gambarDaftarTebus();
        }).catch(function (e) { if (btn) sibuk(btn, false); gagal(e); });
    }

    /* ================= token & PIN ================= */
    function mulai() {
        if (!L.siapAdmin) { app.innerHTML = '<section class="ly-login"><div class="ly-card"><h2>Pengaturan belum lengkap</h2><p class="ly-muted">Isi bagian <b>github</b> di <code>layanan-config.js</code>.</p></div></section>'; return; }
        if (!A.adaToken()) return layarPasang();
        if (!A.terbuka()) return layarPin();
        masukOk();
    }
    function layarPasang() {
        app.innerHTML = '<section class="ly-login"><form class="ly-card ly-f" id="f-pasang" autocomplete="off"><h2>Pasang admin di perangkat ini</h2>' +
            '<p class="ly-muted">Tempel token GitHub (lihat <b>panduan-admin.md</b>, langkah 2), lalu buat PIN untuk membuka admin di perangkat ini. Token hanya disimpan di perangkat ini, terkunci PIN.</p>' +
            '<label>Token GitHub<input type="password" name="token" placeholder="github_pat_…" autocomplete="off" spellcheck="false" required></label>' +
            '<div class="ly-row2"><label>PIN baru (minimal ' + A.PIN_MIN + ' karakter)<input type="password" name="pin" autocomplete="new-password" minlength="' + A.PIN_MIN + '" required></label>' +
            '<label>Ulangi PIN<input type="password" name="pin2" autocomplete="new-password" minlength="' + A.PIN_MIN + '" required></label></div>' +
            '<p class="ly-hint" style="margin:0">PIN boleh angka atau huruf. Makin panjang makin aman. Salah PIN 5 kali berturut-turut akan mengunci sementara.</p>' +
            '<button class="ly-btn ly-btn--pri">Pasang</button></form></section>';
        $('#f-pasang').addEventListener('submit', function (e) {
            e.preventDefault(); var f = e.target, b = $('button', f);
            if (f.pin.value !== f.pin2.value) return toast('PIN dan ulangan PIN tidak sama.', true);
            if (f.pin.value.length < A.PIN_MIN) return toast('PIN minimal ' + A.PIN_MIN + ' karakter.', true);
            sibuk(b, true, 'Memeriksa token…');
            A.pasangToken(f.token.value, f.pin.value).then(function () { f.token.value = ''; toast('Admin siap dipakai di perangkat ini.'); masukOk(); })
                .catch(function (err) { sibuk(b, false); gagal(err); });
        });
    }
    function layarPin() {
        app.innerHTML = '<section class="ly-login"><form class="ly-card ly-f" id="f-pin" autocomplete="off"><h2>Buka admin</h2>' +
            '<label>PIN<input type="password" name="pin" autocomplete="current-password" autofocus required></label>' +
            '<button class="ly-btn ly-btn--pri">Buka</button>' +
            '<p class="ly-hint">Lupa PIN? <button type="button" class="ly-btn ly-btn--sm" id="b-ulang">Pasang ulang token</button></p></form></section>';
        $('#f-pin').addEventListener('submit', function (e) {
            e.preventDefault(); var b = $('button', e.target); sibuk(b, true, 'Membuka…');
            var pin = e.target.pin.value;
            A.buka(pin).then(function () {
                masukOk();
                if (pin.length < A.PIN_MIN) toast('PIN Anda kurang dari ' + A.PIN_MIN + ' karakter. Ganti dengan tombol "Ganti PIN" di bagian bawah halaman Servis.', true);
            }).catch(function (err) { sibuk(b, false); e.target.pin.value = ''; gagal(err); });
        });
        $('#b-ulang').addEventListener('click', function () { if (confirm('Hapus token dari perangkat ini dan pasang ulang?' + peringatanAntri())) A.lupakan().then(layarPasang); });
    }
    function masukOk() {
        $('#tabs').hidden = false; $('#kunci').hidden = false; $('#sinkron').hidden = false;
        app.innerHTML = '<p class="ly-kosong">Memuat data…</p>';
        A.muat().then(function (d) { cache = d; dimuat = true; terapkanPeran(); if (!layarPisah()) rute(); }).catch(function (e) {
            app.innerHTML = '<section class="ly-login"><div class="ly-card"><h2>Gagal memuat data</h2><p class="ly-muted">' + E(pesanError(e)) + '</p><div class="ly-btns"><button type="button" class="ly-btn ly-btn--pri" id="b-coba">Coba lagi</button><button type="button" class="ly-btn" id="b-ulang2">Pasang ulang token</button></div></div></section>';
            $('#b-coba').addEventListener('click', masukOk);
            $('#b-ulang2').addEventListener('click', function () { if (peringatanAntri() && !confirm('Hapus token dari perangkat ini?' + peringatanAntri())) return; A.lupakan().then(function () { $('#tabs').hidden = true; $('#kunci').hidden = true; $('#sinkron').hidden = true; layarPasang(); }); });
        });
    }
    /* owner / karyawan: karyawan tidak melihat tebus, artikel, harga modal, untung, dan tombol hapus */
    function terapkanPeran() {
        var k = !owner(), el = $('#peran');
        document.body.classList.toggle('ly-karyawan', k);
        el.hidden = !A.pisah(); el.textContent = k ? 'Karyawan' : 'Owner'; el.className = 'ly-peran' + (k ? ' karyawan' : '');
    }
    function layarPisah() {
        var st = A.statusPisah();
        if (st === 'pindah') {
            app.innerHTML = '<section class="ly-login"><div class="ly-card ly-f"><h2>Pisahkan data owner &amp; karyawan</h2>' +
                '<p class="ly-muted">Repo bersama <b>' + E(C.github.repoBersama) + '</b> sudah siap. Data servis, stok (tanpa harga modal), penjualan, dan artikel akan disalin ke sana supaya bisa dipakai tablet karyawan.</p>' +
                '<p class="ly-muted">Tebus, foto KTP, dan harga modal tetap di repo <b>' + E(C.github.repoData) + '</b> yang hanya bisa dibuka owner. Data lama tetap tersimpan di riwayat repo itu.</p>' +
                '<button type="button" class="ly-btn ly-btn--pri" id="b-pindah">Pindahkan sekarang</button></div></section>';
            $('#b-pindah').addEventListener('click', function () {
                var b = this; sibuk(b, true, 'Memindahkan…'); menyimpan = true;
                A.pindahkanData().then(function () { return A.muat(); }).then(function (d) { menyimpan = false; cache = d; toast('Data sudah dipisah. Tablet karyawan siap dipasang.'); rute(); })
                    .catch(function (e) { menyimpan = false; sibuk(b, false); gagal(e); });
            });
            return true;
        }
        if (st === 'kosong' && !owner()) {
            app.innerHTML = '<section class="ly-login"><div class="ly-card"><h2>Menunggu owner</h2><p class="ly-muted">Data toko belum dipindahkan ke repo bersama. Minta owner membuka admin di perangkatnya sekali, lalu tekan muat ulang di atas.</p></div></section>';
            return true;
        }
        return false;
    }
    $('#kunci').addEventListener('click', function () {
        if (dirty && !confirm('Perubahan belum disimpan. Tetap kunci?')) return;
        A.kunci().then(function () { setDirty(false); $('#tabs').hidden = true; $('#kunci').hidden = true; $('#sinkron').hidden = true; $('#peran').hidden = true; layarPin(); });
    });
    /* muat ulang data dari GitHub (mis. setelah perangkat lain menyimpan) */
    $('#sinkron').addEventListener('click', function () {
        if (dirty || menyimpan) return toast('Simpan perubahan dulu sebelum memuat ulang.', true);
        var b = this; b.classList.add('putar'); b.disabled = true;
        A.muat().then(function (d) { cache = d; b.classList.remove('putar'); b.disabled = false; terapkanPeran(); if (!layarPisah()) rute(); toast(A.statusOffline().offline ? 'Tidak ada internet: memakai data terakhir di perangkat ini.' : 'Data terbaru dimuat.', A.statusOffline().offline); }).catch(function (e) { b.classList.remove('putar'); b.disabled = false; gagal(e); });
    });
    $('#b-lainnya').addEventListener('click', function () { $('#lainnya').hidden = !$('#lainnya').hidden; });
    $('#lainnya').addEventListener('click', function (e) { if (e.target === this || e.target.closest('a')) this.hidden = true; });
    /* status internet + antrian transaksi offline (dikirim otomatis saat online) */
    function net() {
        var s = A.statusOffline(), el = $('#net'), putus = navigator.onLine === false || s.offline;
        var teks = s.gagal.length ? s.gagal.length + ' gagal terkirim' : s.antri ? (putus ? 'Offline · ' : 'Mengirim · ') + s.antri + ' antri' : putus ? 'Offline' : '';
        el.hidden = !teks; el.textContent = teks; el.classList.toggle('err', !!s.gagal.length);
    }
    function peringatanAntri() { var n = A.statusOffline().antri; return n ? '\n\nPERHATIAN: ' + n + ' transaksi offline belum terkirim dan akan hilang.' : ''; }
    A.pantauOffline(function (s) {
        net();
        if (!s.terkirim) return;
        toast(s.terkirim + ' transaksi offline sudah terkirim ke GitHub.');
        if (dimuat && !menyimpan) A.muat().then(function (d) { cache = d; }).catch(function () {});
    });
    $('#net').addEventListener('click', function () {
        var s = A.statusOffline();
        if (s.gagal.length) {
            alert('Transaksi ini GAGAL dikirim dan tidak tersimpan di GitHub. Catat ulang setelah dicek:\n\n' + s.gagal.map(function (g) { return '• ' + g.jenis + (g.ket ? ' ' + g.ket : '') + '\n  ' + g.pesan; }).join('\n'));
            if (confirm('Sudah dicatat ulang? Hapus daftar gagal ini.')) A.buangGagal().then(function () { return A.muat(); }).then(function (d) { cache = d; rute(); }).catch(gagal);
            return;
        }
        if (s.antri) {
            var isi = s.daftar.map(function (x) { return x.jenis + (x.ket ? ' ' + x.ket : ''); }).join(', ');
            if (navigator.onLine === false) return toast(s.antri + ' menunggu internet: ' + isi + '. Dikirim otomatis saat online.');
            toast('Mengirim ' + s.antri + ' transaksi…'); A.kirimAntrian().catch(function () { toast('Masih belum tersambung. Dicoba lagi otomatis.', true); });
            return;
        }
        toast('Tidak ada internet. Yang tampil adalah data terakhir di perangkat ini; transaksi kasir tetap bisa dicatat.');
    });
    window.addEventListener('online', net); window.addEventListener('offline', net); net();

    /* ================= rute: #servis, #servis/<id>, #servis/baru, #artikel, ... ================= */
    var hashLama = location.hash;
    function rute() {
        if (!A.terbuka()) return layarPin();
        var p = (location.hash.replace(/^#/, '') || 'hari').split('/');
        $$('#tabs a').forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + p[0] ? 'page' : 'false'); });
        document.body.classList.toggle('ly-detail', !!p[1] || p[0] === 'opname'); document.body.classList.remove('ly-kunci-gulir');
        app.classList.toggle('ly-lebar', (!p[1] && ['hari', 'kasir', 'servis', 'jam', 'opname', 'rekap', 'kas'].indexOf(p[0]) > -1) || (p[0] === 'opname' && !!p[1]));
        window.scrollTo(0, 0);
        if (!owner() && (p[0] === 'tebus' || p[0] === 'titip' || p[0] === 'artikel' || p[0] === 'rekap' || p[0] === 'website' || (p[0] === 'jam' && p[1] === 'atur'))) { toast('Menu ini khusus owner.', true); pindah('#kasir'); return; }
        $('#lainnya').hidden = true; app.onclick = app.oninput = app.onchange = null; clearInterval(detikJam);
        $('#b-lainnya').setAttribute('aria-current', ['jam', 'opname', 'tebus', 'titip', 'artikel', 'rekap', 'kas', 'sewa', 'website'].indexOf(p[0]) > -1 ? 'page' : 'false');
        if (p[0] === 'hari') return halamanHari();
        if (p[0] === 'kas') return halamanKas();
        if (p[0] === 'jam') return p[1] === 'atur' ? aturKaryawan() : halamanJam();
        if (p[0] === 'opname') return opname(p[1]);
        if (p[0] === 'rekap') return rekap();
        if (p[0] === 'website') return halamanWebsite();
        if (p[0] === 'kasir') return kasir();
        if (p[0] === 'titip') return p[1] ? bukaTitip(p[1] === 'baru' ? null : p[1]) : daftarTitip();
        if (p[0] === 'tebus') return p[1] ? bukaTebus(p[1] === 'baru' ? null : p[1]) : daftarTebus();
        if (p[0] === 'stok') return p[1] ? bukaStok(p[1] === 'baru' ? null : p[1]) : daftarStok();
        if (p[0] === 'jual') return p[1] === 'baru' ? jualBaru(p[2]) : p[1] ? bukaJual(p[1]) : daftarJual();
        if (p[0] === 'sewa') return p[1] === 'baru' ? sewaBaru(p[2]) : p[1] ? bukaSewa(p[1]) : daftarSewa();
        if (p[0] === 'artikel') return p[1] ? bukaArtikel(p[1] === 'baru' ? null : p[1]) : daftarArtikel();
        return p[1] ? bukaServis(p[1] === 'baru' ? null : p[1]) : daftarServis();
    }
    window.addEventListener('hashchange', function () {
        if ((dirty && !confirm('Perubahan belum disimpan. Tinggalkan halaman ini?')) || menyimpan) { history.replaceState(null, '', hashLama || '#servis'); return; }
        setDirty(false); hashLama = location.hash; if (dimuat) rute();
    });
    window.addEventListener('beforeunload', function (e) { if (dirty || menyimpan) { e.preventDefault(); e.returnValue = ''; } });

    /* ================= kasir (POS): jual barang stok + terima pelunasan servis dalam satu struk ================= */
    var kr = { items: [] }, filterKs = 'semua', cariKs = '', strukAkhir = null;
    var SVG = {
        cari: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
        troli: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>',
        gitar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 2.5 21.5 4.5 18 8l-2-2zM16 6l-5.2 5.2"/><path d="M10.2 10.6c-1.9-.9-4.3-.3-5.6 1.3-1 1.2-.8 2.5-1.9 3.6-1.2 1.2-.9 3.4.9 4.9 1.5 1.3 3.6 1.5 4.8.3 1.1-1.1 2.4-.9 3.6-1.9 1.6-1.3 2.2-3.7 1.3-5.6"/><circle cx="9" cy="15" r="1.3"/></svg>',
        kunci: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
        ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16.5 9.5"/></svg>'
    };
    function siapBayar(s) { return s.status === 'selesai' && L.hitung(s, s.items, s.bayar).sisa > 0; }
    function bisaDijual(s) { return +s.jumlah > 0 && s.status !== 'ditarik' && !L.sewaAktifStok(s.id, cache.sewa) && !L.titipanTerkunci(s); }
    function namaBarang(s) { return L.judulStok(s) + (s.warna ? ' (' + s.warna + ')' : '') + (s.kondisi === 'bekas' ? ' – Used' + (L.tingkatStok(s) ? ' ' + L.tingkatStok(s) : '') : ''); }
    function totalKr() { return kr.items.reduce(function (t, i) { return t + i.harga * i.qty; }, 0); }
    function nKr() { return kr.items.reduce(function (t, i) { return t + i.qty; }, 0); }
    function kasir() {
        app.innerHTML = '<section class="ks">' +
            '<div class="ks-kiri"><div class="ly-card ks-atas"><label class="ks-cari">' + SVG.cari + '<input id="ks-cari" type="search" placeholder="Cari barang, merk, warna, no. seri, kode servis…" autocomplete="off"></label>' +
            '<div class="ly-filter" id="ks-filter"></div></div><div class="ks-grid" id="ks-grid"></div></div>' +
            '<aside class="ks-kanan" id="ks-kanan"><div class="ly-card ks-inv">' +
            '<div class="ks-inv__head"><span class="ks-bulat">' + SVG.troli + '</span><div><b>Invoice kasir</b><small>' + L.tgl(L.hariIni()) + '</small></div><button type="button" class="ly-x ks-tutup" id="ks-tutup" aria-label="Tutup">×</button></div>' +
            '<div class="ks-pel"><input class="ly-in" id="ks-nama" placeholder="Nama pelanggan (opsional)" autocomplete="off"><input class="ly-in" id="ks-hp" type="tel" inputmode="tel" placeholder="No. HP / WA (opsional)" autocomplete="off"></div>' +
            '<div class="ks-isi" id="ks-isi"></div><div class="ks-tot" id="ks-tot"></div>' +
            '<button type="button" class="ly-btn ly-btn--pri ks-bayar" id="ks-bayar"></button></div></aside>' +
            '<button type="button" class="ks-bar" id="ks-bar"></button></section>' +
            '<div class="ly-modal" id="ks-modal" hidden></div>';
        $('#ks-cari').value = cariKs; $('#ks-nama').value = kr.nama || ''; $('#ks-hp').value = kr.hp || '';
        $('#ks-cari').addEventListener('input', function () { cariKs = this.value; gambarProduk(); });
        $('#ks-filter').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filterKs = b.dataset.f; gambarProduk(); } });
        $('#ks-grid').addEventListener('click', function (e) { var b = e.target.closest('[data-tambah]'); if (b) tambahKr(b.dataset.tambah); });
        $('#ks-nama').addEventListener('input', function () { kr.nama = this.value; });
        $('#ks-hp').addEventListener('input', function () { kr.hp = this.value; });
        $('#ks-isi').addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return; var i = +b.dataset.i, it = kr.items[i]; if (!it) return;
            if (b.dataset.q) { if (it.qty + +b.dataset.q < 1) kr.items.splice(i, 1); else it.qty = Math.min(it.maks, it.qty + +b.dataset.q); }
            else if (b.hasAttribute('data-hapus')) kr.items.splice(i, 1);
            gambarKeranjang(); gambarProduk();
        });
        $('#ks-isi').addEventListener('change', function (e) {
            var i = +e.target.dataset.i, it = kr.items[i]; if (!it) return;
            if (e.target.dataset.harga != null) it.harga = Math.max(0, Math.round(+e.target.value || 0));
            if (e.target.dataset.ambil != null) it.ambil = e.target.checked;
            gambarKeranjang();
        });
        $('#ks-bayar').addEventListener('click', bukaBayar);
        $('#ks-bar').addEventListener('click', function () { $('#ks-kanan').classList.add('buka'); document.body.classList.add('ly-kunci-gulir'); });
        $('#ks-tutup').addEventListener('click', tutupLembar);
        $('#ks-kanan').addEventListener('click', function (e) { if (e.target === this) tutupLembar(); });
        gambarProduk(); gambarKeranjang();
    }
    function tutupLembar() { var k = $('#ks-kanan'); if (k) k.classList.remove('buka'); document.body.classList.remove('ly-kunci-gulir'); }
    function gambarProduk() {
        if (!$('#ks-grid')) return;
        var stok = cache.stok.filter(bisaDijual), sv = cache.servis.filter(siapBayar), c = cariKs.trim().toLowerCase();
        var n = { semua: stok.length, baru: 0, bekas: 0, aksesoris: 0, servis: sv.length };
        stok.forEach(function (s) { n[kelStok(s)]++; });
        $('#ks-filter').innerHTML = [['semua', 'Semua barang'], ['baru', 'Gitar baru'], ['bekas', 'Gitar used'], ['aksesoris', 'Aksesoris'], ['servis', '🔧 Servis siap bayar']].map(function (x) {
            return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (filterKs === x[0]) + '">' + x[1] + '<b>' + n[x[0]] + '</b></button>';
        }).join('');
        function cocok(teks) { return !c || teks.toLowerCase().indexOf(c) > -1; }
        var html = '';
        if (filterKs === 'servis' || (c && filterKs === 'semua')) html += sv.filter(function (s) { return cocok([s.kode, s.nama, s.hp, s.gitar_jenis, s.gitar_merk].join(' ')); }).map(function (s) {
            var h = L.hitung(s, s.items, s.bayar), ada = kr.items.some(function (i) { return i.jenis === 'servis' && i.id === s.id; });
            return '<button type="button" class="ks-p ks-p--sv" data-tambah="servis:' + E(s.id) + '"' + (ada ? ' aria-pressed="true"' : '') + '>' +
                '<span class="ks-p__top"><span class="ks-tag ks-tag--servis">' + SVG.kunci + 'Servis</span><span class="ks-p__kode">' + E(s.kode) + '</span></span>' +
                '<b class="ks-p__nama">' + E(L.namaGitar(s, 'Gitar')) + '</b><small>' + E(s.nama) + ' · selesai ' + L.tgl(s.tgl_selesai) + '</small>' +
                '<span class="ks-p__harga"><small>Sisa bayar</small>' + L.rupiah(h.sisa) + '</span>' + (ada ? '<span class="ks-p__n">✓</span>' : '') + '</button>';
        }).join('');
        if (filterKs !== 'servis') html += stok.filter(function (s) {
            return (filterKs === 'semua' || kelStok(s) === filterKs) && cocok([s.kode, s.nama, s.sub, s.gitar_jenis, s.gitar_merk, s.warna, s.no_seri].join(' '));
        }).map(function (s) {
            var kel = kelStok(s), f = (s.foto || []).filter(function (x) { return x.repo === 'publik'; })[0], di = kr.items.filter(function (i) { return i.jenis === 'stok' && i.id === s.id; })[0];
            var habis = di && di.qty >= +s.jumlah, tanpaHarga = !(+s.harga_jual > 0);
            return '<button type="button" class="ks-p' + (habis ? ' habis' : '') + '" data-tambah="stok:' + E(s.id) + '"' + (di ? ' aria-pressed="true"' : '') + (habis && +s.jumlah === 1 ? ' title="Ketuk lagi untuk membatalkan"' : '') + '>' +
                '<span class="ks-p__img">' + (f ? '<img src="' + E(f.thumb_path || f.path) + '" alt="" loading="lazy">' : '') + SVG.gitar + '</span>' +
                '<span class="ks-p__top"><span class="ks-tag ks-tag--' + kel + '">' + (kel === 'aksesoris' ? E(s.sub || 'Aksesoris') : kel === 'baru' ? 'Baru' : 'Used') + '</span><span class="ks-p__stok' + (+s.jumlah <= 1 ? ' sedikit' : '') + '">Stok ' + s.jumlah + (s.status === 'dipesan' ? ' · ada DP' : '') + '</span></span>' +
                '<b class="ks-p__nama">' + E(kel === 'aksesoris' ? L.namaStok(s) : L.jenisStok(s) + ' · ' + L.namaStok(s)) + '</b>' +
                '<small>' + E([s.warna, s.no_seri ? 'SN ' + s.no_seri : ''].filter(Boolean).join(' · ') || s.kode) + '</small>' +
                '<span class="ks-p__harga">' + (tanpaHarga ? '<span class="ly-warn">Harga belum diisi</span>' : L.rupiah(s.harga_jual)) + '</span>' + (di ? '<span class="ks-p__n">' + di.qty + '</span>' : '') + '</button>';
        }).join('');
        $('#ks-grid').innerHTML = html || '<p class="ly-kosong">' + (filterKs === 'servis' ? 'Tidak ada servis selesai yang masih punya sisa bayar.' : cache.stok.length ? 'Tidak ada barang yang cocok.' : 'Belum ada stok. Tambahkan di menu Stok.') + '</p>';
    }
    function tambahKr(kunci) {
        var p = kunci.split(':'), jenis = p[0], id = p[1];
        if (jenis === 'servis') {
            if (kr.items.some(function (i) { return i.jenis === 'servis' && i.id === id; })) { kr.items = kr.items.filter(function (i) { return !(i.jenis === 'servis' && i.id === id); }); toast('Dibatalkan dari keranjang.'); gambarKeranjang(); gambarProduk(); return; }
            var s = cariId('servis', id), h = L.hitung(s, s.items, s.bayar);
            kr.items.push({ jenis: 'servis', id: id, kode: s.kode, nama: 'Pelunasan servis ' + L.namaGitar(s, 'gitar'), qty: 1, maks: 1, harga: h.sisa, ambil: true });
            if (!kr.nama && !kr.hp) { kr.nama = s.nama; kr.hp = s.hp; if ($('#ks-nama')) { $('#ks-nama').value = s.nama; $('#ks-hp').value = s.hp; } }
        } else {
            var st = cariId('stok', id), ada = kr.items.filter(function (i) { return i.jenis === 'stok' && i.id === id; })[0];
            if (ada && ada.qty >= ada.maks) {
                /* stok sudah habis di keranjang: ketuk lagi = batalkan (barang 1 unit), atau beri tahu sisa stok */
                if (ada.maks === 1) { kr.items = kr.items.filter(function (i) { return i !== ada; }); toast('Dibatalkan dari keranjang.'); }
                else toast('Stok ' + st.kode + ' hanya ' + ada.maks + ' unit.', true);
            } else if (ada) ada.qty += 1;
            else kr.items.push({ jenis: 'stok', id: id, kode: st.kode, nama: namaBarang(st), qty: 1, maks: +st.jumlah, harga: +st.harga_jual || 0, modal: +st.harga_beli || 0 });
        }
        gambarKeranjang(); gambarProduk();
    }
    /* dari papan antrian: servis selesai langsung masuk keranjang kasir */
    function keKasir(id) { if (!kr.items.some(function (i) { return i.jenis === 'servis' && i.id === id; })) tambahKr('servis:' + id); filterKs = 'servis'; pindah('#kasir'); }
    function gambarKeranjang() {
        if (!$('#ks-isi')) return;
        var tot = totalKr(), n = nKr();
        $('#ks-isi').innerHTML = kr.items.length ? kr.items.map(function (it, i) {
            return '<div class="ks-it"><div class="ks-it__a"><b>' + E(it.nama) + '</b><small>' + E(it.kode) + '</small></div><button type="button" class="ly-x" data-hapus data-i="' + i + '" aria-label="Hapus dari keranjang">×</button>' +
                '<div class="ks-it__b">' + (it.jenis === 'stok' ? '<span class="ks-qty"><button type="button" data-q="-1" data-i="' + i + '" aria-label="' + (it.qty > 1 ? 'Kurangi' : 'Hapus dari keranjang') + '">' + (it.qty > 1 ? '−' : '🗑') + '</button><b>' + it.qty + '</b><button type="button" data-q="1" data-i="' + i + '" aria-label="Tambah"' + (it.qty >= it.maks ? ' disabled' : '') + '>+</button></span>' +
                    '<label class="ks-harga">@<input type="number" inputmode="numeric" min="0" step="1000" data-harga data-i="' + i + '" value="' + it.harga + '" aria-label="Harga per unit"></label>'
                    : '<label class="ks-ambil"><input type="checkbox" data-ambil data-i="' + i + '"' + (it.ambil ? ' checked' : '') + '> Gitar diambil sekarang</label>') +
                '<b class="ks-it__sub">' + L.rupiah(it.harga * it.qty) + '</b></div></div>';
        }).join('') : '<div class="ks-kosong">' + SVG.troli + '<b>Keranjang masih kosong</b><span>Ketuk barang atau servis siap bayar di sebelah kiri untuk membuat invoice.</span></div>';
        $('#ks-tot').innerHTML = '<div><span>' + n + ' item</span><span>' + L.rupiah(tot) + '</span></div><div class="t"><span>Total bayar</span><span>' + L.rupiah(tot) + '</span></div>';
        var b = $('#ks-bayar'); b.textContent = 'Proses pembayaran (' + L.rupiah(tot) + ')'; b.disabled = !kr.items.length;
        var bar = $('#ks-bar'); bar.hidden = !kr.items.length; bar.innerHTML = '<span class="ks-bulat">' + SVG.troli + '<i>' + n + '</i></span><span>' + L.rupiah(tot) + '</span><b>Lihat &amp; bayar ›</b>';
    }

    /* ---------- pembayaran ---------- */
    function bukaBayar() {
        if (!kr.items.length) return;
        var tanpaHarga = kr.items.filter(function (i) { return !(i.harga > 0); })[0];
        if (tanpaHarga) return toast('Isi harga untuk ' + tanpaHarga.nama + '.', true);
        var tot = totalKr(), hanyaStok = kr.items.every(function (i) { return i.jenis === 'stok'; }), m = $('#ks-modal');
        var bayar = { metode: 'tunai', dp: false, diterima: tot, jumlahDp: '', batas: L.tambahHari(L.hariIni(), C.jual.batasHari) };
        function pecahan() { var p = [tot]; [50000, 100000].forEach(function (k) { var x = Math.ceil(tot / k) * k; if (p.indexOf(x) < 0) p.push(x); }); return p.slice(0, 3); }
        function gambar() {
            var dp = bayar.dp, kembali = bayar.diterima - tot, uji = { items: [{ harga: tot, qty: 1 }], bayar: [{ jumlah: +bayar.jumlahDp || 0 }] }, hh = L.hitungJual(uji);
            m.innerHTML = '<div class="ly-modal__in ks-m" role="dialog" aria-modal="true" aria-label="Pembayaran">' +
                '<div class="ks-m__head"><b>Pembayaran</b><button type="button" class="ly-x" data-tutup aria-label="Tutup">×</button></div>' +
                '<div class="ks-m__total"><small>Total bayar</small><b>' + L.rupiah(tot) + '</b></div>' +
                (hanyaStok ? '<div class="ly-status ks-seg"><button type="button" data-dp="0" aria-pressed="' + !dp + '">Bayar lunas</button><button type="button" data-dp="1" aria-pressed="' + dp + '">DP (bayar sebagian)</button></div>' : '') +
                '<div class="ly-status ks-seg"><button type="button" data-metode="tunai" aria-pressed="' + (bayar.metode === 'tunai') + '">Tunai</button><button type="button" data-metode="transfer" aria-pressed="' + (bayar.metode === 'transfer') + '">Transfer</button></div>' +
                (dp ? '<div class="ly-f"><label>Jumlah DP (Rp)<input type="number" inputmode="numeric" min="0" step="10000" id="km-dp" value="' + E(bayar.jumlahDp) + '"></label>' +
                    '<label>Batas pelunasan<input type="date" id="km-batas" value="' + E(bayar.batas) + '"></label></div>' +
                    '<div class="ly-sum"><div><span>Sisa setelah DP</span><span>' + L.rupiah(Math.max(0, tot - (+bayar.jumlahDp || 0))) + '</span></div><div><span>Bila batal: potongan ' + C.jual.potonganPersen + '% (maks. sebesar DP)</span><span>' + L.rupiah(hh.potongan) + '</span></div></div>' +
                    '<p class="ly-hint" style="margin:0">DP wajib nama + nomor WA pembeli. Barang ditahan sampai lunas; bukti DP dikirim lewat WA setelah ini.</p>'
                    : bayar.metode === 'tunai' ? '<div class="ly-f"><label>Uang diterima (Rp)<input type="number" inputmode="numeric" min="0" step="1000" id="km-terima" value="' + bayar.diterima + '"></label></div>' +
                        '<div class="ks-pecahan">' + pecahan().map(function (x) { return '<button type="button" class="ly-btn ly-btn--sm" data-terima="' + x + '">' + (x === tot ? 'Uang pas' : L.rupiah(x)) + '</button>'; }).join('') + '</div>' +
                        '<div class="ly-sum"><div class="ly-total"><span>Kembalian</span><span' + (kembali < 0 ? ' class="ly-telat"' : '') + '>' + (kembali < 0 ? 'kurang ' + L.rupiah(-kembali) : L.rupiah(kembali)) + '</span></div></div>' : '') +
                '<div class="ly-btns ks-m__aksi"><button type="button" class="ly-btn" data-tutup>Batal</button><button type="button" class="ly-btn ly-btn--pri" id="km-ok">' + (dp ? 'Simpan DP' : 'Konfirmasi bayar') + '</button></div></div>';
        }
        gambar(); m.hidden = false;
        m.onclick = function (e) {
            var b = e.target.closest('button');
            if (e.target === m || (b && b.hasAttribute('data-tutup'))) { m.hidden = true; return; }
            if (!b) return;
            if (b.dataset.dp != null) { bayar.dp = b.dataset.dp === '1'; gambar(); }
            else if (b.dataset.metode) { bayar.metode = b.dataset.metode; gambar(); }
            else if (b.dataset.terima) { bayar.diterima = +b.dataset.terima; gambar(); }
            else if (b.id === 'km-ok') {
                if (bayar.dp) {
                    kr.nama = $('#ks-nama').value.trim(); kr.hp = $('#ks-hp').value.trim();
                    if (!kr.nama || L.hp4(kr.hp).length < 4) return toast('Untuk DP, isi nama dan nomor WA pelanggan di invoice.', true);
                    var j = +bayar.jumlahDp || 0; if (j >= tot) return toast('Jumlah DP sama dengan total: pilih Bayar lunas.', true);
                    if (!bayar.batas || bayar.batas < L.hariIni()) return toast('Batas pelunasan tidak valid.', true);
                    if (!j && !confirm('Belum ada DP. Tetap tahan barang untuk pelanggan ini?')) return;
                } else if (bayar.metode === 'tunai' && bayar.diterima < tot) return toast('Uang diterima kurang dari total.', true);
                prosesBayar(bayar, b);
            }
        };
        m.oninput = function (e) {
            if (e.target.id === 'km-terima') { bayar.diterima = Math.round(+e.target.value || 0); var k = bayar.diterima - tot, el = $('.ks-m .ly-total span:last-child'); el.textContent = k < 0 ? 'kurang ' + L.rupiah(-k) : L.rupiah(k); el.className = k < 0 ? 'ly-telat' : ''; }
            else if (e.target.id === 'km-dp') { bayar.jumlahDp = e.target.value; }
            else if (e.target.id === 'km-batas') bayar.batas = e.target.value;
        };
        m.onchange = function (e) { if (e.target.id === 'km-dp') gambar(); };
    }
    /* simpan: barang stok jadi satu transaksi jual, tiap servis dicatat pelunasannya. Yang sudah tersimpan dikeluarkan dari
       keranjang, supaya bila langkah berikutnya gagal, Bayar diulang tanpa mencatat dua kali */
    function prosesBayar(bayar, btn) {
        var stokIt = kr.items.filter(function (i) { return i.jenis === 'stok'; }), svIt = kr.items.filter(function (i) { return i.jenis === 'servis'; });
        var nama = $('#ks-nama').value.trim(), hp = $('#ks-hp').value.trim(), tgl = L.hariIni(), tot = totalKr();
        var struk = { waktu: new Date(), nama: nama, hp: hp, items: kr.items.map(function (i) { return { nama: i.nama, kode: i.kode, qty: i.qty, harga: i.harga }; }), total: tot, metode: bayar.metode, dp: bayar.dp,
            dibayar: bayar.dp ? +bayar.jumlahDp || 0 : tot, diterima: !bayar.dp && bayar.metode === 'tunai' ? bayar.diterima : null, kode: [], nota: [] };
        sibuk(btn, true, 'Menyimpan…'); menyimpan = true;
        var p = Promise.resolve();
        if (stokIt.length) p = p.then(function () {
            var tStok = stokIt.reduce(function (t, i) { return t + i.harga * i.qty; }, 0), dibayar = bayar.dp ? +bayar.jumlahDp || 0 : tStok;
            var rec = { nama: nama, hp: hp, tgl: tgl, catatan: 'Kasir', items: stokIt.map(function (i) { return { stok_id: i.id, kode: i.kode, nama: i.nama, qty: i.qty, harga: i.harga }; }),
                bayar: dibayar ? [{ id: idAcak(), tgl: tgl, jumlah: dibayar, jenis: bayar.dp ? 'dp' : 'pelunasan', metode: bayar.metode }] : [] };
            if (bayar.dp) rec.batas_lunas = bayar.batas; else rec.status = 'selesai';
            return A.simpanJual(rec).then(function (row) {
                taruh('jual', row); cache.stok = A.daftar('stok'); struk.kode.push(row.kode); struk.jual = row;
                if (L.hp4(row.hp).length === 4) struk.nota.push(L.urlNotaJual(row.kode));
                kr.items = kr.items.filter(function (i) { return i.jenis !== 'stok'; });
            });
        });
        svIt.forEach(function (it) {
            p = p.then(function () {
                var s = salin(cariId('servis', it.id));
                s.bayar = (s.bayar || []).concat([{ id: idAcak(), tgl: tgl, jumlah: it.harga, jenis: 'pelunasan', metode: bayar.metode }]);
                if (it.ambil) s.status = 'diambil';
                return A.simpanServis(s, []).then(function (row) {
                    taruh('servis', row); struk.kode.push(row.kode); struk.nota.push(L.urlNota(row.kode));
                    kr.items = kr.items.filter(function (i) { return !(i.jenis === 'servis' && i.id === it.id); });
                });
            });
        });
        p.then(function () {
            menyimpan = false; kr = { items: [] }; strukAkhir = struk; tutupLembar();
            if ($('#ks-nama')) { $('#ks-nama').value = ''; $('#ks-hp').value = ''; }
            gambarProduk(); gambarKeranjang(); tampilStruk(struk);
        }, function (e) {
            menyimpan = false; sibuk(btn, false); gambarProduk(); gambarKeranjang();
            gagal(e); if (struk.kode.length) toast('Sebagian sudah tersimpan (' + struk.kode.join(', ') + '). Sisa keranjang: tekan bayar lagi.', true);
        });
    }

    /* ---------- struk: layar, printer thermal 58 mm / PDF, dan WhatsApp ---------- */
    var METODE_STRUK = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };
    function jamStruk(d) { return L.tgl(L.tglStr(d)) + ' ' + ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2); }
    function htmlStruk(s) {
        var t = C.toko, sisa = s.total - s.dibayar;
        return '<div class="struk"><div class="struk-c"><b>' + E(t.nama.toUpperCase()) + '</b><span>' + E(t.alamat) + '</span><span>WA +' + E(t.wa) + '</span></div>' +
            '<div class="struk-g"></div><div class="struk-r"><span>' + E(s.kode.join(', ')) + '</span><span>' + jamStruk(s.waktu) + '</span></div>' + (s.nama ? '<div class="struk-r"><span>Pelanggan</span><span>' + E(s.nama) + '</span></div>' : '') +
            '<div class="struk-g"></div>' + s.items.map(function (i) { return '<div class="struk-i"><span>' + E(i.nama) + '</span><div class="struk-r"><span>' + i.qty + ' x ' + L.rupiah(i.harga) + '</span><span>' + L.rupiah(i.qty * i.harga) + '</span></div></div>'; }).join('') +
            '<div class="struk-g"></div><div class="struk-r t"><span>TOTAL</span><span>' + L.rupiah(s.total) + '</span></div>' +
            (s.dp ? '<div class="struk-r"><span>DP (' + METODE_STRUK[s.metode] + ')</span><span>' + L.rupiah(s.dibayar) + '</span></div><div class="struk-r t"><span>SISA</span><span>' + L.rupiah(sisa) + '</span></div>' +
                (s.jual && s.jual.batas_lunas ? '<div class="struk-r"><span>Lunasi s/d</span><span>' + L.tgl(s.jual.batas_lunas) + '</span></div>' : '')
                : '<div class="struk-r"><span>Bayar (' + METODE_STRUK[s.metode] + ')</span><span>' + L.rupiah(s.diterima != null ? s.diterima : s.total) + '</span></div>' + (s.diterima != null ? '<div class="struk-r"><span>Kembali</span><span>' + L.rupiah(s.diterima - s.total) + '</span></div>' : '')) +
            '<div class="struk-g"></div><div class="struk-c"><span>Terima kasih sudah berbelanja!</span>' + (s.nota.length ? '<span>Nota online: ayrigitar.com (kode + 4 digit HP)</span>' : '') + '<span>ayrigitar.com</span></div></div>';
    }
    function teksStruk(s) {
        var t = 'Halo Kak ' + (s.nama || '') + ', terima kasih sudah berbelanja di ' + C.toko.nama + ' 🙏\n\nStruk ' + s.kode.join(', ') + ' · ' + jamStruk(s.waktu) + '\n';
        t += s.items.map(function (i) { return '• ' + i.nama + (i.qty > 1 ? ' ×' + i.qty : '') + ' – ' + L.rupiah(i.harga * i.qty); }).join('\n');
        t += '\n\nTotal: *' + L.rupiah(s.total) + '*\n' + (s.dp ? 'DP (' + METODE_STRUK[s.metode].toLowerCase() + '): ' + L.rupiah(s.dibayar) + '\nSisa: *' + L.rupiah(s.total - s.dibayar) + '*' + (s.jual ? ' (lunasi paling lambat ' + L.tgl(s.jual.batas_lunas) + ')' : '') : 'Dibayar (' + METODE_STRUK[s.metode].toLowerCase() + '): ' + L.rupiah(s.total) + ' ✅');
        if (s.nota.length) t += '\n\nNota online:\n' + s.nota.join('\n') + '\n(masukkan 4 digit terakhir no. HP Kakak)';
        if (s.dp) t += '\n\nKetentuan DP (batas pelunasan, biaya pembatalan ' + C.jual.potonganPersen + '%) ada di nota. Mohon balas *SETUJU* bila sudah sesuai.';
        return t;
    }
    function cetakStruk(s) {
        var el = $('#struk-cetak'); if (!el) { el = document.createElement('div'); el.id = 'struk-cetak'; document.body.appendChild(el); }
        el.innerHTML = htmlStruk(s); document.body.classList.add('cetak-struk');
        var lepas = function () { document.body.classList.remove('cetak-struk'); window.removeEventListener('afterprint', lepas); };
        window.addEventListener('afterprint', lepas); window.print();
        if (!window.AyriApp) setTimeout(lepas, 1500); /* di aplikasi Android: dilepas saat cetak selesai (event afterprint) */
    }
    function tampilStruk(s) {
        var m = $('#ks-modal'); if (!m) return;
        var adaHp = L.hp4(s.hp).length === 4;
        m.innerHTML = '<div class="ly-modal__in ks-m" role="dialog" aria-modal="true" aria-label="Transaksi berhasil">' +
            '<div class="ks-m__ok">' + SVG.ok + '<b>' + (s.dp ? 'DP tersimpan!' : 'Transaksi berhasil!') + '</b><small>' + E(s.kode.join(', ')) + '</small></div>' + htmlStruk(s) +
            '<div class="ly-btns ks-m__aksi"><button type="button" class="ly-btn" id="st-cetak">Cetak struk 58 mm</button>' +
            (bisaCetakBt() ? '<button type="button" class="ly-btn" id="st-printer">Ganti printer</button>' : '') + '<button type="button" class="ly-btn" id="st-pdf">Simpan PDF</button>' +
            (adaHp ? '<button type="button" class="ly-btn ly-btn--wa" id="st-wa">Kirim WA</button>' : '') +
            '<button type="button" class="ly-btn ly-btn--pri" id="st-baru">Transaksi baru</button></div>' +
            (s.dp && s.jual ? '<p class="ly-hint" style="margin:0;text-align:center"><a href="#jual/' + E(s.jual.id) + '">Buka transaksi DP</a> untuk pengingat & pelunasan.</p>' : '') + '</div>';
        m.hidden = false;
        m.onclick = function (e) {
            var b = e.target.closest('button'); if (!b) return;
            if (b.id === 'st-cetak' && bisaCetakBt()) { kirimKeAplikasi('cetakStruk', { baris: L.strukThermal(s) }); toast('Mencetak…'); }
            else if (b.id === 'st-cetak' || b.id === 'st-pdf') cetakStruk(s);
            else if (b.id === 'st-printer') kirimKeAplikasi('pilihPrinter', {});
            else if (b.id === 'st-wa') bukaWa(s.hp, teksStruk(s));
            else if (b.id === 'st-baru') m.hidden = true;
        };
        m.oninput = m.onchange = null;
    }

    /* ---------- antrian servis: papan kanban per status (tampilan lain dari daftar yang sama) ---------- */
    var tampilSv = (function () { try { return localStorage.getItem('ayri-admin-tampilan') || 'papan'; } catch (e) { return 'papan'; } })();
    var KOLOM = [['menunggu_dp', 'Menunggu DP'], ['antri', 'Antri'], ['dikerjakan', 'Dikerjakan'], ['selesai', 'Selesai · siap ambil'], ['diambil', 'Diambil']];
    function gambarPapan(rows, c, hari) {
        var batasAmbil = L.tambahHari(hari, -30);
        function cocok(s) { return !c || [s.kode, s.nama, s.hp, s.gitar_jenis, s.gitar_merk, s.keluhan].join(' ').toLowerCase().indexOf(c) > -1; }
        return '<div class="kb">' + KOLOM.map(function (k, ki) {
            var isi = rows.filter(function (s) { return s.status === k[0] && cocok(s) && (k[0] !== 'diambil' || (s.tgl_diambil || s.updated_at || '').slice(0, 10) >= batasAmbil); });
            if (k[0] === 'selesai') isi.sort(function (a, b) { return (a.tgl_selesai || '') < (b.tgl_selesai || '') ? -1 : 1; });
            if (k[0] === 'diambil') isi.sort(function (a, b) { return (a.tgl_diambil || '') < (b.tgl_diambil || '') ? 1 : -1; });
            var lebih = k[0] === 'diambil' && isi.length > 12 ? isi.length - 12 : 0; if (lebih) isi = isi.slice(0, 12);
            return '<div class="kb-kol kb-' + k[0] + '"><div class="kb-head"><b>' + k[1] + '</b><span>' + isi.length + (lebih ? '+' : '') + '</span></div><div class="kb-isi">' + (isi.length ? isi.map(function (s) {
                var h = L.hitung(s, s.items, s.bayar), beres = L.beres(s), telat = s.estimasi && s.estimasi < hari && !beres, part = (s.items || []).filter(function (i) { return i.jenis === 'part'; }).length;
                var bayar = !h.total ? '<small class="ly-warn">Biaya belum diisi</small>' : h.lunas ? '<small class="kb-lunas">Lunas</small>' : h.kurangAwal && !beres ? '<small class="ly-warn">DP kurang ' + L.rupiah(h.kurangAwal) + '</small>' : '<small>Sisa ' + L.rupiah(h.sisa) + '</small>';
                var t = k[0] === 'selesai' && L.titip(s, hari);
                return '<div class="kb-k" data-id="' + E(s.id) + '"><a class="kb-k__a" href="#servis/' + E(s.id) + '">' +
                    '<span class="kb-k__top"><span class="kb-kode">' + E(s.kode) + '</span><span class="kb-jenis">' + E(s.gitar_jenis || 'Gitar') + '</span></span>' +
                    '<b class="kb-gitar">' + E(s.gitar_merk || s.gitar_jenis || 'Gitar') + '</b><span class="kb-org">' + E(s.nama) + '</span>' +
                    (s.keluhan ? '<p><span>' + E(s.keluhan) + '</span></p>' : '') +
                    '<span class="kb-meta">' + (part ? '<span>' + part + ' part</span>' : '') + (s.estimasi && !beres ? '<span' + (telat ? ' class="ly-telat"' : '') + '>Estimasi ' + L.tgl(s.estimasi) + (telat ? ' (lewat)' : '') + '</span>' : '') +
                    (t ? (t.hariBiaya ? '<span class="ly-telat">Titip ' + t.hariBiaya + ' hari</span>' : '<span>Gratis titip s/d ' + L.tgl(t.batasGratis) + '</span>') : '') + '</span></a>' +
                    '<div class="kb-k__b"><div class="kb-biaya"><small>Biaya</small><b>' + L.rupiah(h.total) + '</b>' + bayar + '</div><div class="kb-nav">' +
                    (ki > 0 ? '<button type="button" data-geser="-1" aria-label="Pindah ke ' + E(KOLOM[ki - 1][1]) + '" title="Ke ' + E(KOLOM[ki - 1][1]) + '">‹</button>' : '') +
                    (ki < KOLOM.length - 1 ? '<button type="button" data-geser="1" aria-label="Pindah ke ' + E(KOLOM[ki + 1][1]) + '" title="Ke ' + E(KOLOM[ki + 1][1]) + '">›</button>' : '') + '</div></div>' +
                    (k[0] === 'selesai' ? '<div class="kb-k__c">' + (h.sisa ? '<a class="ly-btn ly-btn--sm" href="#kasir" data-kasir="' + E(s.id) + '">Bayar di kasir</a>' : '') +
                        '<button type="button" class="ly-btn ly-btn--sm' + (L.perluIngat(s, hari) ? ' ly-btn--wa' : '') + '" data-ingat="' + E(s.id) + '">' + (L.perluIngat(s, hari) ? 'Ingatkan via WA' : 'Pengingat') + '</button></div>' : '') + '</div>';
            }).join('') : '<p class="kb-kosong">Tidak ada</p>') + (lebih ? '<p class="kb-kosong">+' + lebih + ' lagi di tampilan Daftar</p>' : '') + '</div></div>';
        }).join('') + '</div>';
    }
    /* pindah status dari papan: aturan & konfirmasi sama dengan form servis */
    function geserServis(id, arah, kartu) {
        var s = salin(cariId('servis', id)), i = L.URUT_STATUS.indexOf(s.status), st = L.URUT_STATUS[i + arah], h = L.hitung(s, s.items, s.bayar);
        if (!st) return;
        if ((st === 'dikerjakan' || st === 'antri') && arah > 0 && h.kurangAwal > 0 && !confirm('Pembayaran awal masih kurang ' + L.rupiah(h.kurangAwal) + '. Aturan toko: dikerjakan setelah DP dan part lunas.\n\nTetap ubah status?')) return;
        if (st === 'diambil' && h.sisa > 0 && !confirm('Masih ada sisa pembayaran ' + L.rupiah(h.sisa) + '. Sebaiknya terima pembayaran lewat Kasir.\n\nTetap tandai sudah diambil?')) return;
        if (st === 'menunggu_dp' && h.total > 0 && h.kurangAwal === 0) return toast('Pembayaran awal sudah terpenuhi, jadi status tidak bisa kembali ke Menunggu DP.', true);
        s.status = st; if (arah < 0 && st !== 'selesai' && st !== 'diambil') { delete s.tgl_selesai; } if (arah < 0 && st !== 'diambil') delete s.tgl_diambil;
        kartu.classList.add('sibuk'); menyimpan = true;
        A.simpanServis(s, []).then(function (row) {
            menyimpan = false; taruh('servis', row); gambarDaftar();
            toast(st === 'selesai' ? 'Pindah ke Selesai. Tambahkan foto sesudah & saran, lalu kabari pelanggan lewat WA.' : 'Status: ' + L.STATUS[st].label + '.');
        }).catch(function (e) { menyimpan = false; kartu.classList.remove('sibuk'); gagal(e); });
    }

    /* ================= cadangan (dicatat per perangkat, untuk pengingat) ================= */
    function unduhCadangan(lalu) {
        dialogSandi({ judul: 'Unduh cadangan', label: 'Sandi cadangan', ulang: true, tombol: 'Unduh', sibuk: 'Mengunci cadangan…',
            ket: 'Cadangan berisi data pelanggan, jadi dikunci dengan sandi pilihan Anda. Catat sandi ini baik-baik: tanpa sandi, cadangan tidak bisa dibuka.' }, function (sandi) {
            return A.cadanganTerenkripsi(sandi).then(function (teks) {
                simpanBerkas('cadangan-servis-ayri-' + L.hariIni() + '.ayri.json', teks);
                try { localStorage.setItem('ayri-cadangan-terakhir', L.hariIni()); } catch (e) {}
                if (lalu) lalu();
            });
        });
    }
    function bukaCadanganUi() {
        var pilih = document.createElement('input'); pilih.type = 'file'; pilih.accept = '.json,application/json';
        pilih.addEventListener('change', function () {
            var file = pilih.files[0]; if (!file) return;
            file.text().then(function (teks) {
                dialogSandi({ judul: 'Buka cadangan', label: 'Sandi cadangan', tombol: 'Buka', sibuk: 'Membuka…',
                    ket: 'Hasilnya berkas .json biasa berisi data pelanggan. Simpan di tempat aman dan hapus bila sudah tidak dipakai.' }, function (sandi) {
                    return A.bukaCadangan(teks, sandi).then(function (isi) { simpanBerkas('cadangan-terbuka-' + L.hariIni() + '.json', isi); toast('Cadangan dibuka: berkas .json biasa sudah diunduh.'); });
                });
            }).catch(gagal);
        });
        pilih.click();
    }
    function gantiPinUi() {
        dialogSandi({ judul: 'Ganti PIN', label: 'PIN baru', ulang: true, tombol: 'Simpan PIN', sibuk: 'Menyimpan…',
            ket: 'Minimal ' + A.PIN_MIN + ' karakter, boleh angka atau huruf. PIN ini hanya berlaku di perangkat ini.' }, function (pin) {
            return A.gantiPin(pin).then(function () { toast('PIN diganti.'); });
        });
    }
    function cadanganTerakhir() { try { return localStorage.getItem('ayri-cadangan-terakhir') || ''; } catch (e) { return ''; } }

    /* ================= kas harian ================= */
    function kasHari(tgl) { return cache.kas.filter(function (k) { return k.tgl === tgl; })[0] || null; }
    /* tunai masuk bersih hari itu dari semua transaksi (penjualan, servis, tebus), tanpa pengeluaran operasional */
    function hitungKas(k, tgl) {
        var masuk = 0; arusKas().forEach(function (x) { if (x.tgl === tgl && (x.metode || 'tunai') === 'tunai' && x.sumber !== 'operasional') masuk += x.jumlah; });
        var keluar = (k && k.pengeluaran || []).filter(function (p) { return (p.metode || 'tunai') === 'tunai'; }).reduce(function (t, p) { return t + (+p.jumlah || 0); }, 0);
        var awal = k ? +k.saldo_awal || 0 : 0;
        return { awal: awal, masuk: masuk, keluar: keluar, harus: awal + masuk - keluar };
    }
    function namaTerakhir() { try { return localStorage.getItem('ayri-nama-kasir') || ''; } catch (e) { return ''; } }
    function ingatNama(n) { try { localStorage.setItem('ayri-nama-kasir', n); } catch (e) {} }
    function jamKini() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    function badgeSelisih(x) { return x === 0 ? '<span class="jm-badge">Pas</span>' : '<span class="jm-badge telat">' + (x < 0 ? 'Kurang ' : 'Lebih ') + L.rupiah(Math.abs(x)) + '</span>'; }
    /* kartu kas hari ini: buka / pengeluaran / tutup (dipakai di layar Hari ini) */
    function kartuKas(el, lalu) {
        var h = L.hariIni(), k = kasHari(h), n = hitungKas(k, h), staf = (A.pengaturan().staf || []).filter(function (s) { return s.aktif !== false; });
        var dl = '<datalist id="kas-nama">' + staf.map(function (s) { return '<option value="' + E(s.nama) + '">'; }).join('') + '<option value="Owner"></datalist>';
        if (!k || !k.buka_jam) {
            el.innerHTML = '<div class="kas-head"><h2>Kas hari ini</h2><span class="st-chip st-menunggu_dp">Belum dibuka</span></div>' +
                '<p class="ly-muted" style="margin:0">Hitung uang di laci sebelum mulai melayani, lalu buka kasir.</p>' +
                '<div class="ly-f"><div class="ly-row2"><label>Saldo awal laci (Rp)<input type="number" inputmode="numeric" min="0" step="1000" id="kas-awal" value="' + (k && k.saldo_awal || '') + '"></label>' +
                '<label>Dibuka oleh<input id="kas-oleh" list="kas-nama" value="' + E(namaTerakhir()) + '"></label></div>' + dl +
                '<button type="button" class="ly-btn ly-btn--pri" id="kas-buka">Buka kasir</button></div>';
        } else if (!k.tutup_jam) {
            el.innerHTML = '<div class="kas-head"><h2>Kas hari ini</h2><span class="st-chip st-selesai">Buka sejak ' + E(k.buka_jam) + '</span></div>' +
                '<div class="ly-sum" style="margin:0;padding:0;border:0"><div><span>Saldo awal (' + E(k.buka_oleh || '-') + ')</span><span>' + L.rupiah(n.awal) + '</span></div>' +
                '<div><span>Tunai masuk dari transaksi</span><span>' + L.rupiah(n.masuk) + '</span></div><div><span>Pengeluaran tunai</span><span class="ly-telat">−' + L.rupiah(n.keluar) + '</span></div>' +
                '<div class="ly-total"><span>Seharusnya ada di laci</span><span>' + L.rupiah(n.harus) + '</span></div></div>' +
                (k.pengeluaran.length ? '<div class="kas-keluar">' + k.pengeluaran.map(function (p) { return '<div><span><b>' + E(p.ket) + '</b><small>' + E(p.jam) + ' · ' + E(p.kategori) + ' · ' + E(p.metode === 'transfer' ? 'transfer' : 'tunai') + ' · ' + E(p.oleh || '') + '</small></span><b>−' + L.rupiah(p.jumlah) + '</b></div>'; }).join('') + '</div>' : '') +
                '<details class="kas-form" id="kas-f-keluar"><summary class="ly-btn">+ Catat pengeluaran</summary><div class="ly-f">' +
                '<label>Untuk apa<input id="kp-ket" placeholder="mis. beli senar 10 set, bensin, makan siang"></label>' +
                '<div class="ly-row2"><label>Jumlah (Rp)<input type="number" inputmode="numeric" min="0" step="1000" id="kp-jml"></label><label>Kategori<select id="kp-kat">' + opsi(L.KATEGORI_KELUAR, L.KATEGORI_KELUAR[0]) + '</select></label></div>' +
                '<div class="ly-row2"><label>Dibayar dari<select id="kp-metode">' + opsi([['tunai', 'Laci (tunai)'], ['transfer', 'Rekening (transfer)']], 'tunai') + '</select></label><label>Dicatat oleh<input id="kp-oleh" list="kas-nama" value="' + E(namaTerakhir()) + '"></label></div>' + dl +
                '<button type="button" class="ly-btn ly-btn--pri" id="kas-keluar">Simpan pengeluaran</button></div></details>' +
                '<details class="kas-form" id="kas-f-tutup"><summary class="ly-btn">Tutup kasir</summary><div class="ly-f">' +
                '<p class="ly-muted" style="margin:0">Hitung semua uang di laci, lalu isi jumlahnya. Seharusnya <b>' + L.rupiah(n.harus) + '</b>.</p>' +
                '<div class="ly-row2"><label>Uang di laci (Rp)<input type="number" inputmode="numeric" min="0" step="1000" id="kt-hitung"></label><label>Ditutup oleh<input id="kt-oleh" list="kas-nama" value="' + E(namaTerakhir()) + '"></label></div>' +
                '<label>Catatan (opsional)<input id="kt-cat" placeholder="mis. uang kecil ditukar, setor ke rekening Rp…"></label><div id="kt-selisih"></div>' +
                '<button type="button" class="ly-btn ly-btn--pri" id="kas-tutup">Tutup kasir</button></div></details>';
        } else {
            var r = k.ringkas || {};
            el.innerHTML = '<div class="kas-head"><h2>Kas hari ini</h2><span class="st-chip st-diambil">Ditutup ' + E(k.tutup_jam) + '</span></div>' +
                '<div class="ly-sum" style="margin:0;padding:0;border:0"><div><span>Seharusnya</span><span>' + L.rupiah(r.harus_ada) + '</span></div><div><span>Dihitung (' + E(k.tutup_oleh || '-') + ')</span><span>' + L.rupiah(k.uang_laci) + '</span></div>' +
                '<div class="ly-total"><span>Selisih</span><span>' + badgeSelisih(r.selisih || 0) + '</span></div></div>' + (k.catatan ? '<p class="ly-hint" style="margin:0">' + E(k.catatan) + '</p>' : '') +
                (owner() ? '<button type="button" class="ly-btn ly-btn--sm" id="kas-bukaulang" style="justify-self:start">Buka lagi</button>' : '');
        }
        el.oninput = function (e) {
            if (e.target.id !== 'kt-hitung') return;
            var x = Math.round(+e.target.value || 0) - hitungKas(kasHari(h), h).harus; $('#kt-selisih').innerHTML = e.target.value === '' ? '' : '<div class="ly-sum" style="margin:0;padding:0;border:0"><div class="ly-total"><span>Selisih</span><span>' + badgeSelisih(x) + '</span></div></div>';
        };
        el.onclick = function (e) {
            var b = e.target.closest('button'); if (!b) return;
            function simpan(fn, pesan) {
                sibuk(b, true, 'Menyimpan…'); menyimpan = true;
                A.ubahKas(h, fn).then(function () { menyimpan = false; cache.kas = A.daftar('kas'); toast(pesan); lalu(); }).catch(function (err) { menyimpan = false; sibuk(b, false); gagal(err); });
            }
            if (b.id === 'kas-buka') {
                var awal = Math.round(+$('#kas-awal').value || 0), oleh = $('#kas-oleh').value.trim();
                if ($('#kas-awal').value === '') return toast('Isi saldo awal laci (boleh 0).', true);
                if (!oleh) return toast('Isi nama yang membuka kasir.', true);
                ingatNama(oleh);
                simpan(function (rec) { if (rec.buka_jam && !rec.tutup_jam) throw new Error('Kasir sudah dibuka di perangkat lain. Muat ulang.'); rec.saldo_awal = awal; rec.buka_jam = jamKini(); rec.buka_oleh = oleh; delete rec.tutup_jam; }, 'Kasir dibuka.');
            } else if (b.id === 'kas-keluar') {
                var p = { id: idAcak(), jam: jamKini(), ket: $('#kp-ket').value.trim(), jumlah: Math.round(+$('#kp-jml').value || 0), kategori: $('#kp-kat').value, metode: $('#kp-metode').value, oleh: $('#kp-oleh').value.trim() };
                if (!p.ket) return toast('Isi untuk apa pengeluarannya.', true);
                if (p.jumlah <= 0) return toast('Isi jumlah pengeluaran.', true);
                if (p.oleh) ingatNama(p.oleh);
                simpan(function (rec) { rec.pengeluaran.push(p); }, 'Pengeluaran dicatat.');
            } else if (b.id === 'kas-tutup') {
                if ($('#kt-hitung').value === '') return toast('Isi jumlah uang di laci.', true);
                var dihitung = Math.round(+$('#kt-hitung').value || 0), ol = $('#kt-oleh').value.trim(), cat = $('#kt-cat').value.trim();
                if (!ol) return toast('Isi nama yang menutup kasir.', true);
                ingatNama(ol);
                /* hitungan "seharusnya" memakai transaksi dari SEMUA perangkat: muat data terbaru dulu, dan beri tahu bila angkanya berubah */
                var harusTadi = hitungKas(kasHari(h), h).harus;
                sibuk(b, true, 'Memeriksa transaksi terbaru…'); menyimpan = true;
                A.muat().then(function (d) {
                    cache = d; menyimpan = false; sibuk(b, false);
                    var harusKini = hitungKas(kasHari(h), h).harus;
                    if (harusKini !== harusTadi && !confirm('Ada transaksi baru dari perangkat lain. Uang yang seharusnya ada di laci sekarang ' + L.rupiah(harusKini) + ' (tadi ' + L.rupiah(harusTadi) + ').\n\nTutup kasir dengan hitungan ' + L.rupiah(dihitung) + ' (selisih ' + L.rupiah(dihitung - harusKini) + ')?')) { lalu(); return; }
                    simpan(function (rec) {
                        var nn = hitungKas(rec, h);
                        rec.tutup_jam = jamKini(); rec.tutup_oleh = ol; rec.uang_laci = dihitung; rec.catatan = cat;
                        rec.ringkas = { saldo_awal: nn.awal, tunai_masuk: nn.masuk, pengeluaran_tunai: nn.keluar, harus_ada: nn.harus, selisih: dihitung - nn.harus };
                    }, 'Kasir ditutup.');
                }).catch(function (err) { menyimpan = false; sibuk(b, false); gagal(err); });
            } else if (b.id === 'kas-bukaulang') {
                if (!confirm('Buka lagi kasir hari ini? Hasil tutup kasir sebelumnya dihapus.')) return;
                simpan(function (rec) { delete rec.tutup_jam; delete rec.tutup_oleh; delete rec.uang_laci; delete rec.ringkas; }, 'Kasir dibuka lagi.');
            }
        };
    }

    /* ================= layar Hari ini: ringkasan + yang perlu ditindak ================= */
    function halamanHari() {
        var h = L.hariIni(), log = arusKas().filter(function (x) { return x.tgl === h && x.sumber !== 'operasional'; }), d = new Date();
        var masuk = { tunai: 0, transfer: 0, qris: 0 }; log.forEach(function (x) { if (x.jumlah > 0) masuk[x.metode || 'tunai'] = (masuk[x.metode || 'tunai'] || 0) + x.jumlah; });
        var trans = cache.jual.filter(function (j) { return j.tgl === h && j.status !== 'batal'; }).length;
        var svMasuk = cache.servis.filter(function (s) { return s.tgl_masuk === h; }).length, svSelesai = cache.servis.filter(function (s) { return s.tgl_selesai === h; }).length;
        var t = [];
        /* DP barang mendekati / lewat batas pelunasan */
        cache.jual.forEach(function (j) { var i = L.infoJual(j); if (i.sisa != null && i.sisa <= 3) t.push({ g: 'DP barang', u: i.lewat ? 0 : 1, h: '#jual/' + j.id, t: (j.nama || 'Pembeli') + ' · ' + L.namaJual(j), m: 'Sisa ' + L.rupiah(L.hitungJual(j).sisa) + ' · batas ' + L.tgl(j.batas_lunas) + (i.lewat ? ' (lewat ' + -i.sisa + ' hari)' : i.sisa ? ' (' + i.sisa + ' hari lagi)' : ' (hari ini)'), merah: i.lewat }); });
        /* sewa gitar: kembali besok / hari ini / telat */
        cache.sewa.forEach(function (w) { if (L.perluIngatSewa(w, h)) { var i = L.infoSewa(w, h); t.push({ g: 'Sewa gitar', u: i.lewat ? 0 : 1, h: '#sewa/' + w.id, t: w.nama + ' · ' + w.nama_barang, m: i.lewat ? 'Telat ' + i.hariTelat + ' hari (batas ' + L.tgl(L.batasSewa(w)) + ')' : i.sisa ? 'Kembali besok' : 'Kembali hari ini', merah: i.lewat }); } });
        /* servis lewat estimasi */
        cache.servis.forEach(function (s) { if (['menunggu_dp', 'antri', 'dikerjakan'].indexOf(s.status) > -1 && s.estimasi && s.estimasi < h) t.push({ g: 'Servis lewat estimasi', u: 1, h: '#servis/' + s.id, t: L.namaGitar(s, 'Gitar') + ' · ' + s.nama, m: L.STATUS[s.status].label + ' · estimasi ' + L.tgl(s.estimasi), merah: true }); });
        /* gitar selesai belum diambil */
        cache.servis.forEach(function (s) { if (L.perluIngat(s, h)) { var tt = L.titip(s, h); t.push({ g: 'Gitar belum diambil', u: 2, h: '#servis/' + s.id, t: L.namaGitar(s, 'Gitar') + ' · ' + s.nama, m: 'Selesai ' + tt.lama + ' hari lalu' + (tt.hariBiaya ? ' · titip ' + L.rupiah(tt.biaya) : '') + ' · kirim pengingat WA' }); } });
        /* tebus jatuh tempo (owner) */
        if (owner()) cache.tebus.forEach(function (tb) { if (L.perluIngatTebus(tb, h)) { var i = L.infoTebus(tb, h); t.push({ g: 'Tebus', u: i.lewat ? 0 : 2, h: '#tebus/' + tb.id, t: L.namaGitar(tb, 'Gitar') + ' · ' + tb.nama, m: 'Batas tebus ' + L.tgl(tb.batas_tebus) + (i.lewat ? ' (lewat)' : ' (' + i.sisa + ' hari lagi)'), merah: i.lewat }); } });
        /* gitar titipan belum terjual lama (owner): tinjau harga dengan pemilik */
        if (owner()) cache.titip.forEach(function (tj) { if (L.perluTinjauTitip(tj, h)) t.push({ g: 'Titip jual', u: 2, h: '#titip/' + tj.id, t: L.namaGitar(tj, 'Gitar') + ' · ' + tj.nama, m: 'Sudah ' + L.hariTitip(tj, h) + ' hari belum terjual · tinjau harga dengan pemilik' }); });
        /* karyawan belum absen padahal jadwal masuk sudah lewat */
        var menitKini = d.getHours() * 60 + d.getMinutes(), tol = +A.pengaturan().toleransi || 0;
        (A.pengaturan().staf || []).filter(function (s) { return s.aktif !== false; }).forEach(function (s) {
            var jd = L.jadwalStaf(s, h), m = /^(\d{1,2}):(\d{2})/.exec(jd.masuk), mm = m ? +m[1] * 60 + +m[2] : 0;
            if (menitKini > mm + tol && !cache.absen.some(function (a) { return a.tgl === h && a.staf_id === s.id; })) t.push({ g: 'Belum absen', u: 3, h: '#jam', t: s.nama, m: 'Jadwal masuk ' + jd.masuk });
        });
        /* laporan opname menunggu (owner) */
        if (owner()) cache.opname.forEach(function (o) { if (o.status === 'menunggu') t.push({ g: 'Opname menunggu', u: 2, h: '#opname/' + o.id, t: o.kode + ' oleh ' + (o.oleh || '-'), m: 'Setujui & sesuaikan stok' }); });
        /* aksesoris hampir habis */
        cache.stok.forEach(function (s) { if (s.kategori === 'aksesoris' && s.status !== 'ditarik' && +s.jumlah > 0 && +s.jumlah <= 2) t.push({ g: 'Stok hampir habis', u: 4, h: '#stok/' + s.id, t: L.namaStok(s), m: 'Sisa ' + s.jumlah }); });
        /* cadangan (owner, per perangkat) */
        var cd = cadanganTerakhir(), lamaCd = cd ? L.hariAntara(cd, h) : null;
        if (owner() && (lamaCd == null || lamaCd >= 7)) t.push({ g: 'Cadangan', u: 4, cad: true, t: 'Unduh cadangan data', m: cd ? 'Terakhir ' + L.tgl(cd) + ' (' + lamaCd + ' hari lalu)' : 'Belum pernah dari perangkat ini' });
        t.sort(function (a, b) { return a.u - b.u; });
        var grup = {}; t.forEach(function (x) { (grup[x.g] = grup[x.g] || []).push(x); });
        var jamH = d.getHours(), sapa = jamH < 11 ? 'Selamat pagi' : jamH < 15 ? 'Selamat siang' : jamH < 18 ? 'Selamat sore' : 'Selamat malam';
        app.innerHTML = '<section class="hr"><div class="ly-head"><div style="flex:1"><h1>Hari ini</h1><p class="ly-muted" style="margin:2px 0 0">' + sapa + ' · ' + L.tglPanjang(h) + '</p></div><a class="ly-btn ly-btn--pri" href="#kasir">Buka layar kasir</a></div>' +
            '<div class="hr-grid"><div class="hr-kiri"><div class="ly-card ly-f kas" id="kas"></div>' +
            '<div class="ly-card"><h2 class="hr-h2">Ringkasan</h2><div class="op-kartu hr-ring">' +
            '<div><small>Uang masuk tunai</small><b>' + L.rupiah(masuk.tunai || 0) + '</b></div><div><small>Uang masuk transfer</small><b>' + L.rupiah((masuk.transfer || 0) + (masuk.qris || 0)) + '</b></div>' +
            '<div><small>Transaksi barang</small><b>' + trans + '</b></div><div><small>Servis masuk · selesai</small><b>' + svMasuk + ' · ' + svSelesai + '</b></div></div>' +
            '<a class="ly-btn ly-btn--sm" href="#kas" style="justify-self:start;margin-top:10px">Riwayat kas &amp; pengeluaran</a></div></div>' +
            '<div class="ly-card hr-tindak"><h2 class="hr-h2">Perlu ditindak <span>' + t.length + '</span></h2>' +
            (t.length ? Object.keys(grup).map(function (k) {
                return '<div class="hr-grup"><h3>' + E(k) + '</h3>' + grup[k].map(function (x) {
                    return x.cad ? '<button type="button" class="hr-it" id="hr-cadang"><span><b>' + E(x.t) + '</b><small>' + E(x.m) + '</small></span><i>Unduh ›</i></button>'
                        : '<a class="hr-it' + (x.merah ? ' merah' : '') + '" href="' + E(x.h) + '"><span><b>' + E(x.t) + '</b><small>' + E(x.m) + '</small></span><i>›</i></a>';
                }).join('') + '</div>';
            }).join('') : '<div class="ks-kosong" style="border-style:solid"><b>Semua beres 👍</b><span>Tidak ada DP jatuh tempo, servis terlambat, atau gitar yang perlu diingatkan.</span></div>') + '</div></div></section>';
        kartuKas($('#kas'), halamanHari);
        if ($('#hr-cadang')) $('#hr-cadang').addEventListener('click', function () { unduhCadangan(function () { toast('Cadangan diunduh. Simpan juga ke Google Drive.'); halamanHari(); }); });
    }

    /* ================= riwayat kas & pengeluaran ================= */
    var bulanKas = '';
    function halamanKas() {
        if (!bulanKas) bulanKas = L.hariIni().slice(0, 7);
        var list = cache.kas.filter(function (k) { return String(k.tgl).slice(0, 7) === bulanKas; }), kat = {}, totKeluar = 0, totSelisih = 0;
        list.forEach(function (k) { (k.pengeluaran || []).forEach(function (p) { kat[p.kategori] = (kat[p.kategori] || 0) + (+p.jumlah || 0); totKeluar += +p.jumlah || 0; }); if (k.ringkas) totSelisih += k.ringkas.selisih || 0; });
        app.innerHTML = '<section class="hr"><div class="ly-head"><a class="ly-back" href="#hari">‹ Hari ini</a></div><div class="ly-head"><h1 style="flex:1">Kas &amp; pengeluaran</h1><input type="month" class="ly-in rk-bln" id="kas-bln" value="' + bulanKas + '"></div>' +
            '<div class="op-kartu"><div><small>Hari kasir dibuka</small><b>' + list.filter(function (k) { return k.buka_jam; }).length + '</b></div><div><small>Total pengeluaran</small><b class="ly-telat">' + L.rupiah(totKeluar) + '</b></div>' +
            '<div><small>Total selisih laci</small><b>' + (totSelisih ? (totSelisih < 0 ? '−' : '+') + L.rupiah(Math.abs(totSelisih)) : 'Rp0') + '</b></div></div>' +
            (Object.keys(kat).length ? '<div class="ly-card"><h2 class="hr-h2">Pengeluaran per kategori</h2>' + batang(Object.keys(kat).sort(function (a, b) { return kat[b] - kat[a]; }).map(function (k) { return [k, kat[k], '#B42318']; })) + '</div>' : '') +
            '<div class="ly-card tb-wrap"><table class="ly-tabel"><thead><tr><th>Tanggal</th><th>Buka</th><th class="r">Saldo awal</th><th class="r">Tunai masuk</th><th class="r">Pengeluaran</th><th class="r">Seharusnya</th><th class="r">Dihitung</th><th>Selisih</th></tr></thead><tbody>' +
            (list.length ? list.map(function (k) {
                var n = k.ringkas || (function () { var x = hitungKas(k, k.tgl); return { saldo_awal: x.awal, tunai_masuk: x.masuk, pengeluaran_tunai: x.keluar, harus_ada: x.harus }; })();
                return '<tr><td>' + L.tgl(k.tgl) + '</td><td>' + E(k.buka_jam || '–') + (k.buka_oleh ? '<small style="color:var(--ink-3);font-family:inherit">' + E(k.buka_oleh) + '</small>' : '') + '</td><td class="r">' + L.rupiah(n.saldo_awal) + '</td><td class="r">' + L.rupiah(n.tunai_masuk) + '</td><td class="r">' + L.rupiah(n.pengeluaran_tunai) + '</td><td class="r">' + L.rupiah(n.harus_ada) + '</td>' +
                    '<td class="r">' + (k.tutup_jam ? L.rupiah(k.uang_laci) : '<span class="ly-muted">belum ditutup</span>') + '</td><td>' + (k.ringkas ? badgeSelisih(k.ringkas.selisih) : '') + '</td></tr>' +
                    ((k.pengeluaran || []).length ? '<tr class="kas-detail"><td colspan="8">' + k.pengeluaran.map(function (p) { return '<span>' + E(p.jam) + ' · ' + E(p.ket) + ' (' + E(p.kategori) + (p.metode === 'transfer' ? ', transfer' : '') + ') <b>−' + L.rupiah(p.jumlah) + '</b></span>'; }).join('') + '</td></tr>' : '');
            }).join('') : '<tr><td colspan="8" class="ly-muted">Belum ada catatan kas bulan ini.</td></tr>') + '</tbody></table></div></section>';
        $('#kas-bln').addEventListener('change', function () { if (this.value) { bulanKas = this.value; halamanKas(); } });
    }

    /* ================= jam masuk karyawan ================= */
    var detikJam = 0, stafPilih = '';
    function jamSekarang() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    function stafAktif() { return (A.pengaturan().staf || []).filter(function (s) { return s.aktif !== false; }); }
    function absenHariIni(id) { var h = L.hariIni(); return cache.absen.filter(function (a) { return a.tgl === h && a.staf_id === id; })[0]; }
    function halamanJam() {
        var atur = A.pengaturan(), staf = stafAktif(), tol = +atur.toleransi || 0;
        if (staf.length && !staf.some(function (s) { return s.id === stafPilih; })) stafPilih = staf[0].id;
        app.innerHTML = '<section class="jm"><div class="ly-head"><h1>Jam masuk</h1>' + (owner() ? '<a class="ly-btn" href="#jam/atur">Atur karyawan &amp; shift</a>' : '') + '</div>' +
            (staf.length ? '<div class="jm-grid"><div class="ly-card jm-jam"><div class="jm-tgl">' + L.tglPanjang(L.hariIni()) + '</div><div class="jm-waktu" id="jm-waktu"></div>' +
                '<div class="ly-filter jm-staf" id="jm-staf">' + staf.map(function (s) { return '<button type="button" data-staf="' + E(s.id) + '" aria-pressed="' + (s.id === stafPilih) + '">' + E(s.nama) + '</button>'; }).join('') + '</div>' +
                '<div id="jm-aksi"></div></div>' +
                '<div class="ly-card jm-hari"><h2>Hadir hari ini</h2><div id="jm-hadir"></div></div></div>' +
                '<div class="ly-card"><div class="ly-head" style="margin-bottom:10px"><h2 style="flex:1;margin:0;font:700 1.0625rem var(--font-display)">Riwayat</h2><input type="month" class="ly-in jm-bln" id="jm-bln"></div><div id="jm-rekap"></div><div class="tb-wrap"><table class="ly-tabel" id="jm-tabel"></table></div></div>'
                : '<div class="ly-card"><p class="ly-muted" style="margin:0">Belum ada karyawan. ' + (owner() ? 'Tambahkan lewat <a href="#jam/atur">Atur karyawan &amp; shift</a>.' : 'Minta owner menambahkan nama Anda di menu Jam masuk.') + '</p></div>') + '</section>';
        if (!staf.length) return;
        $('#jm-bln').value = L.hariIni().slice(0, 7);
        function detik() { var el = $('#jm-waktu'); if (!el) { clearInterval(detikJam); return; } var d = new Date(); el.textContent = ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2) + '.' + ('0' + d.getSeconds()).slice(-2); }
        clearInterval(detikJam); detikJam = setInterval(detik, 1000); detik();
        function gambarAksi() {
            var s = staf.filter(function (x) { return x.id === stafPilih; })[0], a = absenHariIni(stafPilih), jd = L.jadwalStaf(s, L.hariIni());
            $$('#jm-staf button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.staf === stafPilih); });
            var st = a ? L.statusAbsen(a, tol) : null;
            $('#jm-aksi').innerHTML = '<div class="jm-info"><div><span>Jadwal</span><b>' + E(jd.masuk) + ' – ' + E(jd.pulang) + '</b></div>' +
                '<div><span>Masuk</span><b>' + (a ? E(a.masuk) : '–') + '</b></div><div><span>Keluar</span><b>' + (a && a.keluar ? E(a.keluar) : '–') + '</b></div>' +
                (st ? '<div><span>Status</span><b class="' + (st.telat ? 'ly-telat' : 'jm-ok') + '">' + st.label + '</b></div>' : '') + '</div>' +
                (!a || !a.keluar ? '<input class="ly-in" id="jm-cat" placeholder="Catatan (opsional), mis. macet, izin pulang cepat">' : '') +
                (!a ? '<button type="button" class="ly-btn ly-btn--pri jm-btn" id="jm-masuk">Masuk sekarang</button>'
                    : !a.keluar ? '<button type="button" class="ly-btn jm-btn jm-keluar" id="jm-keluar">Keluar (catat jam pulang)</button>'
                        : '<p class="ly-muted" style="margin:0;text-align:center">Sudah tercatat masuk dan keluar hari ini. Terima kasih!</p>');
        }
        function gambarHadir() {
            var h = L.hariIni(), list = cache.absen.filter(function (a) { return a.tgl === h; });
            $('#jm-hadir').innerHTML = list.length ? list.map(function (a) {
                var st = L.statusAbsen(a, tol);
                return '<div class="jm-row"><div><b>' + E(a.nama) + '</b><small>Masuk ' + E(a.masuk) + (a.keluar ? ' · keluar ' + E(a.keluar) : ' · sedang bertugas') + (a.catatan ? ' · “' + E(a.catatan) + '”' : '') + '</small></div><span class="jm-badge' + (st.telat ? ' telat' : '') + '">' + (st.telat ? 'Terlambat ' + a.telat + 'm' : 'Tepat waktu') + '</span></div>';
            }).join('') : '<p class="ly-muted" style="margin:0">Belum ada yang masuk hari ini.</p>';
        }
        function gambarRiwayat() {
            var bln = $('#jm-bln').value, list = cache.absen.filter(function (a) { return String(a.tgl).slice(0, 7) === bln; }).sort(function (a, b) { return a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : (a.masuk < b.masuk ? 1 : -1); });
            var per = {};
            list.forEach(function (a) { var p = per[a.staf_id] = per[a.staf_id] || { nama: a.nama, hadir: 0, telat: 0, menit: 0 }; p.hadir++; if (L.statusAbsen(a, tol).telat) { p.telat++; p.menit += a.telat; } });
            $('#jm-rekap').innerHTML = Object.keys(per).length ? '<div class="jm-sum">' + Object.keys(per).map(function (k) { var p = per[k]; return '<div><b>' + E(p.nama) + '</b><span>' + p.hadir + ' hari hadir · ' + p.telat + '× terlambat' + (p.menit ? ' (' + p.menit + ' menit)' : '') + '</span></div>'; }).join('') + '</div>' : '';
            $('#jm-tabel').innerHTML = '<thead><tr><th>Tanggal</th><th>Nama</th><th>Jadwal</th><th>Masuk</th><th>Keluar</th><th>Status</th><th>Catatan</th></tr></thead><tbody>' + (list.length ? list.map(function (a) {
                var st = L.statusAbsen(a, tol);
                return '<tr><td>' + L.tgl(a.tgl) + '</td><td>' + E(a.nama) + '</td><td>' + E(a.jadwal_masuk || '') + '</td><td>' + E(a.masuk) + '</td><td>' + E(a.keluar || '–') + '</td><td><span class="jm-badge' + (st.telat ? ' telat' : '') + '">' + st.label + '</span></td><td>' + E(a.catatan || '') + '</td></tr>';
            }).join('') : '<tr><td colspan="7" class="ly-muted">Belum ada catatan bulan ini.</td></tr>') + '</tbody>';
        }
        gambarAksi(); gambarHadir(); gambarRiwayat();
        $('#jm-bln').addEventListener('change', gambarRiwayat);
        $('#jm-staf').addEventListener('click', function (e) { var b = e.target.closest('[data-staf]'); if (b) { stafPilih = b.dataset.staf; gambarAksi(); } });
        $('#jm-aksi').addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return;
            var s = staf.filter(function (x) { return x.id === stafPilih; })[0], a = absenHariIni(stafPilih), jam = jamSekarang(), cat = ($('#jm-cat') || {}).value || '';
            var rec;
            if (b.id === 'jm-masuk') {
                var jd = L.jadwalStaf(s, L.hariIni());
                if (!confirm(s.nama + ' masuk jam ' + jam + '?')) return;
                rec = { tgl: L.hariIni(), staf_id: s.id, nama: s.nama, jadwal_masuk: jd.masuk, jadwal_pulang: jd.pulang, masuk: jam, keluar: null, telat: L.telatMenit(jam, jd.masuk), catatan: cat.trim() };
            } else if (b.id === 'jm-keluar') {
                if (!confirm(s.nama + ' keluar jam ' + jam + '?')) return;
                rec = Object.assign(salin(a), { keluar: jam, catatan: [a.catatan, cat.trim()].filter(Boolean).join(' · ') });
            } else return;
            sibuk(b, true, 'Menyimpan…'); menyimpan = true;
            A.simpanAbsen(rec).then(function (row) {
                menyimpan = false; cache.absen = A.daftar('absen');
                var st = L.statusAbsen(row, tol);
                toast(b.id === 'jm-masuk' ? 'Tercatat masuk ' + row.masuk + ' · ' + st.label + '.' : 'Tercatat keluar ' + row.keluar + '.');
                gambarAksi(); gambarHadir(); gambarRiwayat();
            }).catch(function (err) { menyimpan = false; sibuk(b, false); gagal(err); });
        });
    }
    /* owner: daftar karyawan, jam shift, toleransi */
    function aturKaryawan() {
        var atur = A.pengaturan(); atur.staf = atur.staf || []; if (atur.toleransi == null) atur.toleransi = 5;
        function baris(s, i) {
            return '<div class="jm-it"><div class="ly-row2"><label>Nama<input data-i="' + i + '" data-k="nama" value="' + E(s.nama) + '"></label><label class="ly-cek" style="align-self:end"><input type="checkbox" data-i="' + i + '" data-k="aktif"' + (s.aktif !== false ? ' checked' : '') + '><span>Aktif</span></label></div>' +
                '<div class="ly-row3"><label>Jam masuk<input type="time" data-i="' + i + '" data-k="masuk" value="' + E(s.masuk || '12:00') + '"></label><label>Jam pulang<input type="time" data-i="' + i + '" data-k="pulang" value="' + E(s.pulang || '19:00') + '"></label>' +
                '<label>Masuk hari Jumat<input type="time" data-i="' + i + '" data-k="masuk_jumat" value="' + E(s.masuk_jumat || '') + '"></label></div>' +
                '<button type="button" class="ly-btn ly-btn--sm ly-btn--del" data-hapus="' + i + '">Hapus dari daftar</button></div>';
        }
        function gambar() {
            app.innerHTML = '<section id="ak" class="ly-f"><div class="ly-head"><a class="ly-back" href="#jam">‹ Jam masuk</a></div><div class="ly-head"><h1>Karyawan &amp; shift</h1></div>' +
                '<fieldset class="ly-card ly-f"><legend>Aturan</legend><label>Toleransi terlambat (menit)<input type="number" min="0" max="120" id="ak-tol" value="' + (+atur.toleransi || 0) + '"></label>' +
                '<p class="ly-hint" style="margin:0">Jam masuk dibandingkan dengan jadwal masing-masing; lewat dari toleransi = Terlambat. Kosongkan "Masuk hari Jumat" bila sama dengan hari lain.</p></fieldset>' +
                '<fieldset class="ly-card ly-f"><legend>Karyawan</legend><button type="button" class="ly-btn ly-btn--pri" id="ak-tambah" style="justify-self:start">+ Tambah karyawan</button>' +
                '<div class="ly-f" id="ak-list">' + (atur.staf.length ? atur.staf.map(baris).join('') : '<p class="ly-muted" style="margin:0">Belum ada karyawan.</p>') + '</div></fieldset>' +
                '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="ak-simpan">Simpan</button></div></section>';
        }
        gambar(); setDirty(false);
        app.oninput = app.onchange = function (e) {
            var t = e.target; if (!t.dataset || t.dataset.i == null) { if (t.id === 'ak-tol') { atur.toleransi = Math.max(0, Math.round(+t.value || 0)); setDirty(true); } return; }
            var s = atur.staf[+t.dataset.i]; s[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value; setDirty(true);
        };
        app.onclick = function (e) {
            var b = e.target.closest('button'); if (!b) return;
            if (b.id === 'ak-tambah') {
                atur.staf.push({ id: idAcak(), nama: '', masuk: '12:00', pulang: '19:00', masuk_jumat: '13:00', aktif: true }); gambar(); setDirty(true);
                var baru = $('[data-i="' + (atur.staf.length - 1) + '"][data-k="nama"]'); if (baru) { baru.scrollIntoView({ block: 'center', behavior: 'smooth' }); baru.focus({ preventScroll: true }); }
            }
            else if (b.dataset.hapus != null) { var s = atur.staf[+b.dataset.hapus]; if (confirm('Hapus ' + (s.nama || 'karyawan ini') + ' dari daftar? Riwayat absennya tetap tersimpan.')) { atur.staf.splice(+b.dataset.hapus, 1); gambar(); setDirty(true); } }
            else if (b.id === 'ak-simpan') {
                atur.staf = atur.staf.map(function (s) { return Object.assign(s, { nama: String(s.nama || '').trim() }); });
                if (atur.staf.some(function (s) { return !s.nama; })) return toast('Ada karyawan yang namanya kosong.', true);
                sibuk(b, true); menyimpan = true;
                A.simpanPengaturan(atur).then(function () { menyimpan = false; setDirty(false); toast('Tersimpan.'); pindah('#jam'); }).catch(function (err) { menyimpan = false; sibuk(b, false); gagal(err); });
            }
        };
    }

    /* ================= stock opname ================= */
    var opDraf = null, opCari = '', opTab = 'hitung';
    function barangOpname() { return cache.stok.filter(function (s) { return s.status !== 'ditarik' && !(s.status === 'terjual' && !(+s.jumlah > 0)); }); }
    function ringkasOpname(items) {
        var r = { n: items.length, pas: 0, minus: 0, plus: 0, nilai: 0, tanpaModal: 0 };
        items.forEach(function (it) {
            var d = it.fisik - it.sistem; if (!d) { r.pas++; return; }
            if (d < 0) r.minus += -d; else r.plus += d;
            var s = cariId('stok', it.stok_id), m = s && +s.harga_beli; if (m) r.nilai += d * m; else r.tanpaModal++;
        });
        return r;
    }
    function kartuRingkas(r) {
        return '<div class="op-kartu"><div><small>Barang diperiksa</small><b>' + r.n + '</b></div><div><small>Sesuai</small><b class="jm-ok">' + r.pas + '</b></div>' +
            '<div><small>Selisih unit</small><b' + (r.minus || r.plus ? ' class="ly-warn"' : '') + '>' + (r.plus - r.minus) + '</b><small>−' + r.minus + ' / +' + r.plus + '</small></div>' +
            (owner() ? '<div><small>Nilai selisih (modal)</small><b' + (r.nilai < 0 ? ' class="ly-telat"' : '') + '>' + L.rupiah(r.nilai) + '</b>' + (r.tanpaModal ? '<small>' + r.tanpaModal + ' barang tanpa modal</small>' : '') + '</div>' : '') + '</div>';
    }
    function opname(id) {
        var pending = cache.opname.filter(function (o) { return o.status === 'menunggu'; }).length;
        if (id) return lihatOpname(id);
        if (!opDraf) opDraf = { oleh: '', items: barangOpname().map(function (s) { return { stok_id: s.id, kode: s.kode, nama: namaBarang(s), sistem: +s.jumlah || 0, fisik: +s.jumlah || 0, catatan: '' }; }) };
        app.innerHTML = '<section class="op"><div class="ly-head"><h1>Stock opname</h1><div class="ly-seg" id="op-tab"><button type="button" data-t="hitung" aria-pressed="' + (opTab === 'hitung') + '">Hitung fisik</button><button type="button" data-t="riwayat" aria-pressed="' + (opTab === 'riwayat') + '">Riwayat (' + cache.opname.length + ')</button></div></div>' +
            (pending && owner() ? '<div class="ly-ingat"><span>📋 <b>' + pending + ' laporan</b> dari karyawan menunggu persetujuan.</span><button type="button" class="ly-btn ly-btn--sm" data-t="riwayat">Lihat</button></div>' : '') +
            '<div id="op-isi"></div></section>';
        $('.op').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { opTab = b.dataset.t; opname(); } });
        if (opTab === 'riwayat') return riwayatOpname();
        var el = $('#op-isi');
        el.innerHTML = '<div id="op-ring"></div><div class="ly-card ly-f"><div class="ly-row2"><input class="ly-in" type="search" id="op-cari" placeholder="Cari kode / nama barang…"><input class="ly-in" id="op-oleh" placeholder="Dihitung oleh (nama)"></div>' +
            '<p class="ly-hint" style="margin:0">Isi kolom <b>Fisik</b> sesuai hitungan di rak/gudang. Kolom sudah terisi jumlah sistem: cukup ubah yang berbeda.</p></div>' +
            '<div class="ly-card tb-wrap"><table class="ly-tabel op-tabel" id="op-tabel"></table></div>' +
            '<div class="ly-save"><button type="button" class="ly-btn" id="op-ulang">Mulai ulang</button><button type="button" class="ly-btn ly-btn--pri" id="op-simpan">' + (owner() ? 'Simpan &amp; sesuaikan stok' : 'Kirim laporan ke owner') + '</button></div>';
        $('#op-cari').value = opCari; $('#op-oleh').value = opDraf.oleh;
        function gambar() {
            var c = opCari.trim().toLowerCase();
            $('#op-ring').innerHTML = kartuRingkas(ringkasOpname(opDraf.items));
            $('#op-tabel').innerHTML = '<thead><tr><th>Barang</th><th class="r">Sistem</th><th class="r">Fisik</th><th class="r">Selisih</th><th>Catatan</th></tr></thead><tbody>' + opDraf.items.map(function (it, i) {
                if (c && (it.kode + ' ' + it.nama).toLowerCase().indexOf(c) < 0) return '';
                var d = it.fisik - it.sistem;
                return '<tr' + (d ? ' class="beda"' : '') + '><td><b>' + E(it.nama) + '</b><small>' + E(it.kode) + '</small></td><td class="r">' + it.sistem + '</td>' +
                    '<td class="r"><input type="number" inputmode="numeric" min="0" data-fisik="' + i + '" value="' + it.fisik + '" aria-label="Jumlah fisik ' + E(it.nama) + '"></td>' +
                    '<td class="r"><span class="op-d' + (d < 0 ? ' minus' : d > 0 ? ' plus' : '') + '">' + (d ? (d > 0 ? '+' : '') + d : '✓ pas') + '</span></td>' +
                    '<td><input data-cat="' + i + '" value="' + E(it.catatan) + '" placeholder="' + (d ? 'Alasan selisih' : '') + '"></td></tr>';
            }).join('') + '</tbody>';
        }
        gambar();
        $('#op-cari').addEventListener('input', function () { opCari = this.value; gambar(); });
        $('#op-oleh').addEventListener('input', function () { opDraf.oleh = this.value; });
        $('#op-tabel').addEventListener('change', function (e) {
            var t = e.target;
            if (t.dataset.fisik != null) { opDraf.items[+t.dataset.fisik].fisik = Math.max(0, Math.round(+t.value || 0)); gambar(); }
            if (t.dataset.cat != null) opDraf.items[+t.dataset.cat].catatan = t.value;
        });
        $('#op-ulang').addEventListener('click', function () { if (confirm('Buang hitungan ini dan mulai dari jumlah sistem?')) { opDraf = null; opname(); } });
        $('#op-simpan').addEventListener('click', function () {
            var r = ringkasOpname(opDraf.items), b = this;
            if (!opDraf.oleh.trim()) return toast('Isi nama yang menghitung.', true);
            var tanpaAlasan = opDraf.items.filter(function (it) { return it.fisik !== it.sistem && !String(it.catatan).trim(); }).length;
            if (tanpaAlasan && !confirm(tanpaAlasan + ' barang berselisih tanpa catatan alasan. Tetap simpan?')) return;
            if (owner() && (r.minus || r.plus) && !confirm('Jumlah stok ' + (r.n - r.pas) + ' barang akan disesuaikan dengan hitungan fisik. Lanjutkan?')) return;
            sibuk(b, true, 'Menyimpan…'); menyimpan = true;
            var rec = { oleh: opDraf.oleh.trim(), peran: A.peran(), items: opDraf.items };
            A.simpanOpname(rec, owner()).then(function (row) {
                menyimpan = false; cache.opname = A.daftar('opname'); cache.stok = A.daftar('stok'); opDraf = null; opTab = 'riwayat';
                toast(owner() ? 'Opname ' + row.kode + ' tersimpan, stok disesuaikan.' : 'Laporan ' + row.kode + ' terkirim. Owner akan menyesuaikan stok.');
                pindah('#opname/' + row.id);
            }).catch(function (err) { menyimpan = false; sibuk(b, false); gagal(err); });
        });
    }
    function riwayatOpname() {
        $('#op-isi').innerHTML = '<div class="ly-list">' + (cache.opname.length ? cache.opname.map(function (o) {
            var r = ringkasOpname(o.items || []);
            return '<a class="ly-item" href="#opname/' + E(o.id) + '"><span class="ly-item__k">' + E(o.kode) + '</span><span class="st-chip ' + (o.status === 'menunggu' ? 'st-menunggu_dp' : 'st-selesai') + '">' + (o.status === 'menunggu' ? 'Menunggu owner' : 'Disesuaikan') + '</span>' +
                '<span class="ly-item__t">' + L.tgl(o.tgl) + ' · oleh ' + E(o.oleh || '-') + '</span><span class="ly-item__m"><span>' + r.n + ' barang</span><span>' + r.pas + ' sesuai</span><span>Selisih ' + (r.plus - r.minus) + ' unit (−' + r.minus + ' / +' + r.plus + ')</span>' + (owner() ? '<span>Nilai ' + L.rupiah(r.nilai) + '</span>' : '') + '</span></a>';
        }).join('') : '<p class="ly-kosong">Belum ada laporan opname.</p>') + '</div>';
    }
    function lihatOpname(id) {
        var o = cariId('opname', id);
        if (!o) { app.innerHTML = '<p class="ly-kosong">Laporan tidak ditemukan. <a href="#opname">Kembali</a></p>'; return; }
        var beda = o.items.filter(function (it) { return it.fisik !== it.sistem; });
        app.innerHTML = '<section class="op"><div class="ly-head"><a class="ly-back" href="#opname">‹ Stock opname</a></div><div class="ly-head"><h1>' + E(o.kode) + '</h1><span class="st-chip ' + (o.status === 'menunggu' ? 'st-menunggu_dp' : 'st-selesai') + '">' + (o.status === 'menunggu' ? 'Menunggu owner' : 'Disesuaikan ' + L.tgl(o.tgl_sesuai)) + '</span></div>' +
            '<p class="ly-muted" style="margin:0">Dihitung ' + L.tgl(o.tgl) + ' oleh ' + E(o.oleh || '-') + ' (' + E(o.peran === 'karyawan' ? 'karyawan' : 'owner') + ').</p>' + kartuRingkas(ringkasOpname(o.items)) +
            '<div class="ly-card tb-wrap"><h2 style="margin:0 0 10px;font:700 1.0625rem var(--font-display)">Barang berselisih (' + beda.length + ')</h2><table class="ly-tabel op-tabel"><thead><tr><th>Barang</th><th class="r">Sistem</th><th class="r">Fisik</th><th class="r">Selisih</th>' + (owner() ? '<th class="r">Nilai</th>' : '') + '<th>Catatan</th></tr></thead><tbody>' +
            (beda.length ? beda.map(function (it) { var d = it.fisik - it.sistem, s = cariId('stok', it.stok_id), m = s && +s.harga_beli;
                return '<tr class="beda"><td><b>' + E(it.nama) + '</b><small>' + E(it.kode) + '</small></td><td class="r">' + it.sistem + '</td><td class="r">' + it.fisik + '</td><td class="r"><span class="op-d ' + (d < 0 ? 'minus' : 'plus') + '">' + (d > 0 ? '+' : '') + d + '</span></td>' + (owner() ? '<td class="r">' + (m ? L.rupiah(d * m) : '–') + '</td>' : '') + '<td>' + E(it.catatan || '') + '</td></tr>'; }).join('')
                : '<tr><td colspan="6" class="ly-muted">Semua barang sesuai dengan sistem. 👍</td></tr>') + '</tbody></table></div>' +
            (o.status === 'menunggu' && owner() ? '<div class="ly-save"><button type="button" class="ly-btn ly-btn--pri" id="op-setuju">Setujui &amp; sesuaikan stok</button></div>' : '') + '</section>';
        if ($('#op-setuju')) $('#op-setuju').addEventListener('click', function () {
            var b = this; if (!confirm('Sesuaikan stok ' + beda.length + ' barang sesuai laporan ini? Penjualan sejak hari penghitungan tetap terhitung.')) return;
            sibuk(b, true, 'Menyesuaikan…'); menyimpan = true;
            A.simpanOpname(o, true).then(function () { menyimpan = false; cache.opname = A.daftar('opname'); cache.stok = A.daftar('stok'); toast('Stok disesuaikan.'); lihatOpname(id); })
                .catch(function (err) { menyimpan = false; sibuk(b, false); gagal(err); });
        });
    }

    /* ================= rekap bulanan (khusus owner) ================= */
    var bulanRk = '';
    function bulanLalu(b) { var d = new Date(+b.slice(0, 4), +b.slice(5, 7) - 2, 1); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
    /* semua uang masuk/keluar menurut tanggal pembayaran */
    function arusKas() {
        var log = [];
        cache.servis.forEach(function (s) { (s.bayar || []).forEach(function (b) { log.push({ tgl: b.tgl, jumlah: +b.jumlah || 0, metode: b.metode, sumber: 'servis', kode: s.kode, nama: s.nama, ket: ({ dp: 'DP servis', tambahan: 'Bayar servis', pelunasan: 'Pelunasan servis' })[b.jenis] || 'Bayar servis' }); }); });
        cache.jual.forEach(function (j) { (j.bayar || []).forEach(function (b) { var r = b.jenis === 'refund'; log.push({ tgl: b.tgl, jumlah: (r ? -1 : 1) * (+b.jumlah || 0), metode: b.metode, sumber: 'barang', kode: j.kode, nama: j.nama || 'Pembeli umum', ket: r ? 'Uang dikembalikan (batal)' : ({ dp: 'DP barang', tambahan: 'Bayar barang', pelunasan: j.status === 'dp' ? 'Bayar barang' : 'Jual barang' })[b.jenis] || 'Jual barang' }); }); });
        cache.sewa.forEach(function (w) {
            var depMetode = (w.bayar || []).filter(function (b) { return b.jenis === 'deposit'; }).map(function (b) { return b.metode; })[0] || 'tunai';
            (w.bayar || []).forEach(function (b) {
                var j = +b.jumlah || 0, dasar = { tgl: b.tgl, metode: b.metode, kode: w.kode, nama: w.nama };
                if (b.jenis === 'deposit') log.push(Object.assign({ jumlah: j, sumber: 'deposit', ket: 'Deposit sewa gitar (titipan)' }, dasar));
                else if (b.jenis === 'deposit_kembali') log.push(Object.assign({ jumlah: -j, sumber: 'deposit', ket: 'Deposit sewa dikembalikan' }, dasar));
                else if (b.jenis === 'deposit_potong') { /* deposit dipakai membayar sewa/ganti rugi: tanpa uang bergerak, titipan jadi pendapatan */
                    log.push(Object.assign({}, dasar, { metode: depMetode, jumlah: j, sumber: 'sewa', ket: 'Sewa gitar (dari deposit)' }), Object.assign({}, dasar, { metode: depMetode, jumlah: -j, sumber: 'deposit', ket: 'Deposit sewa dipakai' }));
                } else log.push(Object.assign({ jumlah: j, sumber: 'sewa', ket: 'Sewa gitar' }, dasar));
            });
        });
        cache.kas.forEach(function (k) { (k.pengeluaran || []).forEach(function (p) { log.push({ tgl: k.tgl, jumlah: -(+p.jumlah || 0), metode: p.metode || 'tunai', sumber: 'operasional', kode: p.kategori, nama: p.oleh || '', ket: 'Pengeluaran: ' + p.ket }); }); });
        cache.tebus.forEach(function (t) {
            if (t.status !== 'batal' && t.tgl_beli) log.push({ tgl: t.tgl_beli, jumlah: -(+t.harga_beli || 0), metode: t.metode, sumber: 'tebus', kode: t.kode, nama: t.nama, ket: 'Beli gitar (hak tebus)' });
            if (t.status === 'ditebus' && t.tgl_tebus) log.push({ tgl: t.tgl_tebus, jumlah: L.hargaTebus(t), metode: 'tunai', sumber: 'tebus', kode: t.kode, nama: t.nama, ket: 'Dibeli kembali (tebus)' });
        });
        return log;
    }
    function hitungBulan(bln, log) {
        var r = { masuk: 0, keluar: 0, barang: 0, servis: 0, sewa: 0, deposit: 0, tebus: 0, operasional: 0, metode: {}, harian: {}, log: [] };
        log.forEach(function (x) {
            if (String(x.tgl).slice(0, 7) !== bln) return; r.log.push(x);
            if (x.jumlah >= 0) r.masuk += x.jumlah; else r.keluar += -x.jumlah;
            if (x.sumber === 'barang') r.barang += x.jumlah; else if (x.sumber === 'servis') r.servis += x.jumlah; else if (x.sumber === 'sewa') r.sewa += x.jumlah; else if (x.sumber === 'deposit') r.deposit += x.jumlah; else if (x.sumber === 'operasional') r.operasional += x.jumlah; else r.tebus += x.jumlah;
            var m = x.metode || 'tunai'; r.metode[m] = (r.metode[m] || 0) + x.jumlah;
            var h = r.harian[x.tgl] = r.harian[x.tgl] || { barang: 0, servis: 0 }; if (h[x.sumber] != null && x.jumlah > 0) h[x.sumber] += x.jumlah;
        });
        /* untung kotor barang: transaksi jual bulan itu (bukan batal), harga deal − modal saat ini */
        r.untung = 0; r.tanpaModal = 0; r.terjual = 0; var laris = {};
        cache.jual.forEach(function (j) {
            if (j.status === 'batal' || String(j.tgl).slice(0, 7) !== bln) return;
            (j.items || []).forEach(function (i) {
                var s = cariId('stok', i.stok_id), m = s && +s.harga_beli; r.terjual += i.qty;
                if (m) r.untung += (i.harga - m) * i.qty; else r.tanpaModal++;
                var k = i.kode + '|' + i.nama, l = laris[k] = laris[k] || { nama: i.nama, kode: i.kode, qty: 0, omzet: 0 }; l.qty += i.qty; l.omzet += i.harga * i.qty;
            });
        });
        r.laris = Object.keys(laris).map(function (k) { return laris[k]; }).sort(function (a, b) { return b.qty - a.qty || b.omzet - a.omzet; }).slice(0, 8);
        r.svMasuk = cache.servis.filter(function (s) { return String(s.tgl_masuk).slice(0, 7) === bln && s.status !== 'batal'; });
        r.svSelesai = cache.servis.filter(function (s) { return String(s.tgl_selesai || '').slice(0, 7) === bln; }).length;
        return r;
    }
    function persen(a, b) { if (!b) return a ? '<small class="rk-naik">baru</small>' : ''; var p = Math.round((a - b) / Math.abs(b) * 100); return '<small class="' + (p >= 0 ? 'rk-naik' : 'rk-turun') + '">' + (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '% vs bulan lalu</small>'; }
    function batang(data, warna) {
        var maks = Math.max.apply(null, data.map(function (d) { return d[1]; }).concat([1]));
        return '<div class="rk-bar">' + data.map(function (d) { return '<div class="rk-bar__r"><span>' + E(d[0]) + '</span><i style="--w:' + (d[1] / maks * 100).toFixed(1) + '%;--c:' + (d[2] || warna) + '"></i><b>' + E(d[3] != null ? d[3] : L.rupiah(d[1])) + '</b></div>'; }).join('') + '</div>';
    }
    function grafikHarian(bln, harian) {
        var hari = new Date(+bln.slice(0, 4), +bln.slice(5, 7), 0).getDate(), maks = 1, x, w = 100 / hari;
        for (x = 1; x <= hari; x++) { var h = harian[bln + '-' + ('0' + x).slice(-2)]; if (h) maks = Math.max(maks, h.barang + h.servis); }
        var svg = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" class="rk-svg" role="img" aria-label="Uang masuk per hari">';
        for (x = 1; x <= hari; x++) {
            var hh = harian[bln + '-' + ('0' + x).slice(-2)] || { barang: 0, servis: 0 }, tb = hh.barang / maks * 38, ts = hh.servis / maks * 38, px = (x - 1) * w + w * .15;
            if (ts) svg += '<rect x="' + px.toFixed(2) + '" y="' + (40 - ts).toFixed(2) + '" width="' + (w * .7).toFixed(2) + '" height="' + ts.toFixed(2) + '" class="rk-s"><title>' + x + ': servis ' + L.rupiah(hh.servis) + '</title></rect>';
            if (tb) svg += '<rect x="' + px.toFixed(2) + '" y="' + (40 - ts - tb).toFixed(2) + '" width="' + (w * .7).toFixed(2) + '" height="' + tb.toFixed(2) + '" class="rk-b"><title>' + x + ': barang ' + L.rupiah(hh.barang) + '</title></rect>';
        }
        return svg + '</svg><div class="rk-sumbu"><span>1</span><span>' + Math.ceil(hari / 2) + '</span><span>' + hari + '</span></div><div class="rk-leg"><span><i class="rk-b"></i>Barang</span><span><i class="rk-s"></i>Servis</span><span>Tertinggi ' + L.rupiah(maks) + '/hari</span></div>';
    }
    function rekap() {
        if (!bulanRk) bulanRk = L.hariIni().slice(0, 7);
        var log = arusKas(), r = hitungBulan(bulanRk, log), p = hitungBulan(bulanLalu(bulanRk), log);
        var dp = cache.jual.filter(function (j) { return j.status === 'dp'; }), dpUang = dp.reduce(function (t, j) { return t + L.hitungJual(j).dibayar; }, 0);
        var jenis = {}; r.svMasuk.forEach(function (s) { var k = s.gitar_jenis || 'Lainnya'; jenis[k] = (jenis[k] || 0) + 1; });
        var bersih = r.masuk - r.keluar, depSewa = cache.sewa.reduce(function (t, w) { return t + (w.status === 'aktif' || w.status === 'selesai' ? L.hitungSewa(w).ditahan : 0); }, 0);
        app.innerHTML = '<section class="rk"><div class="ly-head"><h1>Rekap bulanan</h1><span class="ly-peran">Khusus owner</span><input type="month" class="ly-in rk-bln" id="rk-bln" value="' + bulanRk + '"></div>' +
            '<div class="rk-kartu">' +
            '<div class="ly-card"><small>Uang masuk</small><b>' + L.rupiah(r.masuk) + '</b>' + persen(r.masuk, p.masuk) + '<small>' + r.log.filter(function (x) { return x.jumlah > 0; }).length + ' pembayaran</small></div>' +
            '<div class="ly-card"><small>Penjualan barang</small><b class="rk-c1">' + L.rupiah(r.barang) + '</b>' + persen(r.barang, p.barang) + '<small>' + r.terjual + ' unit terjual</small></div>' +
            '<div class="ly-card"><small>Pendapatan servis</small><b class="rk-c2">' + L.rupiah(r.servis) + '</b>' + persen(r.servis, p.servis) + '<small>' + r.svMasuk.length + ' masuk · ' + r.svSelesai + ' selesai</small></div>' +
            (r.sewa || r.deposit ? '<div class="ly-card"><small>Pendapatan sewa gitar</small><b class="rk-c2">' + L.rupiah(r.sewa) + '</b>' + persen(r.sewa, p.sewa) + '<small>deposit bersih ' + L.rupiah(r.deposit) + '</small></div>' : '') +
            '<div class="ly-card"><small>Untung kotor barang</small><b class="rk-c3">' + L.rupiah(r.untung) + '</b>' + persen(r.untung, p.untung) + (r.tanpaModal ? '<small class="ly-warn">' + r.tanpaModal + ' barang tanpa modal</small>' : '<small>harga deal − modal</small>') + '</div>' +
            '</div>' +
            '<div class="rk-dua"><div class="ly-card"><h2>Uang masuk per hari</h2>' + grafikHarian(bulanRk, r.harian) + '</div>' +
            '<div class="ly-card"><h2>Ringkasan kas</h2><div class="ly-sum" style="margin:0;padding:0;border:0">' +
            '<div><span>Uang masuk</span><span>' + L.rupiah(r.masuk) + '</span></div>' +
            (r.keluar ? '<div><span>Uang keluar (pengeluaran, beli gitar tebus, uang kembali batal)</span><span class="ly-telat">−' + L.rupiah(r.keluar) + '</span></div>' : '') +
            (r.operasional ? '<div><span>&nbsp; termasuk pengeluaran operasional</span><span>−' + L.rupiah(-r.operasional) + '</span></div>' : '') +
            '<div class="ly-total"><span>Bersih</span><span>' + L.rupiah(bersih) + '</span></div>' +
            Object.keys(r.metode).map(function (m) { return '<div><span>&nbsp; ' + ({ tunai: 'Tunai (cocokkan dengan kas)', transfer: 'Transfer (cocokkan dengan mutasi rekening)', qris: 'QRIS' })[m] + '</span><span>' + L.rupiah(r.metode[m]) + '</span></div>'; }).join('') +
            '<div><span>DP barang masih ditahan (saat ini)</span><span>' + L.rupiah(dpUang) + ' · ' + dp.length + ' pesanan</span></div>' +
            (depSewa ? '<div><span>Deposit sewa ditahan (saat ini, bukan pendapatan)</span><span>' + L.rupiah(depSewa) + '</span></div>' : '') +
            '<div class="ly-total"><span>Perkiraan laba (untung barang + servis − pengeluaran)</span><span>' + L.rupiah(r.untung + r.servis + r.operasional) + '</span></div></div></div></div>' +
            '<div class="rk-dua"><div class="ly-card"><h2>Komposisi pendapatan</h2>' + batang([['Barang', Math.max(0, r.barang), 'var(--accent)'], ['Servis', Math.max(0, r.servis), '#2659A8']].concat(r.sewa > 0 ? [['Sewa gitar', r.sewa, '#B5651D']] : []).concat(r.tebus > 0 ? [['Tebus kembali', r.tebus, '#0E6B40']] : [])) + '</div>' +
            '<div class="ly-card"><h2>Servis masuk per jenis gitar</h2>' + (Object.keys(jenis).length ? batang(Object.keys(jenis).sort(function (a, b) { return jenis[b] - jenis[a]; }).map(function (k) { return [k, jenis[k], '#6B3FA0', jenis[k] + ' gitar']; })) : '<p class="ly-muted">Belum ada servis bulan ini.</p>') + '</div></div>' +
            '<div class="rk-dua"><div class="ly-card"><h2>Barang terlaris</h2>' + (r.laris.length ? '<ol class="rk-laris">' + r.laris.map(function (l) { return '<li><span><b>' + E(l.nama) + '</b><small>' + E(l.kode) + '</small></span><span><b>' + l.qty + ' unit</b><small>' + L.rupiah(l.omzet) + '</small></span></li>'; }).join('') + '</ol>' : '<p class="ly-muted">Belum ada penjualan bulan ini.</p>') + '</div>' +
            '<div class="ly-card"><div class="ly-head" style="margin-bottom:8px"><h2 style="flex:1;margin:0">Log transaksi</h2><button type="button" class="ly-btn ly-btn--sm" id="rk-csv">Unduh CSV (Excel)</button></div>' +
            '<div class="rk-log">' + (r.log.length ? r.log.slice().sort(function (a, b) { return a.tgl < b.tgl ? 1 : -1; }).map(function (x) {
                return '<div><span><b>' + E(x.ket) + '</b><small>' + L.tgl(x.tgl) + ' · ' + E(x.kode) + ' · ' + E(x.nama || '') + ' · ' + E(x.metode || '') + '</small></span><b class="' + (x.jumlah < 0 ? 'ly-telat' : '') + '">' + (x.jumlah < 0 ? '−' : '') + L.rupiah(Math.abs(x.jumlah)) + '</b></div>';
            }).join('') : '<p class="ly-muted">Belum ada transaksi bulan ini.</p>') + '</div></div></div></section>';
        $('#rk-bln').addEventListener('change', function () { if (this.value) { bulanRk = this.value; rekap(); } });
        $('#rk-csv').addEventListener('click', function () {
            /* teks yang diawali = + - @ dianggap rumus oleh Excel/Sheets: diberi tanda ' di depan supaya tampil sebagai teks */
            var aman = function (v) { v = String(v); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; };
            var baris = [['Tanggal', 'Keterangan', 'Kode', 'Nama', 'Metode', 'Jumlah']].concat(r.log.slice().sort(function (a, b) { return a.tgl < b.tgl ? -1 : 1; }).map(function (x) { return [x.tgl, aman(x.ket), aman(x.kode), aman(x.nama || ''), aman(x.metode || ''), x.jumlah]; }));
            var csv = '﻿' + baris.map(function (b) { return b.map(function (v) { v = String(v); return /[;"\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
            simpanBerkas('rekap-ayri-' + bulanRk + '.csv', csv, 'text/csv');
        });
    }

    /* ================= daftar servis ================= */
    function daftarServis() {
        app.innerHTML = '<section><div class="ly-head"><h1>Antrian servis</h1><div class="ly-seg" id="tampilan" role="group" aria-label="Tampilan"><button type="button" data-v="papan">Papan</button><button type="button" data-v="daftar">Daftar</button></div><a class="ly-btn ly-btn--pri" href="#servis/baru">+ Gitar masuk</a></div>' +
            '<div class="ly-cari"><input class="ly-in" id="cari" type="search" placeholder="Cari kode, nama, no. HP, merk…" autocomplete="off"></div>' +
            '<div id="ingat"></div><div class="ly-filter" id="filter"></div><div class="ly-list" id="list"></div>' +
            '<div class="ly-btns" style="margin-top:18px"><button type="button" class="ly-btn ly-btn--sm" id="b-muat">Muat ulang data</button><button type="button" class="ly-btn ly-btn--sm" id="b-cadang">Unduh cadangan</button><button type="button" class="ly-btn ly-btn--sm" id="b-buka-cad">Buka cadangan</button><button type="button" class="ly-btn ly-btn--sm" id="b-pin">Ganti PIN</button><button type="button" class="ly-btn ly-btn--sm ly-btn--del" id="b-lupa">Hapus token dari perangkat ini</button></div></section>';
        $('#cari').value = cari;
        $('#cari').addEventListener('input', function () { cari = this.value; gambarDaftar(); });
        $('#filter').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; gambarDaftar(); } });
        $('#ingat').addEventListener('click', function (e) { if (e.target.closest('[data-lihat]')) { filter = 'selesai'; cari = ''; $('#cari').value = ''; tampilSv = 'daftar'; gambarDaftar(); } });
        $('#list').addEventListener('click', function (e) {
            var b = e.target.closest('[data-ingat]'); if (b) { e.preventDefault(); catatPengingat('servis', b.dataset.ingat, b); return; }
            var g = e.target.closest('[data-geser]'); if (g) { e.preventDefault(); geserServis(g.closest('[data-id]').dataset.id, +g.dataset.geser, g.closest('.kb-k')); return; }
            var k = e.target.closest('[data-kasir]'); if (k) { e.preventDefault(); keKasir(k.dataset.kasir); }
        });
        $('#tampilan').addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; tampilSv = b.dataset.v; try { localStorage.setItem('ayri-admin-tampilan', tampilSv); } catch (x) {} gambarDaftar(); });
        $('#b-muat').addEventListener('click', function () { var b = this; sibuk(b, true, 'Memuat…'); A.muat().then(function (d) { cache = d; sibuk(b, false); gambarDaftar(); toast('Data terbaru dimuat.'); }).catch(function (e) { sibuk(b, false); gagal(e); }); });
        $('#b-cadang').addEventListener('click', function () { unduhCadangan(); });
        $('#b-buka-cad').addEventListener('click', bukaCadanganUi);
        $('#b-pin').addEventListener('click', gantiPinUi);
        $('#b-lupa').addEventListener('click', function () { if (confirm('Hapus token dari perangkat ini? Data tetap aman di GitHub; Anda perlu memasang token lagi untuk memakai admin di sini.' + peringatanAntri())) A.lupakan().then(function () { location.hash = ''; location.reload(); }); });
        gambarDaftar();
    }
    function gambarDaftar() {
        if (!$('#list')) return;
        var rows = cache.servis, n = {}, hari = L.hariIni(), c = cari.trim().toLowerCase();
        rows.forEach(function (s) { n[s.status] = (n[s.status] || 0) + 1; });
        var f = [['aktif', 'Aktif', rows.filter(function (s) { return AKTIF.indexOf(s.status) > -1; }).length]]
            .concat(L.URUT_STATUS.concat('batal').map(function (k) { return [k, L.STATUS[k].label.replace(/ – .*/, ''), n[k] || 0]; }))
            .concat([['semua', 'Semua', rows.length]]);
        $('#filter').innerHTML = f.map(function (x) { return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (filter === x[0]) + '">' + E(x[1]) + '<b>' + x[2] + '</b></button>'; }).join('');
        var hasil = rows.filter(function (s) {
            if (filter === 'aktif' ? AKTIF.indexOf(s.status) < 0 : filter !== 'semua' && s.status !== filter) return false;
            return !c || [s.kode, s.nama, s.hp, s.gitar_jenis, s.gitar_merk, s.keluhan].join(' ').toLowerCase().indexOf(c) > -1;
        });
        /* gitar yang belum diambil: paling lama di atas */
        if (filter === 'selesai') hasil.sort(function (a, b) { return (a.tgl_selesai || '') < (b.tgl_selesai || '') ? -1 : 1; });
        var perlu = rows.filter(function (s) { return L.perluIngat(s, hari); }).length;
        $('#ingat').innerHTML = perlu ? '<div class="ly-ingat"><span>🔔 <b>' + perlu + ' gitar</b> sudah selesai tapi belum diambil dan perlu diingatkan.</span><button type="button" class="ly-btn ly-btn--sm" data-lihat>Lihat</button></div>' : '';
        $$('#tampilan button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === tampilSv); });
        $('#filter').hidden = tampilSv === 'papan';
        if (tampilSv === 'papan') { $('#list').innerHTML = gambarPapan(rows, c, hari); return; }
        $('#list').innerHTML = hasil.length ? hasil.map(function (s) {
            var h = L.hitung(s, s.items, s.bayar), beres = L.beres(s), telat = s.estimasi && s.estimasi < hari && ['menunggu_dp', 'antri', 'dikerjakan'].indexOf(s.status) > -1;
            var bayar = !h.total ? 'Biaya belum diisi' : h.lunas ? 'Lunas' : h.kurangAwal && !beres ? '<span class="ly-warn">Bayar awal kurang ' + L.rupiah(h.kurangAwal) + '</span>' : 'Sisa ' + L.rupiah(h.sisa);
            return '<div class="ly-item"><a class="ly-item__a" href="#servis/' + E(s.id) + '"><span class="ly-item__k">' + E(s.kode) + '</span></a><span class="st-chip st-' + s.status + '">' + E(L.STATUS[s.status].label) + '</span>' +
                '<span class="ly-item__t">' + E(L.namaGitar(s, 'Gitar')) + ' · ' + E(s.nama) + '</span>' +
                '<span class="ly-item__m"><span>Masuk ' + L.tgl(s.tgl_masuk) + '</span>' + (s.estimasi && !beres ? '<span' + (telat ? ' class="ly-telat"' : '') + '>Estimasi ' + L.tgl(s.estimasi) + (telat ? ' (lewat)' : '') + '</span>' : '') + '<span>' + bayar + '</span></span>' +
                (s.status === 'selesai' ? infoTitip(s, hari) : '') + '</div>';
        }).join('') : '<p class="ly-kosong">' + (rows.length ? 'Tidak ada yang cocok.' : 'Belum ada data servis. Tekan “+ Gitar masuk”.') + '</p>';
    }
    /* baris penitipan + tombol pengingat untuk gitar yang sudah selesai */
    function infoTitip(s, hari) {
        var t = L.titip(s, hari); if (!t) return '';
        var teks = t.hariBiaya ? '<span class="ly-telat">Biaya titip ' + t.hariBiaya + ' hari = ' + L.rupiah(t.biaya) + '</span>' : '<span>Gratis titip s/d ' + L.tgl(t.batasGratis) + ' (' + t.sisaGratis + ' hari lagi)</span>';
        if (t.garansiHangus) teks += '<span class="ly-telat">Garansi hangus</span>';
        if (t.lepas) teks += '<span class="ly-telat">Lewat ' + C.penyimpananLamaHari + ' hari</span>';
        var akhir = (s.pengingat || []).slice(-1)[0], perlu = L.perluIngat(s, hari);
        return '<span class="ly-item__m"><span>Selesai ' + t.lama + ' hari lalu</span>' + teks + (akhir ? '<span>Diingatkan ' + L.tgl(akhir) + '</span>' : '') + '</span>' +
            '<span class="ly-item__b"><button type="button" class="ly-btn ly-btn--sm ' + (perlu ? 'ly-btn--wa' : '') + '" data-ingat="' + E(s.id) + '">' + (perlu ? 'Ingatkan via WA' : 'Kirim pengingat') + '</button></span>';
    }

    /* ================= form servis (semua perubahan baru dikirim ke GitHub saat Simpan) ================= */
    function servisKosong() {
        return { nama: '', hp: '', tgl_masuk: L.hariIni(), gitar_jenis: C.jenisGitar[0], gitar_merk: '', keluhan: '', status: 'menunggu_dp', estimasi: '', diskon: 0, saran: '', catatan_publik: '', catatan_admin: '', izin_publikasi: false, items: [], bayar: [], foto: [] };
    }
    function bukaServis(id) {
        ambilCatatan('servis', id, servisKosong, function (s) {
            s.items = s.items || []; s.bayar = s.bayar || []; s.foto = s.foto || [];
            ed = { baru: !id, s: s, antri: [] }; gambarServis();
        });
    }
    function gambarServis() {
        var s = ed.s, katalog = {}, kat = '';
        C.katalogJasa.forEach(function (k, i) { (katalog[k.grup] = katalog[k.grup] || []).push('<option value="' + i + '">' + E(k.nama) + (k.harga ? ' – ' + L.rupiah(k.harga) : '') + '</option>'); });
        for (var g in katalog) kat += '<optgroup label="' + E(g) + '">' + katalog[g].join('') + '</optgroup>';
        var jenis = C.jenisGitar.slice(); if (s.gitar_jenis && jenis.indexOf(s.gitar_jenis) < 0) jenis.push(s.gitar_jenis);
        app.innerHTML = '<section id="sv" class="ly-f">' +
            '<div class="ly-head"><a class="ly-back" href="#servis">‹ Daftar servis</a></div>' +
            '<div class="ly-head"><h1>' + (ed.baru ? 'Gitar masuk' : E(L.namaGitar(s, 'Gitar'))) + '</h1>' + (ed.baru ? '' : '<span class="st-chip st-' + s.status + '" id="sv-chip">' + E(L.STATUS[s.status].label) + '</span>') + '</div>' +
            (ed.baru ? '<p class="ly-muted">Kode servis dibuat otomatis saat disimpan.</p>' : kodeBaris(s)) +

            '<fieldset class="ly-card ly-f"><legend>Pelanggan</legend>' + tombolKontak('[data-f="nama"]', '[data-f="hp"]') +
            '<label>Nama<input data-f="nama" autocomplete="off" required></label>' +
            '<label>No. HP / WhatsApp<input data-f="hp" type="tel" inputmode="tel" autocomplete="off" placeholder="08xxxxxxxxxx" required>' + (ed.baru ? '' : '<span class="ly-hint">Mengubah nomor HP mengubah 4 digit untuk cek status; kirim ulang tautan ke pelanggan.</span>') + '</label></fieldset>' +

            '<fieldset class="ly-card ly-f"><legend>Gitar</legend>' +
            '<div class="ly-row2"><label>Jenis<select data-f="gitar_jenis">' + opsi(jenis, s.gitar_jenis) + '</select></label>' +
            '<label>Merk / model<input data-f="gitar_merk" placeholder="mis. Yamaha F310"></label></div>' +
            '<label>Keluhan / kerusakan<textarea data-f="keluhan" rows="3" placeholder="mis. senar fret buzz di fret 3–5, bridge mulai terangkat"></textarea></label>' +
            '<div class="ly-row2"><label>Tanggal masuk<input type="date" data-f="tgl_masuk"></label><label>Estimasi selesai<input type="date" data-f="estimasi"></label></div>' +
            '<label class="ly-cek"><input type="checkbox" data-f="izin_publikasi"> Pelanggan setuju foto gitarnya dipakai untuk artikel (tanpa nama dan nomor HP)</label></fieldset>' +

            '<fieldset class="ly-card"><legend>Jasa &amp; part</legend><div class="ly-items" id="sv-items"></div>' +
            '<div class="ly-add"><select class="ly-in" id="sv-katalog"><option value="">+ Tambah jasa dari daftar…</option>' + kat + '</select>' +
            '<button type="button" class="ly-btn ly-btn--sm" data-act="jasa">+ Jasa lain</button><button type="button" class="ly-btn ly-btn--sm" data-act="part">+ Part / suku cadang</button></div>' +
            '<div class="ly-f" style="margin-top:12px"><label style="max-width:220px">Diskon (Rp)<input type="number" inputmode="numeric" min="0" step="1000" data-f="diskon"></label></div>' +
            '<div class="ly-sum" id="sv-sum"></div></fieldset>' +

            '<fieldset class="ly-card"><legend>Pembayaran</legend><div class="ly-bayar" id="sv-bayar"></div>' +
            '<div class="ly-f" style="margin-top:10px"><div class="ly-row2"><label>Jumlah (Rp)<input type="number" inputmode="numeric" min="0" step="1000" id="by-jml"></label>' +
            '<label>Jenis<select id="by-jenis">' + opsi([['dp', 'DP / bayar awal'], ['tambahan', 'Tambahan'], ['pelunasan', 'Pelunasan']], 'dp') + '</select></label></div>' +
            '<div class="ly-row2"><label>Metode<select id="by-metode">' + opsi([['tunai', 'Tunai'], ['transfer', 'Transfer'], ['qris', 'QRIS']], 'tunai') + '</select></label><label>Tanggal<input type="date" id="by-tgl"></label></div>' +
            '<button type="button" class="ly-btn" id="by-tambah">Catat pembayaran</button></div></fieldset>' +

            '<fieldset class="ly-card"><legend>Status</legend><div class="ly-status" id="sv-status"></div><div id="sv-titip"></div><p class="ly-hint" style="margin-top:8px">Status otomatis pindah ke <b>Antri</b> saat bayar awal terpenuhi.</p></fieldset>' +

            '<fieldset class="ly-card"><legend>Foto</legend><div id="sv-foto"></div><p class="ly-hint" style="margin-top:10px">Foto dikecilkan otomatis (WebP ±150 KB) dan dikunci sebelum diunggah. Label <b>Tampil</b> = terlihat pelanggan; ketuk untuk menyembunyikan. Foto sesudah servis baru terlihat pelanggan saat status Selesai, berdampingan dengan foto sebelum servis sebagai pembanding.</p></fieldset>' +

            '<fieldset class="ly-card ly-f"><legend>Untuk pelanggan</legend>' +
            '<label>Pesan / update (tampil di halaman cek status)<textarea data-f="catatan_publik" rows="3" placeholder="mis. Ditemukan truss rod macet, perlu diganti. Estimasi mundur 2 hari."></textarea></label>' +
            '<label>Saran setelah servis (tampil saat status Selesai)<textarea data-f="saran" rows="3" placeholder="mis. Senar sudah aus, sarankan ganti Elixir 11. Tuner kendur, bisa upgrade ke Grover."></textarea></label></fieldset>' +

            '<fieldset class="ly-card ly-f"><legend>Catatan internal</legend><label>Hanya terlihat admin<textarea data-f="catatan_admin" rows="2"></textarea></label></fieldset>' +

            (ed.baru ? '<fieldset class="ly-card"><legend>Kirim ke calon pelanggan</legend>' + barisWa([['estimasi', 'Kirim estimasi biaya', 'Jasa & part yang dipilih di bawah + total + DP'], ['ketentuan', 'Kirim ketentuan servis', 'Sekali saja: DP, garansi, penitipan']], 'wc') + '<p class="ly-hint ly-hint--c">Tanpa nomor: pilih kontaknya di WhatsApp.</p></fieldset>' : '<fieldset class="ly-card"><legend>Kirim &amp; lainnya</legend>' +
                barisWa([['tandaTerima', 'Tanda terima', 'Barang sudah kami terima'], ['update', 'Update status', 'Kabari perkembangan'], ['selesai', 'Kabari selesai', 'Barang siap diambil'], ['nota', 'Kirim nota', 'Tautan nota & rincian biaya']]
                    .concat(s.status === 'selesai' ? [['pengingat', 'Ingatkan ambil', 'Barang belum diambil']] : []), 'wa') +
                '<h3 class="ly-sub">Aksi lainnya</h3>' +
                kisiAksi([
                    aksi({ href: 'cek-servis.html?k=' + encodeURIComponent(s.kode) + '&amp;h=' + encodeURIComponent(L.hp4(s.hp)), luar: true, ikon: 'lihat', teks: 'Lihat halaman pelanggan' }),
                    aksi({ id: 'sv-cetak', ikon: 'cetak', teks: 'Cetak tanda terima + label' }),
                    aksi({ href: 'nota.html?k=' + encodeURIComponent(s.kode) + '&amp;h=' + encodeURIComponent(L.hp4(s.hp)), luar: true, ikon: 'nota', teks: 'Buka / cetak nota' })
                ].concat(owner() ? [aksi({ id: 'sv-artikel', ikon: 'artikel', teks: 'Jadikan artikel' }), aksi({ id: 'sv-hapus', ikon: 'hapus', teks: 'Hapus servis', kelas: 'ly-akt--del' })] : [])) +
                '<p class="ly-hint ly-hint--c">Halaman pelanggan ikut berubah ±1 menit setelah disimpan.</p></fieldset>') +

            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="sv-simpan">' + (ed.baru ? 'Simpan &amp; buat kode' : 'Simpan perubahan') + '</button></div></section>';

        $$('[data-f]', app).forEach(function (el) {
            var v = s[el.dataset.f];
            if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v;
        });
        $('#by-tgl').value = L.hariIni();
        gambarItems(); gambarRingkas(); gambarBayar(); gambarStatus(); gambarFoto();
        setDirty(false);

        var sv = $('#sv');
        sv.addEventListener('input', ubahField); sv.addEventListener('change', ubahField);
        sv.addEventListener('click', klikServis);
        $('#sv-katalog').addEventListener('change', function () {
            var k = C.katalogJasa[+this.value]; this.value = ''; if (!k) return;
            ed.s.items.push({ jenis: 'jasa', nama: k.nama, harga: k.harga || 0, qty: 1, garansi: k.garansi || '', garansi_syarat: k.jatuh ? C.syaratJatuh : '' });
            gambarItems(); gambarRingkas(); setDirty(true);
            if (!k.harga) { var ins = $$('#sv-items [data-k="harga"]'); ins[ins.length - 1].focus(); }
        });
        $('#by-tambah').addEventListener('click', tambahBayar);
        $('#sv-simpan').addEventListener('click', simpanServis);
        pilihFoto($('#sv-foto'), function (tahap, files) { antriFoto(ed.antri, files, { tahap: tahap, tampil: true }, gambarFoto); });
        if (!ed.baru && owner()) { $('#sv-artikel').addEventListener('click', jadikanArtikel); $('#sv-hapus').addEventListener('click', hapusServis); }
        if (!ed.baru) $('#sv-cetak').addEventListener('click', function () {
            if (dirty) return toast('Simpan perubahan dulu, supaya yang tercetak sudah terbaru.', true);
            cetakTandaTerima(ed.s);
        });
    }
    function cetakTandaTerima(s) { cetakBaris(L.strukServis(s, { label: true })); }
    function ubahField(e) {
        var t = e.target;
        if (t.dataset.f) {
            ed.s[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.dataset.f === 'diskon' ? Math.max(0, Math.round(+t.value || 0)) : t.value;
            setDirty(true); if (t.dataset.f === 'diskon') gambarRingkas();
        } else if (t.dataset.k) {
            var it = ed.s.items[+t.closest('[data-i]').dataset.i], k = t.dataset.k;
            if (k === 'jatuh') it.garansi_syarat = t.checked ? C.syaratJatuh : '';
            else it[k] = k === 'harga' || k === 'qty' ? Math.max(k === 'qty' ? 1 : 0, Math.round(+t.value || 0)) : t.value;
            setDirty(true); if (k === 'harga' || k === 'qty') gambarRingkas();
        }
    }
    function gambarItems() {
        $('#sv-items').innerHTML = ed.s.items.length ? ed.s.items.map(function (it, i) {
            var hapus = '<button type="button" class="ly-x" data-del="' + i + '" aria-label="Hapus">×</button>';
            if (it.jenis === 'part') return '<div class="ly-it" data-i="' + i + '"><div class="ly-it__tag">Part' + hapus + '</div>' +
                '<input class="ly-in ly-it__n" data-k="nama" placeholder="Nama part, mis. Senar Elixir 11" value="' + E(it.nama) + '" aria-label="Nama part">' +
                '<label class="ly-lbl">Jumlah<input class="ly-in" data-k="qty" type="number" inputmode="numeric" min="1" value="' + (it.qty || 1) + '"></label>' +
                '<label class="ly-lbl">Harga satuan (Rp)<input class="ly-in" data-k="harga" type="number" inputmode="numeric" min="0" step="1000" value="' + (it.harga || 0) + '"></label></div>';
            return '<div class="ly-it" data-i="' + i + '"><div class="ly-it__tag">Jasa' + hapus + '</div>' +
                '<input class="ly-in ly-it__n" data-k="nama" placeholder="Nama jasa" value="' + E(it.nama) + '" aria-label="Nama jasa">' +
                '<label class="ly-lbl">Harga (Rp)<input class="ly-in" data-k="harga" type="number" inputmode="numeric" min="0" step="1000" value="' + (it.harga || 0) + '"></label>' +
                '<label class="ly-lbl">Garansi<select class="ly-in" data-k="garansi">' + opsi(L.GARANSI_PILIHAN, it.garansi || '') + '</select></label>' +
                '<label class="ly-cek ly-it__n" style="font-size:.75rem"><input type="checkbox" data-k="jatuh"' + (it.garansi_syarat ? ' checked' : '') + '> Syarat garansi: gitar tidak jatuh/terbentur lagi</label></div>';
        }).join('') : '<p class="ly-muted">Belum ada jasa. Pilih dari daftar di bawah.</p>';
    }
    function gambarRingkas() {
        var h = L.hitung(ed.s, ed.s.items, ed.s.bayar);
        $('#sv-sum').innerHTML = '<div><span>Jasa</span><span>' + L.rupiah(h.jasa) + '</span></div>' + (h.part ? '<div><span>Part</span><span>' + L.rupiah(h.part) + '</span></div>' : '') +
            (h.diskon ? '<div><span>Diskon</span><span>' + L.rupiah(-h.diskon) + '</span></div>' : '') +
            '<div class="ly-total"><span>Total</span><span>' + L.rupiah(h.total) + '</span></div>' +
            /* aturan DP hanya relevan sebelum gitar selesai dikerjakan */
            (L.beres(ed.s) ? '' : '<div><span>Bayar awal sebelum dikerjakan<br><small class="ly-muted">DP ' + L.dpPersen() + '% jasa + part lunas</small></span><span>' + L.rupiah(h.wajibAwal) + '</span></div>') +
            '<div><span>Sudah dibayar</span><span>' + L.rupiah(h.dibayar) + '</span></div>' +
            (h.total && !L.beres(ed.s) ? (h.kurangAwal ? '<div class="ly-warn"><span>Bayar awal masih kurang</span><span>' + L.rupiah(h.kurangAwal) + '</span></div>' : '<div class="ly-ok"><span>Bayar awal terpenuhi ✓</span><span></span></div>') : '') +
            '<div class="ly-total"><span>Sisa' + (h.lebih ? ' (kelebihan bayar ' + L.rupiah(h.lebih) + ')' : '') + '</span><span>' + L.rupiah(h.sisa) + '</span></div>';
        var j = $('#by-jml'); if (j && !j.dataset.manual) j.value = h.kurangAwal || h.sisa || '';
        var bj = $('#by-jenis'); if (bj && !bj.dataset.manual) bj.value = h.kurangAwal ? 'dp' : h.sisa ? 'pelunasan' : 'tambahan';
    }
    function gambarBayar() {
        $('#sv-bayar').innerHTML = ed.s.bayar.length ? ed.s.bayar.map(function (b, i) {
            return '<div><span>' + L.tgl(b.tgl) + ' · ' + ({ dp: 'DP', pelunasan: 'Pelunasan', tambahan: 'Tambahan' })[b.jenis] + ' · ' + ({ tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS' })[b.metode] + (b.baru ? ' <small class="ly-muted">(belum disimpan)</small>' : '') + '</span><b>' + L.rupiah(b.jumlah) + '</b>' +
                '<button type="button" class="ly-x" data-delbayar="' + i + '" aria-label="Hapus pembayaran">×</button></div>';
        }).join('') : '<p class="ly-muted">Belum ada pembayaran.</p>';
    }
    function gambarStatus() {
        $('#sv-status').innerHTML = L.URUT_STATUS.concat('batal').map(function (k) { return '<button type="button" data-status="' + k + '" aria-pressed="' + (ed.s.status === k) + '">' + E(L.STATUS[k].label) + '</button>'; }).join('');
        /* penitipan: hanya untuk data yang sudah tersimpan sebagai Selesai/Diambil */
        var el = $('#sv-titip'), t = !ed.baru && ed.s.tgl_selesai && L.titip(ed.s); if (!el) return;
        if (!t) { el.innerHTML = ''; return; }
        var sudah = ed.s.items.some(function (i) { return /^Biaya penitipan/i.test(i.nama); });
        el.innerHTML = '<div class="ly-ingat ly-ingat--info"><span>Selesai ' + L.tgl(ed.s.tgl_selesai) + ' (' + t.lama + ' hari' + (ed.s.status === 'diambil' ? ' sampai diambil' : ' lalu') + '). ' +
            (t.hariBiaya ? '<b>Biaya penitipan ' + t.hariBiaya + ' hari × ' + L.rupiah(L.biayaTitip()) + ' = ' + L.rupiah(t.biaya) + '</b>.' : 'Gratis titip s/d ' + L.tgl(t.batasGratis) + '.') +
            (t.garansiHangus ? ' <b class="ly-telat">Garansi hangus</b> (lewat ' + C.garansiHangusHari + ' hari).' : '') +
            ((ed.s.pengingat || []).length ? ' Diingatkan: ' + ed.s.pengingat.map(L.tgl).join(', ') + '.' : '') + '</span>' +
            (t.hariBiaya && !sudah ? '<button type="button" class="ly-btn ly-btn--sm" data-titip>+ Tambah biaya penitipan</button>' : '') + '</div>';
    }
    function gambarFoto() {
        var el = $('#sv-foto'); if (!el) return;
        el.innerHTML = ['sebelum', 'kerusakan', 'sesudah'].map(function (t) { return grupFoto(L.TAHAP[t], t, ed.s.foto, ed.antri, true); }).join('');
        L.isiFoto(el, ed.s, A.fotoAdmin);
    }
    function klikServis(e) {
        var t = e.target.closest('button, [data-act]'); if (!t) return;
        var d = t.dataset;
        if (d.act) { ed.s.items.push({ jenis: d.act === 'part' ? 'part' : 'jasa', nama: '', harga: 0, qty: 1, garansi: '', garansi_syarat: '' }); gambarItems(); gambarRingkas(); setDirty(true); var n = $$('#sv-items [data-k="nama"]'); n[n.length - 1].focus(); }
        else if (d.del != null) { ed.s.items.splice(+d.del, 1); gambarItems(); gambarRingkas(); setDirty(true); }
        else if (d.status) ubahStatus(d.status);
        else if (d.delbayar != null) hapusBayar(+d.delbayar);
        else if (d.tampil || d.tampilq) {
            /* cukup ganti tombolnya, foto tidak perlu digambar ulang */
            var f = d.tampil ? ed.s.foto.filter(function (x) { return x.id === d.tampil; })[0] : ed.antri.filter(function (x) { return x.qid === d.tampilq; })[0];
            f.tampil = !f.tampil; t.setAttribute('aria-pressed', f.tampil); t.textContent = f.tampil ? 'Tampil' : 'Sembunyi'; if (d.tampil) setDirty(true);
        }
        else if (d.hapusfoto) { if (confirm('Hapus foto ini? (terhapus permanen saat Simpan)')) { ed.s.foto = ed.s.foto.filter(function (f) { return f.id !== d.hapusfoto; }); gambarFoto(); setDirty(true); } }
        else if (d.hapusq) { ed.antri = buangQ(ed.antri, d.hapusq); gambarFoto(); setDirty(ed.antri.length > 0 || dirty); }
        else if (d.wa) kirimWa(d.wa);
        else if (d.wc) kirimCalonServis(d.wc);
        else if (t.hasAttribute('data-titip')) {
            var tt = L.titip(ed.s);
            ed.s.items.push({ jenis: 'jasa', nama: 'Biaya penitipan (' + tt.hariBiaya + ' hari)', harga: tt.biaya, qty: 1, garansi: '', garansi_syarat: '' });
            gambarItems(); gambarRingkas(); gambarStatus(); setDirty(true); toast('Biaya penitipan ditambahkan ke rincian. Tekan Simpan.');
        }
    }
    function ubahStatus(st) {
        var h = L.hitung(ed.s, ed.s.items, ed.s.bayar);
        if (st === ed.s.status) return;
        if ((st === 'dikerjakan' || st === 'antri') && h.kurangAwal > 0 && !confirm('Pembayaran awal masih kurang ' + L.rupiah(h.kurangAwal) + '. Aturan toko: dikerjakan setelah DP dan part lunas.\n\nTetap ubah status?')) return;
        if (st === 'diambil' && h.sisa > 0 && !confirm('Masih ada sisa pembayaran ' + L.rupiah(h.sisa) + '. Tandai sudah diambil?')) return;
        if (st === 'batal' && !confirm('Tandai servis ini dibatalkan? Pelanggan tidak bisa lagi membuka status dan notanya.')) return;
        ed.s.status = st; gambarStatus(); gambarRingkas(); setDirty(true);
        if (st === 'selesai' && !ed.s.foto.concat(ed.antri).some(function (f) { return f.tahap === 'sesudah'; })) toast('Jangan lupa tambahkan foto sesudah servis dan saran untuk pelanggan.');
    }
    function tambahBayar() {
        var jml = Math.round(+$('#by-jml').value || 0); if (jml <= 0) return toast('Isi jumlah pembayaran.', true);
        ed.s.bayar.push({ id: idAcak(), tgl: $('#by-tgl').value || L.hariIni(), jumlah: jml, jenis: $('#by-jenis').value, metode: $('#by-metode').value, baru: true });
        delete $('#by-jml').dataset.manual; delete $('#by-jenis').dataset.manual;
        gambarBayar(); gambarRingkas(); setDirty(true);
        toast('Pembayaran dicatat. Tekan Simpan untuk menyimpan.');
    }
    function hapusBayar(i) {
        var by = ed.s.bayar[i]; if (!confirm('Hapus pembayaran ' + L.rupiah(by.jumlah) + ' tanggal ' + L.tgl(by.tgl) + '?')) return;
        ed.s.bayar.splice(i, 1); gambarBayar(); gambarRingkas(); setDirty(true);
    }
    document.addEventListener('input', function (e) { if (e.target.id === 'by-jml' || e.target.id === 'by-jenis') e.target.dataset.manual = '1'; });


    /* ---------- simpan ---------- */
    function validasi() {
        var s = ed.s;
        if (!String(s.nama).trim()) return 'Nama pelanggan belum diisi.';
        if (String(s.hp).replace(/\D/g, '').length < 8) return 'No. HP belum benar (minimal 8 angka).';
        if (ed.s.items.some(function (i) { return !String(i.nama).trim(); })) return 'Ada jasa/part yang namanya kosong.';
        if (ed.antri.some(function (q) { return !q.hasil; })) return 'Foto masih diproses, tunggu sebentar.';
        return '';
    }
    function simpanServis() {
        var err = validasi(); if (err) return toast(err, true);
        var baru = ed.baru, statusAwal = ed.s.status;
        var rec = Object.assign({}, ed.s, { nama: String(ed.s.nama).trim(), hp: String(ed.s.hp).trim(), bayar: ed.s.bayar.map(function (x) { var y = Object.assign({}, x); delete y.baru; return y; }) });
        var h = L.hitung(rec, rec.items, rec.bayar);
        if (rec.status === 'menunggu_dp' && h.total > 0 && h.kurangAwal === 0) rec.status = 'antri';
        var fotoBaru = ed.antri.map(function (q) { return { hasil: q.hasil, tahap: q.tahap, tampil: q.tampil }; });
        prosesSimpan('servis', $('#sv-simpan'), teksUnggah(fotoBaru), function () { return A.simpanServis(rec, fotoBaru); }, function (row) {
            lepasAntri(ed.antri); ed = { baru: false, s: salin(row), antri: [] };
            var pesan = baru ? 'Tersimpan. Kode servis: ' + row.kode + '. Tanda terima bisa dicetak atau dikirim lewat WA.' : 'Tersimpan. Halaman pelanggan diperbarui ±1 menit lagi.';
            if (statusAwal === 'menunggu_dp' && row.status === 'antri') pesan += ' Status otomatis menjadi Antri.';
            toast(pesan);
            if (baru) { pindah('#servis/' + row.id); setTimeout(function () { if (confirm('Kode servis ' + row.kode + '. Cetak tanda terima + label gitar sekarang?')) cetakTandaTerima(row); }, 300); }
            else gambarServis();
        }, function (r) { lepasAntri(ed.antri); ed = { baru: false, s: r, antri: [] }; gambarFoto(); });
    }

    /* ---------- kirim WA, artikel, hapus ---------- */
    /* pesan untuk calon pelanggan, dari isian formulir (belum disimpan, tanpa nomor) */
    function kirimCalonServis(jenis) {
        if (jenis === 'estimasi' && !(ed.s.items || []).length) return toast('Pilih jasa atau part di bagian biaya dulu.', true);
        bukaWa('', L.pesan.calon[jenis](ed.s));
    }
    function kirimWa(jenis) {
        if (dirty) return toast('Simpan perubahan dulu, supaya yang dilihat pelanggan sudah terbaru.', true);
        if (jenis === 'pengingat') {
            if (ed.s.status !== 'selesai') return toast('Pengingat ambil hanya untuk status Selesai.', true);
            return catatPengingat('servis', ed.s.id);
        }
        bukaWa(ed.s.hp, L.pesan[jenis](ed.s));
    }
    function jadikanArtikel() {
        if (dirty) return toast('Simpan perubahan dulu.', true);
        if (!ed.s.izin_publikasi && !confirm('Pelanggan belum dicentang setuju fotonya dipakai untuk artikel. Tetap buat draf?')) return;
        var s = ed.s, jasa = s.items.filter(function (i) { return i.jenis !== 'part'; }).map(function (i) { return i.nama.replace(/\s*\+\s*Basic Setup/i, ''); }),
            part = s.items.filter(function (i) { return i.jenis === 'part'; }).map(function (i) { return i.nama; }), gitar = L.namaGitar(s, 'Gitar');
        var judul = (jasa[0] || 'Servis Gitar') + ' ' + (s.gitar_merk || s.gitar_jenis || '') + (s.keluhan ? ': ' + s.keluhan.split(/[.,;\n]/)[0].trim() : '');
        judul = judul.replace(/\s+/g, ' ').trim().slice(0, 110);
        var isi = ['## Kondisi gitar saat masuk', s.keluhan || '(Ceritakan keluhan pelanggan dan kondisi gitar saat datang.)', '', '## Yang kami kerjakan']
            .concat(jasa.map(function (x) { return '- ' + x; }), part.map(function (x) { return '- Pasang/ganti: ' + x; }))
            .concat(['', '## Hasil', '(Ceritakan hasilnya: misalnya action lebih rendah, tidak fret buzz lagi, suara lebih jernih.)'])
            .concat(s.saran ? ['', '## Saran dari kami', s.saran] : [])
            .concat(['', '> Gitar Anda mengalami masalah serupa? Konsultasikan gratis lewat WhatsApp atau mampir ke toko kami di Bogor.']).join('\n');
        var urutan = ['sebelum', 'kerusakan', 'sesudah'], slug = ArtikelMd.slug(judul), n = 1;
        while (cache.artikel.some(function (a) { return a.slug === slug; })) slug = ArtikelMd.slug(judul) + '-' + (++n);
        var draf = {
            judul: judul, slug: slug, tag: 'Hasil Servis', status: 'draf', servis_id: s.id, isi: isi,
            ringkasan: ('Hasil ' + (jasa.join(', ') || 'servis') + ' gitar ' + gitar + ' di Toko Gitar AYRI Bogor, lengkap dengan foto sebelum dan sesudah.').slice(0, 160),
            foto: s.foto.slice().sort(function (a, b) { return urutan.indexOf(a.tahap) - urutan.indexOf(b.tahap); })
                .map(function (f) { return { servis: s.id, foto: f.id, alt: L.TAHAP[f.tahap] + ': ' + gitar }; })
        };
        var b = $('#sv-artikel'); sibuk(b, true, 'Membuat draf…');
        A.simpanArtikel(draf).then(function (row) {
            taruh('artikel', row); toast('Draf artikel dibuat. Rapikan tulisannya, lalu terbitkan.');
            pindah('#artikel/' + row.id);
        }).catch(function (e) { sibuk(b, false); gagal(e); });
    }
    function hapusServis() {
        if (konfirmasiKode('Menghapus servis juga menghapus semua fotonya dan tidak bisa dibatalkan.', ed.s.kode)) hapusData('servis', ed.s, $('#sv-hapus'), A.hapusServis, 'Servis dihapus.');
    }

    /* ================= beli dengan hak tebus ================= */
    var TB = C.tebus;
    function chipTebus(t) {
        var lewat = t.status === 'aktif' && L.infoTebus(t).lewat;
        var k = lewat ? 'st-menunggu_dp' : ({ aktif: 'st-antri', ditebus: 'st-selesai', milik_toko: 'st-diambil', batal: 'st-batal' })[t.status];
        return '<span class="st-chip ' + k + '">' + (lewat ? 'Lewat batas tebus' : E(L.STATUS_TEBUS[t.status].label)) + '</span>';
    }
    function daftarTebus() {
        app.innerHTML = '<section><div class="ly-head"><h1>Beli dengan hak tebus</h1><a class="ly-btn ly-btn--pri" href="#tebus/baru">+ Beli gitar</a></div>' +
            '<p class="ly-muted">Toko <b>membeli</b> gitar; penjual boleh membeli kembali sampai batas tebus dengan harga yang <b>sama dengan harga beli</b> (harga tebus = harga beli). Untung toko datang dari gitar yang tidak ditebus, bukan dari bunga.</p>' +
            '<div id="ingat"></div><div class="ly-filter" id="filter"></div><div class="ly-list" id="list"></div></section>';
        $('#filter').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filterTb = b.dataset.f; gambarDaftarTebus(); } });
        $('#ingat').addEventListener('click', function (e) {
            if (e.target.closest('[data-lihat]')) { filterTb = 'aktif'; gambarDaftarTebus(); }
            else if (e.target.closest('[data-lihatktp]')) { filterTb = 'semua'; gambarDaftarTebus(); }
        });
        $('#list').addEventListener('click', function (e) {
            var b = e.target.closest('[data-ingat]'); if (b) { e.preventDefault(); catatPengingat('tebus', b.dataset.ingat, b); return; }
            var k = e.target.closest('[data-hapusktp]'); if (k) { e.preventDefault(); var t = cariId('tebus', k.dataset.hapusktp); if (t) hapusKtp(t, k, gambarDaftarTebus); }
        });
        gambarDaftarTebus();
    }
    function gambarDaftarTebus() {
        if (!$('#list')) return;
        var rows = cache.tebus, n = {}, hari = L.hariIni();
        rows.forEach(function (t) { n[t.status] = (n[t.status] || 0) + 1; });
        $('#filter').innerHTML = [['aktif', 'Masa tebus'], ['ditebus', 'Dibeli kembali'], ['milik_toko', 'Milik toko'], ['batal', 'Batal'], ['semua', 'Semua']].map(function (x) {
            return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (filterTb === x[0]) + '">' + x[1] + '<b>' + (x[0] === 'semua' ? rows.length : n[x[0]] || 0) + '</b></button>';
        }).join('');
        var perlu = rows.filter(function (t) { return L.perluIngatTebus(t, hari); }).length, ktp = rows.filter(function (t) { return L.ktpBisaDihapus(t, hari); });
        $('#ingat').innerHTML = (perlu ? '<div class="ly-ingat"><span>🔔 <b>' + perlu + ' gitar</b> mendekati atau melewati batas tebus.</span><button type="button" class="ly-btn ly-btn--sm" data-lihat>Lihat</button></div>' : '') +
            (ktp.length ? '<div class="ly-ingat ly-ingat--info" style="margin-top:8px"><span>🪪 <b>' + ktp.length + ' foto KTP</b> sudah tidak diperlukan (transaksi selesai atau batal) dan sebaiknya dihapus.</span><button type="button" class="ly-btn ly-btn--sm" data-lihatktp>Lihat</button></div>' : '');
        var hasil = rows.filter(function (t) { return filterTb === 'semua' || t.status === filterTb; });
        if (filterTb === 'aktif') hasil.sort(function (a, b) { return a.batas_tebus < b.batas_tebus ? -1 : 1; });
        $('#list').innerHTML = hasil.length ? hasil.map(function (t) {
            var i = L.infoTebus(t, hari), akhir = (t.pengingat || []).slice(-1)[0], perluIngat = L.perluIngatTebus(t, hari), ktpHapus = ktp.indexOf(t) > -1;
            var batas = t.status !== 'aktif' ? '' : i.lewat ? '<span class="ly-telat">Lewat batas ' + (-i.sisa) + ' hari (' + L.tgl(t.batas_tebus) + ')</span>' : '<span>Batas ' + L.tgl(t.batas_tebus) + ' (' + i.sisa + ' hari lagi)</span>';
            return '<div class="ly-item"><a class="ly-item__a" href="#tebus/' + E(t.id) + '"><span class="ly-item__k">' + E(t.kode) + '</span></a>' + chipTebus(t) +
                '<span class="ly-item__t">' + E(L.namaGitar(t, 'Gitar')) + ' · ' + E(t.nama) + '</span>' +
                '<span class="ly-item__m"><span>Beli ' + L.tgl(t.tgl_beli) + ' ' + L.rupiah(t.harga_beli) + '</span>' + batas +
                (t.disetujui ? '' : '<span class="ly-warn">Belum ada balasan SETUJU</span>') + (akhir ? '<span>Diingatkan ' + L.tgl(akhir) + '</span>' : '') + '</span>' +
                (t.status === 'aktif' ? '<span class="ly-item__b"><button type="button" class="ly-btn ly-btn--sm ' + (perluIngat ? 'ly-btn--wa' : '') + '" data-ingat="' + E(t.id) + '">' + (perluIngat ? 'Ingatkan via WA' : 'Kirim pengingat') + '</button></span>' : '') +
                (ktpHapus ? '<span class="ly-item__b"><button type="button" class="ly-btn ly-btn--sm ly-btn--del" data-hapusktp="' + E(t.id) + '">Hapus foto KTP</button></span>' : '') + '</div>';
        }).join('') : '<p class="ly-kosong">' + (rows.length ? 'Tidak ada di kategori ini.' : 'Belum ada data. Tekan “+ Beli gitar”.') + '</p>';
    }
    function tebusKosong() {
        var h = L.hariIni();
        return { nama: '', hp: '', nik: '', gitar_jenis: C.jenisGitar[0], gitar_merk: '', warna: '', no_seri: '', kelengkapan: '', tgl_beli: h, harga_beli: 0, batas_tebus: L.tambahHari(h, TB.batasHari), metode: 'tunai', status: 'aktif', disetujui: null, catatan_admin: '', foto: [], pengingat: [] };
    }
    function bukaTebus(id) { ambilCatatan('tebus', id, tebusKosong, function (t) { t.foto = t.foto || []; te = { baru: !id, t: t, antri: [] }; gambarTebus(); }); }
    function gambarTebus() {
        var t = te.t, jenis = C.jenisGitar.slice(); if (t.gitar_jenis && jenis.indexOf(t.gitar_jenis) < 0) jenis.push(t.gitar_jenis);
        app.innerHTML = '<section id="tb" class="ly-f"><div class="ly-head"><a class="ly-back" href="#tebus">‹ Daftar tebus</a></div>' +
            '<div class="ly-head"><h1>' + (te.baru ? 'Beli gitar (hak tebus)' : E(L.namaGitar(t, 'Gitar'))) + '</h1>' + (te.baru ? '' : chipTebus(t)) + '</div>' +
            (te.baru ? '<p class="ly-muted">Kode dibuat otomatis saat disimpan.</p>' : kodeBaris(t)) +
            '<fieldset class="ly-card ly-f"><legend>Penjual</legend>' + tombolKontak('[data-t="nama"]', '[data-t="hp"]') +
            '<label>Nama (sesuai KTP)<input data-t="nama" autocomplete="off" required></label>' +
            '<div class="ly-row2"><label>No. HP / WhatsApp<input data-t="hp" type="tel" inputmode="tel" autocomplete="off" required></label><label>NIK (No. KTP, opsional)<input data-t="nik" inputmode="numeric" maxlength="16" autocomplete="off"></label></div>' +
            '<p class="ly-hint">Di surat perjanjian, NIK dan HP hanya tampil 4 digit terakhir.</p></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Gitar</legend>' +
            '<div class="ly-row2"><label>Jenis<select data-t="gitar_jenis">' + opsi(jenis, t.gitar_jenis) + '</select></label><label>Merk / model<input data-t="gitar_merk" placeholder="mis. Yamaha APX600"></label></div>' +
            '<div class="ly-row2"><label>Warna<input data-t="warna"></label><label>Nomor seri<input data-t="no_seri" autocapitalize="characters"></label></div>' +
            '<label>Kondisi &amp; kelengkapan<textarea data-t="kelengkapan" rows="2" placeholder="mis. lecet kecil di body, softcase, kabel jack"></textarea></label></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Harga &amp; batas tebus</legend>' +
            '<div class="ly-row2"><label>Tanggal beli<input type="date" data-t="tgl_beli"></label><label>Dibayar<select data-t="metode">' + opsi([['tunai', 'Tunai'], ['transfer', 'Transfer']], t.metode) + '</select></label></div>' +
            '<label>Harga beli = harga tebus (Rp)<input type="number" inputmode="numeric" min="0" step="10000" data-t="harga_beli"></label>' +
            '<label>Batas tebus<input type="date" data-t="batas_tebus"></label>' +
            '<div class="ly-btns"><button type="button" class="ly-btn ly-btn--sm" data-batas="30">30 hari</button><button type="button" class="ly-btn ly-btn--sm" data-batas="60">60 hari</button>' + (TB.maksHari >= 90 ? '<button type="button" class="ly-btn ly-btn--sm" data-batas="90">90 hari</button>' : '') + '</div>' +
            '<div class="ly-sum" id="tb-sum"></div></fieldset>' +
            '<fieldset class="ly-card"><legend>Foto</legend><div id="tb-foto"></div><p class="ly-hint" id="tb-ktp-saran" style="margin-top:10px"></p><p class="ly-hint" style="margin-top:6px">Foto gitar: depan, belakang, dan nomor seri. Foto KTP (opsional) untuk penjual yang belum dikenal atau harga beli di atas ' + L.rupiah(TB.fotoKtpMinHarga) + '; hapus ' + Math.round(TB.hapusKtpHari / 30) + ' bulan setelah gitar dibeli kembali. Semua foto dikunci di repo privat dan tidak pernah tampil di situs.</p></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Persetujuan &amp; status</legend>' +
            '<label class="ly-cek"><input type="checkbox" id="tb-setuju"><span>Penjual sudah membalas <b>SETUJU</b> di WhatsApp</span></label>' +
            '<div class="ly-status" id="tb-status"></div>' +
            '<label>Catatan internal<textarea data-t="catatan_admin" rows="2"></textarea></label></fieldset>' +
            (te.baru ? '' : '<fieldset class="ly-card"><legend>Kirim &amp; lainnya</legend>' +
                barisWa([['konfirmasi', 'Bukti & minta SETUJU', 'Kirim bukti pembelian ke penjual']]
                    .concat(t.status === 'aktif' ? [['pengingat', 'Pengingat tebus', 'Ingatkan batas membeli kembali']] : [])
                    .concat(t.status === 'ditebus' ? [['ditebus', 'Terima kasih (ditebus)', 'Kabari gitar sudah dibeli kembali']] : [])
                    .concat(t.status === 'milik_toko' ? [['berakhir', 'Masa tebus berakhir', 'Kabari gitar jadi milik toko']] : []), 'wat') +
                '<h3 class="ly-sub">Aksi lainnya</h3>' +
                kisiAksi([].concat(t.status === 'milik_toko' && !t.stok_id ? [aksi({ id: 'tb-kestok', ikon: 'stok', teks: 'Masukkan ke stok', kelas: 'ly-akt--pri' })] : [])
                    .concat(t.stok_id ? [aksi({ href: '#stok/' + E(t.stok_id), ikon: 'stok', teks: 'Lihat di stok' })] : [])
                    .concat([aksi({ href: 'perjanjian.html?k=' + encodeURIComponent(t.kode) + '&amp;h=' + encodeURIComponent(L.hp4(t.hp)), luar: true, ikon: 'surat', teks: 'Buka / cetak surat perjanjian' }),
                        aksi({ id: 'tb-hapus', ikon: 'hapus', teks: 'Hapus data', kelas: 'ly-akt--del' })])) +
                '<p class="ly-hint ly-hint--c">Surat perjanjian di situs ikut berubah ±1 menit setelah disimpan.</p></fieldset>') +
            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="tb-simpan">' + (te.baru ? 'Simpan &amp; buat kode' : 'Simpan perubahan') + '</button></div></section>';
        $$('[data-t]', app).forEach(function (el) { var v = t[el.dataset.t]; el.value = v == null ? '' : v; });
        $('#tb-setuju').checked = !!t.disetujui;
        gambarSumTebus(); gambarStatusTebus(); gambarFotoTebus(); setDirty(false);
        var tb = $('#tb');
        function ubah(e) {
            var el = e.target, k = el.dataset.t;
            if (k) { t[k] = k === 'harga_beli' ? Math.max(0, Math.round(+el.value || 0)) : el.value; setDirty(true); if (/harga|batas|tgl_beli/.test(k)) { gambarSumTebus(); saranKtp(); } }
            else if (el.id === 'tb-setuju') { t.disetujui = el.checked ? (t.disetujui || L.hariIni()) : null; setDirty(true); }
        }
        tb.addEventListener('input', ubah); tb.addEventListener('change', ubah);
        tb.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
            if (d.batas) { t.batas_tebus = L.tambahHari(t.tgl_beli, +d.batas); $('[data-t="batas_tebus"]').value = t.batas_tebus; gambarSumTebus(); setDirty(true); }
            else if (d.st) ubahStatusTebus(d.st);
            else if (d.wat) { if (dirty) return toast('Simpan perubahan dulu.', true); if (d.wat === 'pengingat') catatPengingat('tebus', t.id); else bukaWa(t.hp, L.pesanTebus[d.wat](t)); }
            else if (d.hapusfoto) { if (confirm('Hapus foto ini? (terhapus permanen saat Simpan)')) { t.foto = t.foto.filter(function (f) { return f.id !== d.hapusfoto; }); gambarFotoTebus(); setDirty(true); } }
            else if (d.hapusq) { te.antri = buangQ(te.antri, d.hapusq); gambarFotoTebus(); }
            else if (b.hasAttribute('data-hapusktp')) { if (dirty) return toast('Simpan perubahan dulu.', true); hapusKtp(te.t, b, function (row) { te = { baru: false, t: salin(row), antri: [] }; gambarTebus(); }); }
            else if (b.id === 'tb-kestok') { if (dirty) return toast('Simpan perubahan dulu.', true); tebusKeStok(te.t, b); }
        });
        pilihFoto($('#tb-foto'), function (tahap, files) { antriFoto(te.antri, files, { tahap: tahap }, gambarFotoTebus); });
        $('#tb-simpan').addEventListener('click', simpanTebus);
        if (!te.baru) $('#tb-hapus').addEventListener('click', hapusTebus);
    }
    function gambarSumTebus() {
        var t = te.t, batasMaks = L.tambahHari(t.tgl_beli, TB.maksHari);
        $('#tb-sum').innerHTML = '<div><span>Masa tebus</span><span>' + (t.batas_tebus ? L.hariAntara(t.tgl_beli, t.batas_tebus) + ' hari (s/d ' + L.tgl(t.batas_tebus) + ')' : '–') + '</span></div>' +
            (t.batas_tebus > batasMaks ? '<div class="ly-warn"><span>Batas tebus lebih dari ' + TB.maksHari + ' hari.</span><span></span></div>' : '');
    }
    function gambarStatusTebus() {
        $('#tb-status').innerHTML = ['aktif', 'ditebus', 'milik_toko', 'batal'].map(function (k) { return '<button type="button" data-st="' + k + '" aria-pressed="' + (te.t.status === k) + '">' + E(L.STATUS_TEBUS[k].label) + '</button>'; }).join('');
    }
    function ubahStatusTebus(st) {
        var t = te.t; if (st === t.status) return;
        if (st === 'milik_toko' && !L.infoTebus(t).lewat && !confirm('Batas tebus (' + L.tgl(t.batas_tebus) + ') belum lewat. Jadikan milik toko hanya bila penjual menyatakan tertulis tidak akan menebus. Lanjutkan?')) return;
        if (st === 'ditebus' && !confirm('Penjual sudah membayar ' + L.rupiah(L.hargaTebus(t)) + ' dan gitar diserahkan kembali?')) return;
        if (st === 'batal' && !confirm('Batalkan transaksi ini? Surat perjanjian di situs akan dihapus.')) return;
        t.status = st; gambarStatusTebus(); setDirty(true);
    }
    function gambarFotoTebus() {
        var el = $('#tb-foto'); if (!el) return;
        el.innerHTML = [['gitar', 'Foto gitar'], ['ktp', 'Foto KTP (opsional)']].map(function (x) { return grupFoto(x[1], x[0], te.t.foto, te.antri, false); }).join('');
        L.isiFoto(el, te.t, A.fotoAdmin);
        saranKtp();
    }
    /* saran foto KTP untuk harga besar; tawaran hapus foto KTP setelah masa simpannya lewat */
    function saranKtp() {
        var el = $('#tb-ktp-saran'), t = te.t; if (!el) return;
        var adaKtp = L.adaKtp(t) || te.antri.some(function (q) { return q.tahap === 'ktp'; });
        if (!te.baru && L.ktpBisaDihapus(t)) {
            el.innerHTML = '<span class="ly-warn">' + (t.status === 'batal' ? 'Transaksi dibatalkan' : 'Sudah ' + L.hariAntara(t.tgl_tebus, L.hariIni()) + ' hari sejak dibeli kembali') + ': foto KTP sudah tidak diperlukan.</span> <button type="button" class="ly-btn ly-btn--sm" data-hapusktp>Hapus foto KTP</button>';
        } else if (!adaKtp && t.harga_beli > TB.fotoKtpMinHarga) {
            el.innerHTML = '<span class="ly-warn">Harga beli di atas ' + L.rupiah(TB.fotoKtpMinHarga) + ': sebaiknya foto KTP penjual.</span>';
        } else el.innerHTML = '';
    }
    function hapusKtp(t, btn, selesai) {
        if (!confirm('Hapus foto KTP ' + t.nama + ' (' + t.kode + ')? Nama dan NIK tetap tercatat.')) return;
        var rec = salin(t); rec.foto = (rec.foto || []).filter(function (f) { return f.tahap !== 'ktp'; });
        if (btn) sibuk(btn, true, 'Menghapus…');
        A.simpanTebus(rec).then(function (row) {
            taruh('tebus', row); toast('Foto KTP dihapus.'); selesai(row);
        }).catch(function (e) { if (btn) sibuk(btn, false); gagal(e); });
    }
    function simpanTebus() {
        var t = te.t;
        t.nama = String(t.nama).trim(); t.hp = String(t.hp).trim();
        if (!t.nama) return toast('Nama penjual belum diisi.', true);
        if (t.hp.replace(/\D/g, '').length < 8) return toast('No. HP belum benar (minimal 8 angka).', true);
        if (!(t.harga_beli > 0)) return toast('Harga beli belum diisi.', true);
        if (!t.batas_tebus || t.batas_tebus < t.tgl_beli) return toast('Batas tebus harus setelah tanggal beli.', true);
        if (te.antri.some(function (q) { return !q.hasil; })) return toast('Foto masih diproses, tunggu sebentar.', true);
        var baru = te.baru, fotoBaru = te.antri.map(function (q) { return { hasil: q.hasil, tahap: q.tahap }; });
        prosesSimpan('tebus', $('#tb-simpan'), teksUnggah(fotoBaru), function () { return A.simpanTebus(t, fotoBaru); }, function (row) {
            lepasAntri(te.antri); te = { baru: false, t: salin(row), antri: [] };
            toast(baru ? 'Tersimpan. Kode: ' + row.kode + '. Kirim bukti ke penjual lewat tombol WA.' : 'Tersimpan.');
            if (baru) pindah('#tebus/' + row.id); else gambarTebus();
        }, function (r) { lepasAntri(te.antri); te = { baru: false, t: r, antri: [] }; gambarFotoTebus(); });
    }
    function hapusTebus() {
        if (konfirmasiKode('Menghapus data ini juga menghapus foto gitar & KTP dan surat perjanjiannya. Tidak bisa dibatalkan.', te.t.kode)) hapusData('tebus', te.t, $('#tb-hapus'), A.hapusTebus, 'Data dihapus.');
    }

    /* ================= titip jual: gitar milik orang lain yang kita jualkan (owner saja) =================
       Tahap 1: terima titipan, surat (WA + cetak), foto kondisi, masuk ke stok. Gitar titipan belum bisa dijual lewat Kasir (L.titipanTerkunci). */
    var tp = null, filterTp = 'aktif';
    var ANGKA_TP = { harga_jual: 1, harga_min: 1, komisi_min: 1, batas_mahal: 1, komisi_persen: 2, persen_mahal: 2 };
    function chipTitip(t) {
        var tinjau = t.status === 'aktif' && L.perluTinjauTitip(t);
        var k = tinjau ? 'st-menunggu_dp' : ({ aktif: 'st-antri', diambil: 'st-diambil', batal: 'st-batal' })[t.status];
        return '<span class="st-chip ' + k + '">' + (tinjau ? 'Tinjau harga' : E(L.STATUS_TITIP[t.status] || t.status)) + '</span>';
    }
    function daftarTitip() {
        app.innerHTML = '<section><div class="ly-head"><h1>Titip jual</h1><a class="ly-btn ly-btn--pri" href="#titip/baru">+ Terima titipan</a></div>' +
            '<p class="ly-muted">Gitar milik orang lain yang kita jualkan. Komisi toko: ' + E(L.ringkasKomisiTitip(L.komisiBawaanTitip())) + ' (bisa diubah per pemilik). Data pemilik dan harga minimum hanya terlihat oleh owner.</p>' +
            '<div class="ly-filter" id="filter"></div><div class="ly-list" id="list"></div></section>';
        $('#filter').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filterTp = b.dataset.f; gambarDaftarTitip(); } });
        gambarDaftarTitip();
    }
    function gambarDaftarTitip() {
        if (!$('#list')) return;
        var rows = cache.titip, hari = L.hariIni(), n = { aktif: 0, tinjau: 0, diambil: 0, batal: 0 };
        rows.forEach(function (t) { n[t.status] = (n[t.status] || 0) + 1; if (L.perluTinjauTitip(t, hari)) n.tinjau++; });
        $('#filter').innerHTML = [['aktif', 'Dititipkan'], ['tinjau', 'Perlu ditinjau'], ['diambil', 'Diambil'], ['batal', 'Batal'], ['semua', 'Semua']].map(function (x) {
            return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (filterTp === x[0]) + '">' + x[1] + '<b>' + (x[0] === 'semua' ? rows.length : n[x[0]] || 0) + '</b></button>';
        }).join('');
        var hasil = rows.filter(function (t) { return filterTp === 'semua' ? true : filterTp === 'tinjau' ? L.perluTinjauTitip(t, hari) : t.status === filterTp; });
        $('#list').innerHTML = hasil.length ? hasil.map(function (t) {
            return '<a class="ly-item" href="#titip/' + E(t.id) + '"><span class="ly-item__k">' + E(t.kode) + '</span>' + chipTitip(t) +
                '<span class="ly-item__t">' + E(L.namaGitar(t, 'Gitar')) + ' · ' + E(t.nama) + '</span>' +
                '<span class="ly-item__m"><span>Masuk ' + L.tgl(t.tgl_masuk) + (t.status === 'aktif' ? ' (' + L.hariTitip(t, hari) + ' hari)' : '') + '</span><span>Harga ' + L.rupiah(t.harga_jual) + '</span></span></a>';
        }).join('') : '<p class="ly-kosong">' + (rows.length ? 'Tidak ada di kategori ini.' : 'Belum ada titipan. Tekan “+ Terima titipan”.') + '</p>';
    }
    function titipKosong() {
        return Object.assign({ nama: '', hp: '', nik: '', gitar_jenis: C.jenisGitar[0], gitar_merk: '', warna: '', no_seri: '', kelengkapan: '', tgl_masuk: L.hariIni(), harga_jual: 0, harga_min: 0,
            status: 'aktif', disetujui: null, catatan_admin: '', foto: [], pengingat: [] }, L.komisiBawaanTitip());
    }
    function bukaTitip(id) { ambilCatatan('titip', id, titipKosong, function (t) { t.foto = t.foto || []; tp = { baru: !id, t: t, antri: [] }; gambarTitip(); }); }
    function gambarTitip() {
        var t = tp.t, jenis = C.jenisGitar.slice(); if (t.gitar_jenis && jenis.indexOf(t.gitar_jenis) < 0) jenis.push(t.gitar_jenis);
        app.innerHTML = '<section id="tp" class="ly-f"><div class="ly-head"><a class="ly-back" href="#titip">‹ Titip jual</a></div>' +
            '<div class="ly-head"><h1>' + (tp.baru ? 'Terima titipan' : E(L.namaGitar(t, 'Gitar'))) + '</h1>' + (tp.baru ? '' : chipTitip(t)) + '</div>' +
            (tp.baru ? '<p class="ly-muted">Kode dibuat otomatis saat disimpan.</p>' : kodeBaris(t, '')) +
            '<fieldset class="ly-card ly-f"><legend>Pemilik</legend>' + tombolKontak('[data-t="nama"]', '[data-t="hp"]') +
            '<label>Nama<input data-t="nama" autocomplete="off" required></label>' +
            '<div class="ly-row2"><label>No. HP / WhatsApp<input data-t="hp" type="tel" inputmode="tel" autocomplete="off" required></label><label>NIK / No. KTP (opsional)<input data-t="nik" inputmode="numeric" maxlength="16" autocomplete="off"></label></div>' +
            '<p class="ly-hint">NIK dan foto KTP tidak wajib. Bila diisi, hanya tersimpan di repo owner dan tidak pernah tampil di situs.</p></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Gitar</legend>' +
            '<div class="ly-row2"><label>Jenis<select data-t="gitar_jenis">' + opsi(jenis, t.gitar_jenis) + '</select></label><label>Merk / model<input data-t="gitar_merk" placeholder="mis. Yamaha APX600"></label></div>' +
            '<div class="ly-row2"><label>Warna<input data-t="warna"></label><label>Nomor seri<input data-t="no_seri" autocapitalize="characters"></label></div>' +
            '<label>Kondisi &amp; kelengkapan (jadi deskripsi di katalog)<textarea data-t="kelengkapan" rows="2" placeholder="mis. lecet kecil di body, softcase, kabel jack"></textarea></label></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Harga &amp; komisi</legend>' +
            '<label>Tanggal titip<input type="date" data-t="tgl_masuk"></label>' +
            '<div class="ly-row2"><label>Harga jual (Rp)<input type="number" inputmode="numeric" min="0" step="10000" data-t="harga_jual"></label><label>Harga minimum (Rp)<input type="number" inputmode="numeric" min="0" step="10000" data-t="harga_min"></label></div>' +
            '<p class="ly-hint">Harga minimum hanya terlihat owner. Toko tidak menjual di bawahnya, dan dipakai sebagai ganti rugi bila gitar rusak atau hilang karena kelalaian toko.</p>' +
            '<div class="ly-row2"><label>Komisi toko (%)<input type="number" inputmode="decimal" min="0" max="100" step="0.5" data-t="komisi_persen"></label><label>Komisi minimal (Rp)<input type="number" inputmode="numeric" min="0" step="10000" data-t="komisi_min"></label></div>' +
            '<div class="ly-row2"><label>Harga jual di atas (Rp)<input type="number" inputmode="numeric" min="0" step="1000000" data-t="batas_mahal"></label><label>Komisi di atasnya (%)<input type="number" inputmode="decimal" min="0" max="100" step="0.5" data-t="persen_mahal"></label></div>' +
            '<div class="ly-sum" id="tp-sum"></div></fieldset>' +
            '<fieldset class="ly-card"><legend>Foto</legend><div id="tp-foto"></div><p class="ly-hint" style="margin-top:10px">Foto kondisi gitar (depan, belakang, cacat yang ada) dibuat saat gitar diterima sebagai bukti kondisi. Foto gitar ikut dipakai sebagai foto produk saat dimasukkan ke stok. Foto KTP opsional. Semua foto dikunci di repo owner.</p></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Persetujuan &amp; status</legend>' +
            '<label class="ly-cek"><input type="checkbox" id="tp-setuju"><span>Pemilik sudah membalas <b>SETUJU</b> di WhatsApp</span></label>' +
            '<div class="ly-status" id="tp-status"></div>' +
            '<label>Catatan internal<textarea data-t="catatan_admin" rows="2"></textarea></label></fieldset>' +
            (tp.baru ? '' : '<fieldset class="ly-card"><legend>Kirim &amp; lainnya</legend>' +
                barisWa([['konfirmasi', 'Surat titip & minta SETUJU', 'Kirim ketentuan titip jual ke pemilik']]
                    .concat(t.status === 'aktif' ? [['pengingat', 'Tinjau harga', 'Tanya pemilik soal harga jual']] : [])
                    .concat(t.status === 'diambil' ? [['diambil', 'Gitar diserahkan kembali', 'Kabari pemilik gitar sudah diambil']] : []), 'wat') +
                '<h3 class="ly-sub">Aksi lainnya</h3>' +
                kisiAksi([].concat(t.status === 'aktif' && !t.stok_id ? [aksi({ id: 'tp-kestok', ikon: 'stok', teks: 'Masukkan ke stok &amp; katalog', kelas: 'ly-akt--pri' })] : [])
                    .concat(t.stok_id ? [aksi({ href: '#stok/' + E(t.stok_id), ikon: 'stok', teks: 'Lihat di stok' })] : [])
                    .concat([aksi({ id: 'tp-cetak', ikon: 'cetak', teks: 'Cetak bukti titip' }), aksi({ id: 'tp-hapus', ikon: 'hapus', teks: 'Hapus data', kelas: 'ly-akt--del' })])) +
                '<p class="ly-hint ly-hint--c">Penjualan lewat Kasir dan pembayaran ke pemilik sedang disiapkan.</p></fieldset>') +
            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="tp-simpan">' + (tp.baru ? 'Simpan &amp; buat kode' : 'Simpan perubahan') + '</button></div></section>';
        $$('[data-t]', app).forEach(function (el) { var v = t[el.dataset.t]; el.value = v == null ? '' : v; });
        $('#tp-setuju').checked = !!t.disetujui;
        gambarSumTitip(); gambarStatusTitip(); gambarFotoTitip(); setDirty(false);
        var f = $('#tp');
        function ubah(e) {
            var el = e.target, k = el.dataset.t;
            if (k) {
                var m = ANGKA_TP[k];
                t[k] = m === 1 ? Math.max(0, Math.round(+el.value || 0)) : m === 2 ? Math.max(0, Math.min(100, +el.value || 0)) : el.value;
                setDirty(true); if (m) gambarSumTitip();
            } else if (el.id === 'tp-setuju') { t.disetujui = el.checked ? (t.disetujui || L.hariIni()) : null; setDirty(true); }
        }
        f.addEventListener('input', ubah); f.addEventListener('change', ubah);
        f.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
            if (d.st) ubahStatusTitip(d.st);
            else if (d.wat) { if (dirty) return toast('Simpan perubahan dulu.', true); if (d.wat === 'pengingat') ingatTitip(b); else bukaWa(t.hp, L.pesanTitip[d.wat](t)); }
            else if (d.hapusfoto) { if (confirm('Hapus foto ini? (terhapus permanen saat Simpan)')) { t.foto = t.foto.filter(function (x) { return x.id !== d.hapusfoto; }); gambarFotoTitip(); setDirty(true); } }
            else if (d.hapusq) { tp.antri = buangQ(tp.antri, d.hapusq); gambarFotoTitip(); }
            else if (b.id === 'tp-kestok') { if (dirty) return toast('Simpan perubahan dulu.', true); titipKeStok(tp.t, b); }
            else if (b.id === 'tp-cetak') { if (dirty) return toast('Simpan perubahan dulu.', true); cetakBaris(L.strukTitip(t)); }
        });
        pilihFoto($('#tp-foto'), function (tahap, files) { antriFoto(tp.antri, files, { tahap: tahap }, gambarFotoTitip); });
        $('#tp-simpan').addEventListener('click', simpanTitip);
        if (!tp.baru) $('#tp-hapus').addEventListener('click', hapusTitip);
    }
    function gambarSumTitip() {
        var t = tp.t, el = $('#tp-sum'); if (!el) return;
        var baris = [['Laku di harga jual', t.harga_jual]];
        if (t.harga_min > 0 && t.harga_min < t.harga_jual) baris.push(['Laku di harga minimum', t.harga_min]);
        el.innerHTML = baris.filter(function (b) { return b[1] > 0; }).map(function (b) {
            var h = L.hitungKomisiTitip(t, b[1]);
            return '<div><span>' + b[0] + ' ' + L.rupiah(b[1]) + ': komisi toko</span><span>' + L.rupiah(h.komisi) + '</span></div><div><span>Bagian pemilik</span><span>' + L.rupiah(h.bagianPemilik) + '</span></div>';
        }).join('') + (t.harga_min > t.harga_jual && t.harga_jual > 0 ? '<div class="ly-warn"><span>Harga minimum lebih tinggi dari harga jual.</span><span></span></div>' : '');
    }
    function gambarStatusTitip() {
        $('#tp-status').innerHTML = ['aktif', 'diambil', 'batal'].map(function (k) { return '<button type="button" data-st="' + k + '" aria-pressed="' + (tp.t.status === k) + '">' + E(L.STATUS_TITIP[k]) + '</button>'; }).join('');
    }
    function ubahStatusTitip(st) {
        var t = tp.t; if (st === t.status) return;
        if (st === 'diambil' && !confirm('Pemilik sudah mengambil gitarnya kembali? Gitar akan ditarik dari stok dan katalog.')) return;
        if (st === 'batal' && !confirm('Batalkan titipan ini? Gitar akan ditarik dari stok dan katalog.')) return;
        t.status = st; gambarStatusTitip(); setDirty(true);
    }
    function gambarFotoTitip() {
        var el = $('#tp-foto'); if (!el) return;
        el.innerHTML = [['gitar', 'Foto kondisi gitar'], ['ktp', 'Foto KTP (opsional)']].map(function (x) { return grupFoto(x[1], x[0], tp.t.foto, tp.antri, false); }).join('');
        L.isiFoto(el, tp.t, A.fotoAdmin);
    }
    /* titipan yang sudah diambil atau dibatalkan: gitarnya ditarik dari stok (hilang dari katalog). Gagal di sini tidak menggagalkan simpanan titipan */
    function tarikStokTitip(row) {
        var s = row.status !== 'aktif' && row.stok_id && cariId('stok', row.stok_id);
        if (!s || s.status === 'ditarik') return Promise.resolve(row);
        var r = salin(s); r.status = 'ditarik'; r.tampil = false;
        return A.simpanStok(r).then(function (x) { taruh('stok', x); return row; }, function (e) { toast('Titipan tersimpan, tapi stok belum ditarik dari katalog: ' + (e.message || e) + ' Tarik manual di menu Stok.', true); return row; });
    }
    function simpanTitip() {
        var t = tp.t;
        t.nama = String(t.nama).trim(); t.hp = String(t.hp).trim(); t.nik = String(t.nik || '').replace(/\D/g, '');
        if (!t.nama) return toast('Nama pemilik belum diisi.', true);
        if (t.hp.replace(/\D/g, '').length < 8) return toast('No. HP belum benar (minimal 8 angka).', true);
        if (!String(t.gitar_merk).trim()) return toast('Merk / model gitar belum diisi.', true);
        if (!(t.harga_jual > 0)) return toast('Harga jual belum diisi.', true);
        if (!(t.harga_min > 0) || t.harga_min > t.harga_jual) return toast('Harga minimum harus diisi dan tidak boleh lebih tinggi dari harga jual.', true);
        if (tp.antri.some(function (q) { return !q.hasil; })) return toast('Foto masih diproses, tunggu sebentar.', true);
        var baru = tp.baru, fotoBaru = tp.antri.map(function (q) { return { hasil: q.hasil, tahap: q.tahap }; });
        prosesSimpan('titip', $('#tp-simpan'), teksUnggah(fotoBaru), function () { return A.simpanTitip(t, fotoBaru).then(tarikStokTitip); }, function (row) {
            lepasAntri(tp.antri); tp = { baru: false, t: salin(row), antri: [] };
            toast(baru ? 'Tersimpan. Kode: ' + row.kode + '. Kirim surat titip ke pemilik lewat tombol WA.' : 'Tersimpan.');
            if (baru) pindah('#titip/' + row.id); else gambarTitip();
        }, function (r) { lepasAntri(tp.antri); tp = { baru: false, t: r, antri: [] }; gambarFotoTitip(); });
    }
    /* buka WA dulu (harus langsung dari ketukan), lalu catat tanggal tinjau di data */
    function ingatTitip(btn) {
        var t = tp.t; bukaWa(t.hp, L.pesanTitip.pengingat(t));
        var rec = salin(t); rec.pengingat = (rec.pengingat || []).concat(L.hariIni());
        sibuk(btn, true, 'Mencatat…');
        A.simpanTitip(rec).then(function (row) { taruh('titip', row); toast('Tinjau harga dicatat (' + L.tgl(L.hariIni()) + ').'); tp = { baru: false, t: salin(row), antri: [] }; gambarTitip(); })
            .catch(function (e) { sibuk(btn, false); if (e.bentrok) return tawarMuatUlang(e); gagal(e); });
    }
    function hapusTitip() {
        if (konfirmasiKode('Menghapus data ini juga menghapus foto kondisi dan KTP. Stok yang sudah dibuat dari titipan ini tidak ikut terhapus. Tidak bisa dibatalkan.', tp.t.kode)) hapusData('titip', tp.t, $('#tp-hapus'), A.hapusTitip, 'Data dihapus.');
    }
    /* titipan -> stok bekas (foto gitar ikut dipindah, KTP tidak). Stok hanya membawa penanda sumber_titip: tanpa nama, HP, atau harga minimum, dan modal 0 karena gitar bukan milik toko */
    function titipKeStok(t, btn) {
        var fotoGitar = (t.foto || []).filter(function (f) { return f.tahap === 'gitar'; });
        sibuk(btn, true, 'Memindahkan…');
        /* bila langkah kedua (menautkan ke data titipan) pernah gagal, stoknya sudah ada: cukup ditautkan, jangan dibuat dua kali */
        var sudah = cache.stok.filter(function (x) { return x.sumber_titip === t.id; })[0];
        (sudah ? Promise.resolve(sudah) : Promise.all(fotoGitar.map(function (f) { return Promise.all([A.fotoBlob(t, f, true), A.fotoBlob(t, f, false)]).then(function (b) { return { hasil: { besar: b[0], kecil: b[1] } }; }); }))
            .then(function (fotoBaru) {
                var rec = Object.assign(stokKosong(), { kondisi: 'bekas', gitar_jenis: t.gitar_jenis, gitar_merk: t.gitar_merk, warna: t.warna, no_seri: t.no_seri, deskripsi: t.kelengkapan, harga_jual: t.harga_jual, harga_beli: 0, asal: 'Titip jual ' + t.kode, sumber_titip: t.id, tgl_masuk: t.tgl_masuk });
                return A.simpanStok(rec, fotoBaru);
            })).then(function (row) {
                taruh('stok', row);
                var tr = salin(t); tr.stok_id = row.id;
                return A.simpanTitip(tr).then(function (t2) {
                    taruh('titip', t2);
                    setDirty(false); toast('Masuk ke stok (' + row.kode + '). Atur tingkat kondisi dan deskripsinya di sana.'); pindah('#stok/' + row.id);
                });
            }).catch(function (e) { sibuk(btn, false); gagal(e); });
    }

    /* ================= jual stok: lunas, atau DP lalu pelunasan ================= */
    var jl = null, filterJl = 'aktif', cariJl = '';
    var CHIP_JUAL = { dp: 'st-menunggu_dp', lunas: 'st-selesai', selesai: 'st-diambil', batal: 'st-batal' };
    function chipJual(j) { return '<span class="st-chip ' + CHIP_JUAL[j.status] + '">' + E(L.STATUS_JUAL[j.status] || j.status) + '</span>'; }
    function daftarJual() {
        app.innerHTML = '<section><div class="ly-head"><h1>Penjualan</h1><a class="ly-btn ly-btn--pri" href="#stok">+ Jual dari stok</a></div>' +
            '<p class="ly-muted">Pilih barang di <a href="#stok">Stok</a> lalu tekan “Jual / pesan dengan DP”. Barang yang di-DP ditahan (stok berkurang, hilang dari katalog) sampai lunas atau batal.</p>' +
            '<div class="ly-cari"><input class="ly-in" id="cari" type="search" placeholder="Cari kode, nama pembeli, barang…" autocomplete="off"></div>' +
            '<div class="ly-filter" id="filter"></div><div class="ly-list" id="list"></div></section>';
        $('#cari').value = cariJl;
        $('#cari').addEventListener('input', function () { cariJl = this.value; gambarDaftarJual(); });
        $('#filter').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filterJl = b.dataset.f; gambarDaftarJual(); } });
        gambarDaftarJual();
    }
    function gambarDaftarJual() {
        if (!$('#list')) return;
        var rows = cache.jual, c = cariJl.trim().toLowerCase(), n = { aktif: 0, dp: 0, lunas: 0, selesai: 0, batal: 0, ingat: 0 };
        rows.forEach(function (j) { n[j.status] = (n[j.status] || 0) + 1; if (j.status === 'dp' || j.status === 'lunas') n.aktif++; if (L.perluIngatJual(j)) n.ingat++; });
        $('#filter').innerHTML = [['aktif', 'Berjalan'], ['ingat', 'Perlu diingatkan'], ['dp', 'DP'], ['lunas', 'Lunas, belum diambil'], ['selesai', 'Selesai'], ['batal', 'Batal'], ['semua', 'Semua']].map(function (x) {
            return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (filterJl === x[0]) + '">' + x[1] + '<b>' + (x[0] === 'semua' ? rows.length : n[x[0]] || 0) + '</b></button>';
        }).join('');
        var hasil = rows.filter(function (j) {
            var ok = filterJl === 'semua' ? true : filterJl === 'aktif' ? (j.status === 'dp' || j.status === 'lunas') : filterJl === 'ingat' ? L.perluIngatJual(j) : j.status === filterJl;
            return ok && (!c || [j.kode, j.nama, j.hp, L.namaJual(j)].join(' ').toLowerCase().indexOf(c) > -1);
        });
        $('#list').innerHTML = hasil.length ? hasil.map(function (j) {
            var h = L.hitungJual(j), i = L.infoJual(j);
            return '<div class="ly-item"><a class="ly-item__a" href="#jual/' + E(j.id) + '"><span class="ly-item__k">' + E(j.kode) + '</span></a>' + chipJual(j) +
                '<span class="ly-item__t">' + E(j.nama || 'Pembeli umum') + ' · ' + E(L.namaJual(j)) + '</span>' +
                '<span class="ly-item__m"><span>' + L.tgl(j.tgl) + '</span><span>Total ' + L.rupiah(h.total) + '</span>' +
                (j.status === 'dp' ? '<span>Sisa ' + L.rupiah(h.sisa) + '</span><span' + (i.lewat ? ' class="ly-telat"' : '') + '>Batas ' + L.tgl(j.batas_lunas) + (i.lewat ? ' (lewat)' : i.sisa != null ? ' (' + i.sisa + ' hari lagi)' : '') + '</span>' : '') +
                (j.status === 'dp' && !j.disetujui && j.hp ? '<span class="ly-warn">Belum ada balasan SETUJU</span>' : '') + '</span></div>';
        }).join('') : '<p class="ly-kosong">' + (rows.length ? 'Tidak ada di kategori ini.' : 'Belum ada penjualan. Pilih barang di Stok lalu tekan “Jual / pesan dengan DP”.') + '</p>';
    }
    /* transaksi baru dari satu barang stok (#jual/baru/<id stok>) */
    function jualBaru(stokId) { ambilCatatan('stok', stokId, function () { return null; }, formJual); }
    function formJual(s) {
        if (L.titipanTerkunci(s)) { app.innerHTML = '<p class="ly-kosong">Stok ' + E(s.kode) + ' adalah gitar titipan. Penjualan gitar titipan lewat Kasir belum tersedia (sedang disiapkan). <a href="#stok/' + E(s.id) + '">Kembali</a></p>'; return; }
        if (!(+s.jumlah > 0) || s.status === 'ditarik' || L.sewaAktifStok(s.id, cache.sewa)) { app.innerHTML = '<p class="ly-kosong">Stok ' + E(s.kode) + ' sedang tidak tersedia (habis, ditarik, atau sedang disewa). <a href="#stok/' + E(s.id) + '">Kembali</a></p>'; return; }
        var h = L.hariIni(), nama = L.judulStok(s) + (s.warna ? ' (' + s.warna + ')' : '') + (s.kondisi === 'bekas' ? ' – Used' + (L.tingkatStok(s) ? ' ' + L.tingkatStok(s) : '') : '');
        jl = { baru: true, stok: s, j: { nama: '', hp: '', tgl: h, items: [{ stok_id: s.id, kode: s.kode, nama: nama, qty: 1, harga: +s.harga_jual || 0 }], bayar: [], catatan: '', batas_lunas: L.tambahHari(h, C.jual.batasHari) } };
        app.innerHTML = '<section id="jl" class="ly-f"><div class="ly-head"><a class="ly-back" href="#stok/' + E(s.id) + '">‹ ' + E(s.kode) + '</a></div>' +
            '<div class="ly-head"><h1>Jual / pesan dengan DP</h1></div>' +
            '<fieldset class="ly-card ly-f"><legend>Barang</legend><p style="margin:0"><b>' + E(nama) + '</b><br><small class="ly-muted">' + E(s.kode) + ' · stok ' + s.jumlah + ' · harga jual ' + L.rupiah(s.harga_jual) + '</small></p>' +
            '<div class="ly-row2"><label>Jumlah<input type="number" inputmode="numeric" min="1" max="' + s.jumlah + '" id="jb-qty" value="1"' + (+s.jumlah > 1 ? '' : ' disabled') + '></label>' +
            '<label>Harga deal per unit (Rp)<input type="number" inputmode="numeric" min="0" step="10000" id="jb-harga"></label></div></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Pembeli</legend>' + tombolKontak('#jb-nama', '#jb-hp') + '<div class="ly-row2"><label>Nama<input id="jb-nama" autocomplete="off"></label>' +
            '<label>No. WhatsApp<input id="jb-hp" type="tel" inputmode="tel" autocomplete="off" placeholder="08…"></label></div>' +
            '<p class="ly-hint" style="margin:0">Wajib untuk DP (nota & pengingat dikirim lewat WA). Untuk jual lunas langsung boleh dikosongkan.</p></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Pembayaran sekarang</legend><div class="ly-row2"><label>Jumlah dibayar (Rp)<input type="number" inputmode="numeric" min="0" step="10000" id="jb-bayar"></label>' +
            '<label>Metode<select id="jb-metode">' + opsi([['tunai', 'Tunai'], ['transfer', 'Transfer'], ['qris', 'QRIS']], 'tunai') + '</select></label></div>' +
            '<div class="ly-row2"><label>Tanggal<input type="date" id="jb-tgl"></label><label id="jb-batas-l">Batas pelunasan<input type="date" id="jb-batas"></label></div>' +
            '<label>Catatan (opsional)<input id="jb-ket" placeholder="mis. bonus softcase, dikirim via ekspedisi"></label>' +
            '<div id="jb-ambil-l"><label class="ly-cek"><input type="checkbox" id="jb-ambil" checked><span>Barang langsung dibawa / dikirim (transaksi selesai)</span></label></div>' +
            '<div class="ly-sum" id="jb-sum"></div></fieldset>' +
            '<div class="ly-save"><button type="button" class="ly-btn ly-btn--pri" id="jb-simpan">Simpan</button></div></section>';
        $('#jb-harga').value = jl.j.items[0].harga || ''; $('#jb-tgl').value = h; $('#jb-batas').value = jl.j.batas_lunas; $('#jb-bayar').value = jl.j.items[0].harga || '';
        function baca() {
            var j = jl.j, it = j.items[0];
            it.qty = Math.max(1, Math.min(+s.jumlah, Math.round(+$('#jb-qty').value || 1))); it.harga = Math.max(0, Math.round(+$('#jb-harga').value || 0));
            j.nama = $('#jb-nama').value.trim(); j.hp = $('#jb-hp').value.trim(); j.tgl = $('#jb-tgl').value || h; j.batas_lunas = $('#jb-batas').value; j.catatan = $('#jb-ket').value.trim();
            var bayar = Math.max(0, Math.round(+$('#jb-bayar').value || 0));
            j.bayar = bayar ? [{ id: idAcak(), tgl: j.tgl, jumlah: bayar, jenis: 'dp', metode: $('#jb-metode').value }] : [];
            var hh = L.hitungJual(j), dp = !hh.lunas;
            if (!dp && j.bayar[0]) j.bayar[0].jenis = 'pelunasan';
            $('#jb-batas-l').hidden = !dp; $('#jb-ambil-l').hidden = dp;
            if (dp) delete j.status; else if ($('#jb-ambil').checked) j.status = 'selesai'; else delete j.status;
            $('#jb-sum').innerHTML = '<div><span>Total</span><span>' + L.rupiah(hh.total) + '</span></div><div><span>Dibayar sekarang</span><span>' + L.rupiah(hh.dibayar) + '</span></div>' +
                (dp ? '<div class="ly-total"><span>Sisa (DP, barang ditahan sampai ' + L.tgl(j.batas_lunas) + ')</span><span>' + L.rupiah(hh.sisa) + '</span></div>' +
                    '<div><span>Bila batal: potongan ' + C.jual.potonganPersen + '% (maks. sebesar DP)</span><span>' + L.rupiah(hh.potongan) + '</span></div>'
                    : '<div class="ly-total"><span>Lunas' + (hh.dibayar > hh.total ? ' (kembalian ' + L.rupiah(hh.dibayar - hh.total) + ')' : '') + '</span><span>✅</span></div>');
            setDirty(true);
        }
        $('#jl').addEventListener('input', baca); $('#jl').addEventListener('change', baca); baca(); setDirty(false);
        $('#jb-simpan').addEventListener('click', function () {
            baca(); var j = jl.j, hh = L.hitungJual(j);
            if (!hh.total) return toast('Isi harga deal.', true);
            if (!hh.lunas && (!j.nama || L.hp4(j.hp).length < 4)) return toast('Untuk DP, isi nama dan nomor WhatsApp pembeli.', true);
            if (!hh.lunas && !hh.dibayar && !confirm('Belum ada pembayaran. Tetap tahan barang untuk pembeli ini?')) return;
            if (!hh.lunas && (!j.batas_lunas || j.batas_lunas < j.tgl)) return toast('Batas pelunasan tidak valid.', true);
            if (hh.dibayar > hh.total) { j.bayar[0].jumlah = hh.total; }
            if (j.items[0].harga < (+s.harga_beli || 0) && !confirm('Harga deal di bawah modal. Tetap simpan?')) return;
            prosesSimpan('jual', $('#jb-simpan'), 'Menyimpan…', function () { return A.simpanJual(j); }, function (row) {
                cache.stok = A.daftar('stok');
                toast(row.status === 'dp' ? 'Pesanan tersimpan (' + row.kode + '). Kirim bukti DP ke pembeli.' : 'Penjualan tersimpan (' + row.kode + ').');
                pindah('#jual/' + row.id);
            }, function (r) { jl.j = r; });
        });
    }
    function bukaJual(id) { ambilCatatan('jual', id, function () { return null; }, function (j) { j.bayar = j.bayar || []; jl = { baru: false, j: j }; gambarJual2(); }); }
    function gambarJual2() {
        var j = jl.j, h = L.hitungJual(j), i = L.infoJual(j), aktif = j.status === 'dp' || j.status === 'lunas', adaHp = L.hp4(j.hp).length === 4;
        app.innerHTML = '<section id="jl" class="ly-f"><div class="ly-head"><a class="ly-back" href="#jual">‹ Penjualan</a></div>' +
            '<div class="ly-head"><h1>' + E(j.nama || 'Pembeli umum') + '</h1>' + chipJual(j) + '</div>' + kodeBaris(j, adaHp ? null : '') +
            '<fieldset class="ly-card"><legend>Barang</legend><div class="ly-bayar">' + j.items.map(function (it) {
                return '<div><span><a href="#stok/' + E(it.stok_id) + '">' + E(it.kode) + '</a> · ' + E(it.nama) + (it.qty > 1 ? ' ×' + it.qty : '') + '</span><b>' + L.rupiah(it.harga * it.qty) + '</b></div>';
            }).join('') + '</div>' + (j.catatan ? '<p class="ly-hint" style="margin:8px 0 0">' + E(j.catatan) + '</p>' : '') + '</fieldset>' +
            '<fieldset class="ly-card"><legend>Pembayaran</legend><div class="ly-sum">' +
            '<div><span>Total</span><span>' + L.rupiah(h.total) + '</span></div><div><span>Sudah dibayar</span><span>' + L.rupiah(h.dibayar) + '</span></div>' +
            (j.status === 'batal' ? '<div><span>Potongan pembatalan' + (j.batal_oleh === 'toko' ? ' (dibatalkan toko)' : '') + '</span><span>' + L.rupiah(h.potongan) + '</span></div><div class="ly-total"><span>Dikembalikan</span><span>' + L.rupiah(h.kembali) + '</span></div>'
                : '<div class="ly-total"><span>Sisa</span><span>' + L.rupiah(h.sisa) + '</span></div>') +
            (j.status === 'dp' ? '<div><span>Batas pelunasan</span><span' + (i.lewat ? ' class="ly-telat"' : '') + '>' + L.tgl(j.batas_lunas) + (i.lewat ? ' (lewat ' + -i.sisa + ' hari)' : ' (' + i.sisa + ' hari lagi)') + '</span></div>' : '') + '</div>' +
            '<div class="ly-bayar" id="jl-bayar" style="margin-top:10px"></div>' +
            (j.status === 'dp' ? '<div class="ly-f" style="margin-top:10px"><div class="ly-row2"><label>Jumlah (Rp)<input type="number" inputmode="numeric" min="0" step="10000" id="by-jml"></label>' +
                '<label>Metode<select id="by-metode">' + opsi([['tunai', 'Tunai'], ['transfer', 'Transfer'], ['qris', 'QRIS']], 'transfer') + '</select></label></div>' +
                '<div class="ly-row2"><label>Tanggal<input type="date" id="by-tgl"></label><label>Batas pelunasan<input type="date" id="jl-batas"></label></div>' +
                '<button type="button" class="ly-btn" id="by-tambah">Catat pembayaran</button></div>' : '') + '</fieldset>' +
            '<fieldset class="ly-card"><legend>WhatsApp ke pembeli</legend>' + (adaHp && j.status !== 'batal' ? '<label class="ly-cek" style="margin-bottom:12px"><input type="checkbox" id="jl-setuju"><span>Pembeli sudah membalas <b>SETUJU</b> atas ketentuan di WhatsApp</span></label>' : '') + (adaHp ?
                barisWa([].concat(j.status === 'dp' ? [['dp', 'Kirim bukti DP', 'Bukti pesanan + minta SETUJU'], ['pengingat', 'Pengingat pelunasan', 'Ingatkan sisa dan batas bayar']] : [])
                    .concat(j.status === 'lunas' || j.status === 'selesai' ? [['lunas', 'Kirim nota lunas', 'Tautan nota online']] : [])
                    .concat(j.status === 'batal' ? [['batal', 'Kabari pembatalan', 'Rincian uang kembali']] : []), 'wa') +
                kisiAksi([aksi({ href: E(L.urlNotaJual(j.kode)), luar: true, ikon: 'nota', teks: 'Buka nota' })])
                : '<p class="ly-muted" style="margin:0">Tanpa nomor WhatsApp (jual lunas langsung), nota online tidak dibuat.</p>') +
            ((j.pengingat || []).length ? '<p class="ly-hint" style="margin:8px 0 0">Diingatkan: ' + j.pengingat.map(L.tgl).join(', ') + '</p>' : '') + '</fieldset>' +
            (aktif ? '<fieldset class="ly-card"><legend>Status</legend><div class="ly-btns">' +
                (j.status === 'lunas' ? '<button type="button" class="ly-btn ly-btn--pri" id="jl-selesai">Barang sudah diambil / dikirim</button>' : '') +
                '<button type="button" class="ly-btn" id="jl-batal-p">Batal (pembeli)</button><button type="button" class="ly-btn" id="jl-batal-t">Batal (toko)</button></div>' +
                '<p class="ly-hint" style="margin:8px 0 0">Batal oleh pembeli / lewat batas: dipotong ' + C.jual.potonganPersen + '% dari harga barang (maks. sebesar yang sudah dibayar). Batal oleh toko: dikembalikan penuh. Stok kembali tersedia.</p></fieldset>' : '') +
            (owner() ? '<fieldset class="ly-card"><legend>Lainnya</legend>' + kisiAksi([aksi({ id: 'jl-hapus', ikon: 'hapus', teks: 'Hapus transaksi', kelas: 'ly-akt--del' })]) +
            '<p class="ly-hint ly-hint--c">Hapus hanya untuk salah input; stok dikembalikan. Untuk pesanan yang batal, pakai tombol Batal supaya tercatat.</p></fieldset>' : '') +
            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="jl-simpan">Simpan perubahan</button></div></section>';
        if ($('#by-tgl')) { $('#by-tgl').value = L.hariIni(); $('#by-jml').value = h.sisa || ''; $('#jl-batas').value = j.batas_lunas || ''; }
        if ($('#jl-setuju')) $('#jl-setuju').checked = !!j.disetujui;
        gambarBayarJual(); setDirty(false);
        var el = $('#jl');
        el.addEventListener('change', function (e) {
            if (e.target.id === 'jl-setuju') { j.disetujui = e.target.checked ? (j.disetujui || L.hariIni()) : null; setDirty(true); }
            else if (e.target.id === 'jl-batas') { j.batas_lunas = e.target.value; setDirty(true); }
        });
        el.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
            if (d.wa) kirimWaJual(d.wa, b);
            else if (d.delbayar != null) { var by = j.bayar[+d.delbayar]; if (confirm('Hapus pembayaran ' + L.rupiah(by.jumlah) + ' tanggal ' + L.tgl(by.tgl) + '?')) { j.bayar.splice(+d.delbayar, 1); gambarBayarJual(); setDirty(true); } }
            else if (b.id === 'by-tambah') {
                var jml = Math.round(+$('#by-jml').value || 0); if (jml <= 0) return toast('Isi jumlah pembayaran.', true);
                var lunas = L.hitungJual(j).dibayar + jml >= L.hitungJual(j).total;
                j.bayar.push({ id: idAcak(), tgl: $('#by-tgl').value || L.hariIni(), jumlah: jml, jenis: lunas ? 'pelunasan' : 'tambahan', metode: $('#by-metode').value, baru: true });
                gambarBayarJual(); setDirty(true); toast(lunas ? 'Lunas! Tekan Simpan, lalu kirim nota lunas.' : 'Pembayaran dicatat. Tekan Simpan.');
            }
            else if (b.id === 'jl-selesai') { if (L.hitungJual(j).sisa > 0 && !confirm('Masih ada sisa pembayaran. Tetap tandai selesai?')) return; j.status = 'selesai'; simpanJualIni(); }
            else if (b.id === 'jl-batal-p' || b.id === 'jl-batal-t') batalJual(b.id === 'jl-batal-t' ? 'toko' : 'pembeli');
            else if (b.id === 'jl-simpan') simpanJualIni();
            else if (b.id === 'jl-hapus') { if (konfirmasiKode((j.status === 'selesai' ? 'Barang ini SUDAH diserahkan ke pembeli. Hapus hanya bila transaksi ini salah input: stok akan bertambah kembali. ' : 'Hapus transaksi ini? Stok dikembalikan. ') + 'Nota online juga dihapus.', j.kode)) hapusData('jual', j, b, function (r) { return A.hapusJual(r).then(function () { cache.stok = A.daftar('stok'); }); }, 'Transaksi dihapus.'); }
        });
    }
    function gambarBayarJual() {
        var j = jl.j, el = $('#jl-bayar'); if (!el) return;
        var NAMA = { dp: 'DP', tambahan: 'Pembayaran', pelunasan: 'Pelunasan', refund: 'Dikembalikan' }, METODE = NAMA_METODE;
        el.innerHTML = j.bayar.length ? j.bayar.map(function (b, n) {
            return '<div><span>' + NAMA[b.jenis] + ' · ' + L.tgl(b.tgl) + ' · ' + (METODE[b.metode] || b.metode) + (b.baru ? ' <small class="ly-muted">(belum disimpan)</small>' : '') + '</span><b>' + (b.jenis === 'refund' ? '−' : '') + L.rupiah(b.jumlah) + '</b>' +
                (j.status === 'dp' || b.baru ? '<button type="button" class="ly-x" data-delbayar="' + n + '" aria-label="Hapus pembayaran">×</button>' : '') + '</div>';
        }).join('') : '<p class="ly-muted">Belum ada pembayaran.</p>';
    }
    function batalJual(oleh) {
        var j = jl.j, uji = Object.assign({}, j, { batal_oleh: oleh }), h = L.hitungJual(uji);
        /* uang dikembalikan lewat cara yang sama dengan pembayaran terakhir (tunai/transfer/QRIS), supaya hitungan kas laci tetap benar */
        var metodeAsal = (j.bayar.filter(function (b) { return b.jenis !== 'refund'; }).slice(-1)[0] || {}).metode || 'tunai';
        if (!confirm('Batalkan pesanan ' + j.kode + ' (' + (oleh === 'toko' ? 'oleh toko' : 'oleh pembeli') + ')?\n\nSudah dibayar: ' + L.rupiah(h.dibayar) + '\nPotongan: ' + L.rupiah(h.potongan) + '\nDikembalikan ke pembeli: ' + L.rupiah(h.harusKembali) + (h.harusKembali ? ' (lewat ' + (NAMA_METODE[metodeAsal] || metodeAsal) + ')' : '') + '\n\nStok barang kembali tersedia.')) return;
        j.status = 'batal'; j.batal_oleh = oleh;
        if (h.harusKembali) j.bayar.push({ id: idAcak(), tgl: L.hariIni(), jumlah: h.harusKembali, jenis: 'refund', metode: metodeAsal, baru: true });
        simpanJualIni(function (row) { if (L.hp4(row.hp).length === 4) toast('Pesanan dibatalkan. Kabari pembeli lewat tombol WA.'); });
    }
    function simpanJualIni(lalu) {
        var j = jl.j, rec = Object.assign({}, j, { bayar: j.bayar.map(function (b) { var x = Object.assign({}, b); delete x.baru; return x; }) });
        prosesSimpan('jual', $('#jl-simpan'), 'Menyimpan…', function () { return A.simpanJual(rec); }, function (row) {
            cache.stok = A.daftar('stok'); jl = { baru: false, j: salin(row) }; gambarJual2(); if (lalu) lalu(row); else toast('Tersimpan.');
        }, function (r) { jl.j = r; });
    }
    /* WA: buka dulu (harus langsung dari ketukan); pengingat dicatat di data */
    function kirimWaJual(jenis, btn) {
        if (dirty) return toast('Simpan perubahan dulu, supaya nota yang dilihat pembeli sudah terbaru.', true);
        var j = jl.j; bukaWa(j.hp, L.pesanJual[jenis](j));
        if (jenis !== 'pengingat') return;
        var rec = salin(j); rec.pengingat = (rec.pengingat || []).concat(L.hariIni());
        sibuk(btn, true, 'Mencatat…');
        A.simpanJual(rec).then(function (row) { taruh('jual', row); jl = { baru: false, j: salin(row) }; gambarJual2(); }).catch(function (e) { sibuk(btn, false); gagal(e); });
    }

    /* ================= editor konten website (khusus owner) =================
       Kolom diambil dari elemen bertanda data-edit di halaman (dikelompokkan per data-edit-bagian, satu baris per data-edit-item).
       Hanya kolom yang berubah yang dikirim; Layanan.api.terbitkanHalaman menerapkannya ke versi terbaru halaman di repo. */
    var we = null;
    function halamanWebsite() {
        app.innerHTML = '<section class="ly-f" id="we"><div class="ly-head"><h1 style="flex:1">Website</h1><a class="ly-btn" target="_blank" rel="noopener" href="' + E(L.situs()) + '">Buka website</a></div>' +
            '<p class="ly-muted">Ubah banner promo, teks bagian depan, harga servis, alamat, dan jam buka di halaman depan website. Desain tidak berubah. Tekan <b>Terbitkan</b>; website berubah ±1 menit kemudian.</p>' +
            '<div id="we-isi" class="ly-f"><p class="ly-kosong">Memuat halaman…</p></div>' +
            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum diterbitkan</span><button type="button" class="ly-btn ly-btn--pri" id="we-terbit" disabled>Terbitkan</button></div></section>';
        A.bacaHalaman('index.html').then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html'), bagian = [], per = {}, awal = {};
            [].forEach.call(doc.querySelectorAll('[data-edit]'), function (el) {
                var jenis = el.getAttribute('data-edit-jenis') || 'teks', b = el.closest('[data-edit-bagian]'), nb = b ? b.getAttribute('data-edit-bagian') : 'Lainnya', it = el.closest('[data-edit-item]');
                var f = { kunci: el.getAttribute('data-edit'), jenis: jenis, label: el.getAttribute('data-edit-label') || el.getAttribute('data-edit') };
                awal[f.kunci] = jenis === 'tampil' ? !el.hasAttribute('hidden') : jenis === 'harga' ? +el.getAttribute('value') || 0 : el.textContent.replace(/\s+/g, ' ').trim();
                if (!per[nb]) { per[nb] = { nama: nb, baris: [] }; bagian.push(per[nb]); }
                var baris = per[nb].baris, akhir = baris[baris.length - 1];
                if (it && akhir && akhir.item === it) akhir.f.push(f); else baris.push({ item: it, f: [f] });
            });
            we = { awal: awal, bagian: bagian };
            gambarWebsite();
        }).catch(function (e) { $('#we-isi').innerHTML = '<p class="ly-kosong">' + E(e.message || String(e)) + '</p>'; });
    }
    function kolomWebsite(f) {
        if (f.jenis === 'tampil') return '<label class="ly-cek"><input type="checkbox" data-k="' + E(f.kunci) + '"><span>' + E(f.label) + '</span></label>';
        if (f.jenis === 'harga') return '<label>' + E(f.label) + '<input type="number" inputmode="numeric" min="0" step="5000" data-k="' + E(f.kunci) + '"></label>';
        return '<label>' + E(f.label) + (String(we.awal[f.kunci]).length > 70 ? '<textarea rows="3" data-k="' + E(f.kunci) + '"></textarea>' : '<input data-k="' + E(f.kunci) + '">') + '</label>';
    }
    function gambarWebsite() {
        $('#we-isi').innerHTML = we.bagian.map(function (b) {
            return '<fieldset class="ly-card ly-f"><legend>' + E(b.nama) + '</legend>' + b.baris.map(function (r) {
                return r.item ? '<div class="we-baris">' + r.f.map(kolomWebsite).join('') + '</div>' : r.f.map(kolomWebsite).join('');
            }).join('') + '</fieldset>';
        }).join('') + '<p class="ly-hint ly-hint--c">Harga di sini untuk tampilan website. Harga jasa di kasir & servis POS diatur terpisah.</p>';
        $$('[data-k]', $('#we-isi')).forEach(function (el) { var v = we.awal[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
        var isi = $('#we-isi');
        isi.oninput = isi.onchange = function () { var n = Object.keys(ubahWebsite()).length; $('#we-terbit').disabled = !n; $('#we-terbit').textContent = n ? 'Terbitkan (' + n + ' perubahan)' : 'Terbitkan'; setDirty(n > 0); };
        $('#we-terbit').onclick = terbitkanWebsite;
        setDirty(false);
    }
    function ubahWebsite() {
        var ubah = {};
        $$('[data-k]', $('#we-isi')).forEach(function (el) {
            var k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Math.max(0, Math.round(+el.value || 0)) : el.value.replace(/\s+/g, ' ').trim();
            if (v !== we.awal[k]) ubah[k] = v;
        });
        return ubah;
    }
    function terbitkanWebsite() {
        var ubah = ubahWebsite(), b = $('#we-terbit'), kosong = Object.keys(ubah).filter(function (k) { return ubah[k] === ''; });
        if (!Object.keys(ubah).length) return;
        if (kosong.length && !confirm(kosong.length + ' kolom dikosongkan. Bagian itu akan tampil kosong di website. Lanjutkan?')) return;
        sibuk(b, true, 'Menerbitkan…'); menyimpan = true;
        A.terbitkanHalaman('index.html', ubah).then(function () {
            menyimpan = false; Object.keys(ubah).forEach(function (k) { we.awal[k] = ubah[k]; });
            sibuk(b, false); b.disabled = true; b.textContent = 'Terbitkan'; setDirty(false);
            toast('Terbit. Website berubah ±1 menit lagi.');
        }).catch(function (e) { menyimpan = false; sibuk(b, false); gagal(e); });
    }

    /* ================= sewa gitar (unit used dari stok) ================= */
    var sw = null, filterSw = 'aktif', cariSw = '';
    var SWC = C.sewa;
    function statusSewa(w) { return w.status === 'aktif' && L.infoSewa(w).lewat ? 'telat' : w.status; }
    var CHIP_SEWA = { aktif: 'st-antri', telat: 'st-menunggu_dp', selesai: 'st-selesai', batal: 'st-batal' };
    function chipSewa(w) { var k = statusSewa(w); return '<span class="st-chip ' + CHIP_SEWA[k] + '">' + (k === 'telat' ? 'Telat ' + L.infoSewa(w).hariTelat + ' hari' : E(L.STATUS_SEWA[k] || k)) + '</span>'; }
    function daftarSewa() {
        app.innerHTML = '<section><div class="ly-head"><h1>Sewa gitar</h1><a class="ly-btn ly-btn--pri" href="#sewa/baru">+ Sewa baru</a></div>' +
            '<p class="ly-muted">Gitar used di <a href="#stok">Stok</a> bisa disewakan. Gitar yang sedang disewa tidak muncul di kasir; pengembalian dan deposit dicatat di sini.</p>' +
            '<div class="ly-cari"><input class="ly-in" id="cari" type="search" placeholder="Cari kode, nama penyewa, gitar…" autocomplete="off"></div>' +
            '<div class="ly-filter" id="filter"></div><div class="ly-list" id="list"></div>' +
            '</section>';
        $('#cari').value = cariSw;
        $('#cari').addEventListener('input', function () { cariSw = this.value; gambarDaftarSewa(); });
        $('#filter').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filterSw = b.dataset.f; gambarDaftarSewa(); } });
        gambarDaftarSewa();
    }
    function gambarDaftarSewa() {
        if (!$('#list')) return;
        var rows = cache.sewa, c = cariSw.trim().toLowerCase(), n = { aktif: 0, telat: 0, selesai: 0, semua: rows.length };
        rows.forEach(function (w) { var k = statusSewa(w); if (k === 'aktif' || k === 'telat') n.aktif++; if (k === 'telat') n.telat++; if (k === 'selesai') n.selesai++; });
        $('#filter').innerHTML = [['aktif', 'Sedang disewa'], ['telat', 'Telat'], ['selesai', 'Selesai'], ['semua', 'Semua']].map(function (x) {
            return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (filterSw === x[0]) + '">' + x[1] + ' <span class="ly-n">' + n[x[0]] + '</span></button>';
        }).join('');
        var tampil = rows.filter(function (w) {
            var k = statusSewa(w), ok = filterSw === 'semua' ? true : filterSw === 'aktif' ? (k === 'aktif' || k === 'telat') : k === filterSw;
            return ok && (!c || [w.kode, w.nama, w.hp, w.nama_barang].join(' ').toLowerCase().indexOf(c) > -1);
        });
        $('#list').innerHTML = tampil.length ? tampil.map(function (w) {
            var h = L.hitungSewa(w), i = L.infoSewa(w);
            return '<div class="ly-item"><a class="ly-item__a" href="#sewa/' + E(w.id) + '"><span class="ly-item__k">' + E(w.kode) + '</span></a>' + chipSewa(w) +
                '<span class="ly-item__t">' + E(w.nama) + ' · ' + E(w.nama_barang) + '</span>' +
                '<span class="ly-item__m"><span>' + L.tgl(w.tgl_mulai) + ' → ' + L.tgl(L.batasSewa(w)) + '</span><span>Sewa ' + L.rupiah(h.tarif) + '</span>' +
                (w.status === 'aktif' ? '<span>Deposit ' + L.rupiah(h.ditahan) + '</span>' : '') + (h.masihHutang ? '<span class="ly-warn">Kurang ' + L.rupiah(h.masihHutang) + '</span>' : '') +
                (i.sisa != null && !i.lewat ? '<span>' + (i.sisa ? i.sisa + ' hari lagi' : 'kembali hari ini') + '</span>' : '') + '</span></div>';
        }).join('') : '<p class="ly-kosong">' + (rows.length ? 'Tidak ada di kategori ini.' : 'Belum ada sewa. Tekan “+ Sewa baru”.') + '</p>';
    }
    /* sewa baru: pilih unit (jika belum), lalu isi formulir (#sewa/baru/<id stok>) */
    function sewaBaru(stokId) {
        if (!stokId) return pilihUnitSewa();
        ambilCatatan('stok', stokId, function () { return null; }, formSewa);
    }
    function pilihUnitSewa() {
        var unit = cache.stok.filter(function (s) { return L.bisaDisewa(s, cache.sewa); });
        app.innerHTML = '<section><div class="ly-head"><a class="ly-back" href="#sewa">‹ Sewa gitar</a></div><div class="ly-head"><h1>Pilih gitar</h1></div>' +
            '<p class="ly-muted">Hanya gitar <b>used</b> yang tersedia dan belum sedang disewa.</p><div class="ly-list">' +
            (unit.length ? unit.map(function (s) {
                return '<div class="ly-item"><a class="ly-item__a" href="#sewa/baru/' + E(s.id) + '"><span class="ly-item__k">' + E(s.kode) + '</span></a><span class="ly-item__t">' + E(L.judulStok(s)) + (L.tingkatStok(s) ? ' · ' + E(L.tingkatStok(s)) : '') + '</span>' +
                    '<span class="ly-item__m"><span>Harga jual ' + (s.harga_jual ? L.rupiah(s.harga_jual) : '–') + '</span></span></div>';
            }).join('') : '<p class="ly-kosong">Tidak ada gitar used yang bisa disewakan. Tambahkan di <a href="#stok">Stok</a>.</p>') + '</div></section>';
    }
    function formSewa(s) {
        if (!L.bisaDisewa(s, cache.sewa)) { app.innerHTML = '<p class="ly-kosong">Stok ' + E(s.kode) + ' tidak bisa disewakan (bukan gitar used, habis, ditarik, atau sedang disewa). <a href="#sewa">Kembali</a></p>'; return; }
        var h = L.hariIni(), nama = L.judulStok(s) + (s.warna ? ' (' + s.warna + ')' : '') + ' – Used' + (L.tingkatStok(s) ? ' ' + L.tingkatStok(s) : '');
        sw = { baru: true, antri: [], w: { nama: '', hp: '', stok_id: s.id, stok_kode: s.kode, nama_barang: nama, tgl_mulai: h, hari: 3, biaya_custom: L.tarifStandarUnit(s) ? L.tarifSewa(3) : 0, deposit_rencana: L.depositAwal(s.harga_jual), kondisi_keluar: '', status: 'aktif', bayar: [], foto: [] }, metode: 'tunai', bayarSewa: null, bayarDep: null };
        app.innerHTML = '<section id="sw" class="ly-f"><div class="ly-head"><a class="ly-back" href="#sewa">‹ Sewa gitar</a></div><div class="ly-head"><h1>Sewa baru</h1></div>' +
            '<fieldset class="ly-card ly-f"><legend>Gitar</legend><p style="margin:0"><b>' + E(nama) + '</b><br><small class="ly-muted">' + E(s.kode) + ' · harga jual ' + (s.harga_jual ? L.rupiah(s.harga_jual) : 'belum diisi') + '</small></p></fieldset>' +
            barisWa([['unit', 'Kirim unit &amp; estimasi biaya', 'Poster foto unit + estimasi sewa, deposit, link foto'], ['ketentuan', 'Kirim ketentuan sewa', 'Kirim sekali saja, tidak diulang per unit'], ['formulir', 'Kirim formulir pendaftaran', 'Isian nama, WA, tanggal & lama sewa'], ['bayar', 'Kirim info pembayaran', 'Total bayar di muka + rekening']], 'wa') +
            '<fieldset class="ly-card ly-f"><legend>Penyewa</legend>' + tombolKontak('[data-w="nama"]', '[data-w="hp"]') + '<div class="ly-row2"><label>Nama<input data-w="nama" autocomplete="off"></label><label>No. WhatsApp<input data-w="hp" type="tel" inputmode="tel" autocomplete="off" placeholder="08…"></label></div>' +
            '<p class="ly-hint" style="margin:0">Wajib: bukti sewa dan pengingat dikirim lewat WA.</p></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Sewa</legend><div class="ly-row2"><label>Mulai<input type="date" data-w="tgl_mulai"></label><label>Lama (hari)<input type="number" inputmode="numeric" min="1" max="' + SWC.maksHari + '" data-w="hari"></label></div>' +
            '<div class="ly-btns" id="sw-cepat">' + [1, 2, 3, 7, 14].map(function (d) { return '<button type="button" class="ly-btn ly-btn--sm" data-hari="' + d + '">' + d + ' hari</button>'; }).join('') + '</div>' +
            '<div class="ly-row2"><label>Biaya sewa (Rp)<input type="number" inputmode="numeric" min="0" step="5000" data-w="biaya_custom"></label><label>Deposit (Rp)<input type="number" inputmode="numeric" min="0" step="5000" data-w="deposit_rencana"></label></div>' +
            '<label>Metode bayar<select id="sw-metode">' + opsi([['tunai', 'Tunai'], ['transfer', 'Transfer'], ['qris', 'QRIS']], 'tunai') + '</select></label>' +
            '<p class="ly-hint" style="margin:0">' + (L.tarifStandarUnit(s) ? 'Tarif standar: ' + L.ringkasTarifSewa() + '.' : '<b class="ly-warn">Unit ' + L.rupiah(SWC.batasUnitStandar) + ' ke atas: isi biaya sewa sendiri.</b>') + ' Deposit awal ' + SWC.depositPersen + '% harga gitar. Keduanya bisa diubah. Biaya sewa dan deposit dibayar di muka.</p>' +
            '<div class="ly-row2"><label>Sewa dibayar sekarang (Rp)<input type="number" inputmode="numeric" min="0" step="5000" id="sw-bs"></label><label>Deposit diterima (Rp)<input type="number" inputmode="numeric" min="0" step="50000" id="sw-bd"></label></div>' +
            '<div class="ly-sum" id="sw-sum"></div></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Kondisi saat keluar</legend><label>Catatan kondisi (lecet, bonus tas/kabel, dll.)<textarea data-w="kondisi_keluar" rows="2"></textarea></label><div id="sw-foto"></div>' +
            '<p class="ly-hint" style="margin:0">Foto gitar dari beberapa sisi sebelum diserahkan, supaya jelas bila ada sengketa.' + (owner() ? ' Foto KTP (opsional) hanya disimpan di repo owner dan tidak pernah tampil di situs.' : '') + '</p></fieldset>' +
            '<div class="ly-save"><button type="button" class="ly-btn ly-btn--pri" id="sw-simpan">Simpan sewa</button></div></section>';
        var el = $('#sw'), w = sw.w;
        $$('[data-w]', el).forEach(function (i) { i.value = w[i.dataset.w] == null ? '' : w[i.dataset.w]; });
        function angka(x) { return Math.max(0, Math.round(+x || 0)); }
        function sinkron(dariUbah) {
            if (dariUbah) {
                $$('[data-w]', el).forEach(function (i) { var k = i.dataset.w; w[k] = /^(hari|biaya_custom|deposit_rencana)$/.test(k) ? angka(i.value) : i.value; });
                w.hari = Math.min(+SWC.maksHari || 365, Math.max(1, w.hari || 1)); w.nama = w.nama.trim(); w.hp = w.hp.trim();
            }
            /* biaya & deposit mengikuti tarif standar sampai diubah manual (unit mahal: kosong sampai diisi) */
            if (!sw.biayaManual && L.tarifStandarUnit(s)) w.biaya_custom = L.tarifSewa(w.hari);
            if (!sw.depManual) w.deposit_rencana = L.depositAwal(s.harga_jual);
            ['biaya_custom', 'deposit_rencana'].forEach(function (k) { var i = $('[data-w="' + k + '"]'); if (i !== document.activeElement) i.value = w[k] || ''; });
            var tarif = w.biaya_custom;
            if (sw.bayarSewa == null) $('#sw-bs').value = tarif; if (sw.bayarDep == null) $('#sw-bd').value = w.deposit_rencana;
            $('#sw-sum').innerHTML = '<div><span>' + w.hari + ' hari · kembali paling lambat</span><span>' + L.tgl(L.batasSewa(w)) + '</span></div><div><span>Biaya sewa</span><span>' + L.rupiah(tarif) + '</span></div>' +
                '<div><span>Deposit (dikembalikan)</span><span>' + L.rupiah(w.deposit_rencana) + '</span></div><div class="ly-total"><span>Total dibayar penyewa sekarang</span><span>' + L.rupiah(angka($('#sw-bs').value) + angka($('#sw-bd').value)) + '</span></div>';
            setDirty(true);
        }
        el.addEventListener('input', function (e) {
            if (e.target.id === 'sw-bs') sw.bayarSewa = angka(e.target.value); else if (e.target.id === 'sw-bd') sw.bayarDep = angka(e.target.value);
            else {
                var kk = e.target.dataset.w;
                if (kk === 'hari') { sw.bayarSewa = null; sw.bayarDep = null; }
                else if (kk === 'biaya_custom') { sw.biayaManual = true; sw.bayarSewa = null; sw.bayarDep = null; }
                else if (kk === 'deposit_rencana') { sw.depManual = true; sw.bayarDep = null; }
            }
            sinkron(true);
        });
        el.addEventListener('change', function (e) { if (e.target.id === 'sw-metode') sw.metode = e.target.value; });
        el.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return;
            if (b.dataset.wa === 'unit') bagikanPoster(s, L.pesanSewa.calon.unit(s, w), { sewa: { harian: L.tarifStandarUnit(s) ? L.tarifSewa(1) : 0, deposit: w.deposit_rencana } }, b); /* poster foto unit + teks lewat menu bagikan */
            else if (b.dataset.wa) bukaWa('', L.pesanSewa.calon[b.dataset.wa](s, w)); /* tanpa nomor: kontaknya dipilih di WhatsApp */
            else if (b.dataset.hari) { $('[data-w="hari"]').value = b.dataset.hari; sw.bayarSewa = null; sw.bayarDep = null; sinkron(true); }
            else if (b.dataset.hapusq) { sw.antri = buangQ(sw.antri, b.dataset.hapusq); gambarFotoSewa(); }
            else if (b.id === 'sw-simpan') simpanSewaBaru();
        });
        pilihFoto($('#sw-foto'), function (tahap, files) { antriFoto(sw.antri, files, { tahap: tahap }, gambarFotoSewa); });
        gambarFotoSewa(); sinkron(true); setDirty(false);
    }
    function grupFotoSewa(w, antri) {
        var grup = [['keluar', 'Foto kondisi saat keluar'], ['kembali', 'Foto kondisi saat kembali']];
        if (owner()) grup.push(['ktp', 'Foto KTP (opsional)']);
        /* foto KTP hanya terbaca oleh owner (disimpan di repo owner); karyawan tidak melihatnya */
        return grup.map(function (x) { return grupFoto(x[1], x[0], w.foto, antri, false); }).join('');
    }
    function gambarFotoSewa() {
        var el = $('#sw-foto'); if (!el) return;
        el.innerHTML = grupFotoSewa(sw.w, sw.antri); L.isiFoto(el, sw.w, A.fotoAdmin);
    }
    function simpanSewaBaru() {
        var w = sw.w, bs = Math.max(0, Math.round(+$('#sw-bs').value || 0)), bd = Math.max(0, Math.round(+$('#sw-bd').value || 0)), t = L.tgl(w.tgl_mulai);
        if (!w.nama) return toast('Isi nama penyewa.', true);
        if (L.hp4(w.hp).length < 4) return toast('Isi nomor WhatsApp penyewa.', true);
        if (!(w.biaya_custom > 0)) return toast('Isi biaya sewa.', true);
        if (bs < w.biaya_custom && !confirm('Biaya sewa dibayar (' + L.rupiah(bs) + ') kurang dari ' + L.rupiah(w.biaya_custom) + '. Aturan toko: sewa dibayar di muka. Tetap simpan?')) return;
        if (!w.tgl_mulai) return toast('Isi tanggal mulai.', true);
        if (sw.antri.some(function (q) { return !q.hasil; })) return toast('Foto masih diproses, tunggu sebentar.', true);
        if (!w.deposit_rencana && !confirm('Deposit Rp0. Tetap sewakan tanpa deposit?')) return;
        if (bd < w.deposit_rencana && !confirm('Deposit diterima (' + L.rupiah(bd) + ') kurang dari yang direncanakan (' + L.rupiah(w.deposit_rencana) + '). Tetap simpan?')) return;
        var rec = salin(w); rec.bayar = [];
        if (bs) rec.bayar.push({ id: idAcak(), tgl: w.tgl_mulai, jumlah: bs, jenis: 'sewa', metode: sw.metode });
        if (bd) rec.bayar.push({ id: idAcak(), tgl: w.tgl_mulai, jumlah: bd, jenis: 'deposit', metode: sw.metode });
        var fotoBaru = sw.antri.map(function (q) { return { hasil: q.hasil, tahap: q.tahap }; });
        prosesSimpan('sewa', $('#sw-simpan'), teksUnggah(sw.antri), function () { return A.simpanSewa(rec, fotoBaru); }, function (row) {
            lepasAntri(sw.antri); toast('Sewa tersimpan (' + row.kode + ') mulai ' + t + '. Kirim bukti & ketentuan ke penyewa lewat WA.'); pindah('#sewa/' + row.id);
        }, function (r) { sw.w = r; });
    }

    function bukaSewa(id) { ambilCatatan('sewa', id, function () { return null; }, function (w) { w.bayar = w.bayar || []; w.foto = w.foto || []; sw = { baru: false, w: w, antri: [], selesai: false }; gambarSewa2(); }); }
    function gambarSewa2() {
        var w = sw.w, h = L.hitungSewa(w), i = L.infoSewa(w), aktif = w.status === 'aktif', stok = cariId('stok', w.stok_id);
        app.innerHTML = '<section id="sw" class="ly-f"><div class="ly-head"><a class="ly-back" href="#sewa">‹ Sewa gitar</a></div>' +
            '<div class="ly-head"><h1>' + E(w.nama) + '</h1>' + chipSewa(w) + '</div>' + kodeBaris(w) +
            '<fieldset class="ly-card"><legend>Gitar &amp; jadwal</legend><div class="ly-sum">' +
            '<div><span>Gitar</span><span>' + (stok ? '<a href="#stok/' + E(stok.id) + '">' + E(w.nama_barang) + '</a>' : E(w.nama_barang)) + '</span></div>' +
            '<div><span>Mulai</span><span>' + L.tgl(w.tgl_mulai) + '</span></div>' +
            (aktif ? '<div><span>Kembali paling lambat</span><span' + (i.lewat ? ' class="ly-telat"' : '') + '>' + L.tgl(L.batasSewa(w)) + (i.lewat ? ' (telat ' + i.hariTelat + ' hari)' : i.sisa ? ' (' + i.sisa + ' hari lagi)' : ' (hari ini)') + '</span></div>'
                : '<div><span>Dikembalikan</span><span>' + L.tgl(w.tgl_kembali) + '</span></div>') +
            '<div><span>Lama sewa ditagih</span><span>' + h.hari + ' hari' + (h.hari > w.hari ? ' (dipesan ' + w.hari + ')' : '') + '</span></div>' +
            '<div><span>Biaya sewa dipesan (' + w.hari + ' hari)</span><span>' + L.rupiah(w.biaya_custom != null ? w.biaya_custom : L.tarifSewa(w.hari)) + '</span></div>' +
            '<div><span>No. WhatsApp</span><span>' + E(w.hp) + '</span></div></div>' +
            (aktif ? '<div class="ly-row2" style="margin-top:10px;align-items:end"><label>Perpanjang (hari)<input type="number" inputmode="numeric" min="1" max="' + SWC.maksHari + '" id="sw-perp" value="1"></label><button type="button" class="ly-btn" id="sw-perpanjang">Perpanjang</button></div>' : '') + '</fieldset>' +
            '<fieldset class="ly-card"><legend>Uang</legend><div class="ly-sum">' +
            '<div><span>Biaya sewa (' + h.hari + ' hari)</span><span>' + L.rupiah(h.tarif) + '</span></div>' +
            (h.gantiRugi ? '<div><span>Denda &amp; ganti rugi' + (w.ket_ganti_rugi ? '<br><small>' + E(w.ket_ganti_rugi) + '</small>' : '') + '</span><span>' + L.rupiah(h.gantiRugi) + '</span></div>' : '') +
            '<div><span>Sudah dibayar (sewa)</span><span>' + L.rupiah(h.dibayar) + '</span></div>' +
            '<div><span>Deposit ' + (aktif ? 'ditahan' : 'diterima') + '</span><span>' + L.rupiah(aktif ? h.ditahan : h.deposit) + '</span></div>' +
            '<div class="ly-total"><span>' + (aktif ? 'Kurang bayar sewa saat ini' : 'Masih harus dibayar penyewa') + '</span><span' + ((aktif ? h.kurang : h.masihHutang) ? ' class="ly-telat"' : '') + '>' + L.rupiah(aktif ? h.kurang : h.masihHutang) + '</span></div></div>' +
            '<div class="ly-bayar" id="sw-bayar" style="margin-top:10px"></div>' +
            (aktif || h.masihHutang ? '<div class="ly-f" style="margin-top:10px"><div class="ly-row2"><label>Jumlah (Rp)<input type="number" inputmode="numeric" min="0" step="5000" id="by-jml"></label>' +
                '<label>Jenis<select id="by-jenis">' + opsi(aktif ? [['sewa', 'Biaya sewa'], ['deposit', 'Deposit']] : [['sewa', 'Biaya sewa']], 'sewa') + '</select></label></div>' +
                '<div class="ly-row2"><label>Metode<select id="by-metode">' + opsi([['tunai', 'Tunai'], ['transfer', 'Transfer'], ['qris', 'QRIS']], 'tunai') + '</select></label><label>Tanggal<input type="date" id="by-tgl"></label></div>' +
                '<button type="button" class="ly-btn" id="by-tambah">Catat pembayaran</button></div>' : '') + '</fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Kondisi &amp; foto</legend>' +
            '<label>Kondisi saat keluar<textarea data-w="kondisi_keluar" rows="2"></textarea></label>' + '<label>Kondisi saat kembali<textarea data-w="kondisi_kembali" rows="2"></textarea></label>' +
            '<div id="sw-foto"></div>' + (owner() ? '' : '<p class="ly-hint" style="margin:0">Foto KTP hanya terlihat oleh owner.</p>') + '</fieldset>' +
            '<fieldset class="ly-card"><legend>WhatsApp ke penyewa</legend>' + barisWa([['mulai', 'Kirim bukti &amp; ketentuan', 'Rincian sewa + minta SETUJU']].concat(aktif ? [['pengingat', 'Pengingat kembali', i.lewat ? 'Sudah telat, ingatkan' : 'Ingatkan batas kembali']] : [['selesai', 'Kabari pengembalian', 'Rincian deposit dikembalikan']]), 'wa') +
            ((w.pengingat || []).length ? '<p class="ly-hint" style="margin:8px 0 0">Diingatkan: ' + w.pengingat.map(L.tgl).join(', ') + '</p>' : '') +
            kisiAksi([aksi({ id: 'sw-cetak', ikon: 'cetak', teks: 'Cetak bukti sewa 58 mm' })]) + '</fieldset>' +
            (aktif ? '<fieldset class="ly-card" id="sw-selesai-box"><legend>Gitar dikembalikan</legend>' + (sw.selesai ? '' : '<button type="button" class="ly-btn ly-btn--pri" id="sw-selesai">Gitar sudah dikembalikan</button>' +
                '<p class="ly-hint" style="margin:8px 0 0">Periksa kondisi gitar dulu, lalu hitung deposit yang dikembalikan.</p>') + '<div id="sw-selesai-isi"></div></fieldset>' : '') +
            (owner() ? '<fieldset class="ly-card"><legend>Lainnya</legend>' + kisiAksi([aksi({ id: 'sw-hapus', ikon: 'hapus', teks: 'Hapus catatan sewa', kelas: 'ly-akt--del' })]) +
                '<p class="ly-hint ly-hint--c">Hapus hanya untuk salah input; foto ikut terhapus.</p></fieldset>' : '') +
            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="sw-simpan">Simpan perubahan</button></div></section>';
        $$('[data-w]', $('#sw')).forEach(function (x) { x.value = w[x.dataset.w] || ''; });
        if ($('#by-tgl')) { $('#by-tgl').value = L.hariIni(); $('#by-jml').value = (aktif ? h.kurang : h.masihHutang) || ''; }
        gambarBayarSewa(); gambarFotoSewa(); setDirty(false);
        if (sw.selesai) panelSelesaiSewa();
        var el = $('#sw');
        el.addEventListener('input', function (e) { var k = e.target.dataset.w; if (k) { w[k] = e.target.value; setDirty(true); } });
        pilihFoto($('#sw-foto'), function (tahap, files) { antriFoto(sw.antri, files, { tahap: tahap }, gambarFotoSewa); });
        el.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
            if (d.wa) kirimWaSewa(d.wa, b);
            else if (d.hapusfoto) { if (confirm('Hapus foto ini? (terhapus permanen saat Simpan)')) { w.foto = w.foto.filter(function (f) { return f.id !== d.hapusfoto; }); gambarFotoSewa(); setDirty(true); } }
            else if (d.hapusq) { sw.antri = buangQ(sw.antri, d.hapusq); gambarFotoSewa(); }
            else if (d.delbayar != null) { var by = w.bayar[+d.delbayar]; if (confirm('Hapus pembayaran ' + L.rupiah(by.jumlah) + ' tanggal ' + L.tgl(by.tgl) + '?')) { w.bayar.splice(+d.delbayar, 1); gambarBayarSewa(); setDirty(true); } }
            else if (b.id === 'by-tambah') {
                var jml = Math.round(+$('#by-jml').value || 0); if (jml <= 0) return toast('Isi jumlah pembayaran.', true);
                w.bayar.push({ id: idAcak(), tgl: $('#by-tgl').value || L.hariIni(), jumlah: jml, jenis: $('#by-jenis').value, metode: $('#by-metode').value, baru: true });
                gambarBayarSewa(); setDirty(true); toast('Pembayaran dicatat. Tekan Simpan.');
            }
            else if (b.id === 'sw-perpanjang') {
                var n = Math.round(+$('#sw-perp').value || 0); if (n < 1) return toast('Isi jumlah hari perpanjangan.', true);
                var tambah = L.tarifSewa(w.hari + n) - L.tarifSewa(w.hari);
                if (!confirm('Perpanjang ' + n + ' hari? Kembali paling lambat jadi ' + L.tgl(L.tambahHari(L.batasSewa(w), n)) + '. Biaya tambahan ' + L.rupiah(tambah) + '.')) return;
                w.hari += n; if (w.biaya_custom != null) w.biaya_custom = (+w.biaya_custom || 0) + tambah; simpanSewaIni(function () { toast('Diperpanjang. Catat pembayaran tambahan bila sudah dibayar.'); });
            }
            else if (b.id === 'sw-selesai') { if (dirty) return toast('Simpan perubahan dulu.', true); sw.selesai = true; b.hidden = true; panelSelesaiSewa(); }
            else if (b.id === 'sw-cetak') cetakBaris(L.strukSewa(w));
            else if (b.id === 'sw-simpan') simpanSewaIni();
            else if (b.id === 'sw-hapus') { if (konfirmasiKode('Hapus catatan sewa ini beserta fotonya? Hanya untuk salah input.', w.kode)) hapusData('sewa', w, b, A.hapusSewa, 'Catatan sewa dihapus.'); }
        });
    }
    function gambarBayarSewa() {
        var w = sw.w, el = $('#sw-bayar'); if (!el) return;
        var NAMA = { sewa: 'Biaya sewa', deposit: 'Deposit', deposit_potong: 'Deposit dipotong', deposit_kembali: 'Deposit dikembalikan' };
        el.innerHTML = w.bayar.length ? w.bayar.map(function (b, n) {
            return '<div><span>' + NAMA[b.jenis] + ' · ' + L.tgl(b.tgl) + ' · ' + (NAMA_METODE[b.metode] || b.metode) + (b.baru ? ' <small class="ly-muted">(belum disimpan)</small>' : '') + '</span><b>' + (b.jenis === 'deposit_kembali' ? '−' : '') + L.rupiah(b.jumlah) + '</b>' +
                (b.baru ? '<button type="button" class="ly-x" data-delbayar="' + n + '" aria-label="Hapus pembayaran">×</button>' : '') + '</div>';
        }).join('') : '<p class="ly-muted">Belum ada pembayaran.</p>';
    }
    /* hitung penutupan sewa: tagihan yang belum terbayar & ganti rugi diambil dari deposit, sisanya dikembalikan */
    function panelSelesaiSewa() {
        var w = sw.w, el = $('#sw-selesai-isi'); if (!el) return;
        var metodeDep = (w.bayar.filter(function (b) { return b.jenis === 'deposit'; })[0] || {}).metode || 'tunai';
        el.innerHTML = '<div class="ly-f"><div class="ly-row2"><label>Tanggal kembali<input type="date" id="sl-tgl"></label><label>Senar putus (buah, ' + L.rupiah(SWC.dendaSenar) + ' per senar, maks ' + SWC.senarCadangan + ' = ' + L.rupiah(SWC.dendaSenar * SWC.senarCadangan) + ')<input type="number" inputmode="numeric" min="0" max="' + SWC.senarCadangan + '" id="sl-senar" value="0"></label></div>' +
            '<div class="ly-row2"><label>Kerusakan lain (Rp)<input type="number" inputmode="numeric" min="0" step="10000" id="sl-rugi"></label><label>Keterangan kerusakan lain<input id="sl-ket" placeholder="mis. lecet di body"></label></div>' +
            '<label>Deposit dikembalikan lewat<select id="sl-metode">' + opsi([['tunai', 'Tunai'], ['transfer', 'Transfer'], ['qris', 'QRIS']], metodeDep) + '</select></label>' +
            '<div class="ly-sum" id="sl-sum"></div><button type="button" class="ly-btn ly-btn--pri" id="sl-ok">Selesaikan sewa</button></div>';
        $('#sl-tgl').value = L.hariIni();
        function hitung() {
            var t = Object.assign({}, w, { status: 'selesai', tgl_kembali: $('#sl-tgl').value || L.hariIni(), ganti_rugi: Math.max(0, Math.round(+$('#sl-senar').value || 0)) * (+SWC.dendaSenar || 0) + Math.max(0, Math.round(+$('#sl-rugi').value || 0)) }), h = L.hitungSewa(t);
            $('#sl-sum').innerHTML = '<div><span>Biaya sewa (' + h.hari + ' hari)</span><span>' + L.rupiah(h.tarif) + '</span></div>' + (h.gantiRugi ? '<div><span>Denda senar &amp; ganti rugi</span><span>' + L.rupiah(h.gantiRugi) + '</span></div>' : '') +
                '<div><span>Sudah dibayar</span><span>' + L.rupiah(h.dibayar) + '</span></div><div><span>Deposit ditahan</span><span>' + L.rupiah(h.ditahan) + '</span></div>' +
                '<div><span>Dipotong dari deposit</span><span>' + L.rupiah(h.potongDeposit) + '</span></div>' +
                '<div class="ly-total"><span>Deposit dikembalikan ke penyewa</span><span>' + L.rupiah(h.harusKembali) + '</span></div>' +
                (h.masihHutang ? '<div><span class="ly-warn">Masih harus dibayar penyewa</span><span class="ly-telat">' + L.rupiah(h.masihHutang) + '</span></div>' : '');
            return { t: t, h: h };
        }
        ['#sl-tgl', '#sl-senar', '#sl-rugi'].forEach(function (id) { $(id).addEventListener('input', hitung); }); hitung();
        $('#sl-ok').addEventListener('click', function () {
            var x = hitung(), t = x.t, h = x.h;
            if (t.tgl_kembali < w.tgl_mulai) return toast('Tanggal kembali tidak valid.', true);
            if (!confirm('Selesaikan sewa ' + w.kode + '? Deposit dikembalikan ' + L.rupiah(h.harusKembali) + (h.potongDeposit ? ', dipotong ' + L.rupiah(h.potongDeposit) : '') + '.')) return;
            w.status = 'selesai'; w.tgl_kembali = t.tgl_kembali; w.ganti_rugi = t.ganti_rugi; w.senar_putus = Math.max(0, Math.round(+$('#sl-senar').value || 0));
            w.ket_ganti_rugi = [w.senar_putus ? 'senar putus ' + w.senar_putus : '', $('#sl-ket').value.trim()].filter(Boolean).join(', ');
            if (h.potongDeposit > 0) w.bayar.push({ id: idAcak(), tgl: t.tgl_kembali, jumlah: h.potongDeposit, jenis: 'deposit_potong', metode: metodeDep });
            if (h.harusKembali > 0) w.bayar.push({ id: idAcak(), tgl: t.tgl_kembali, jumlah: h.harusKembali, jenis: 'deposit_kembali', metode: $('#sl-metode').value });
            sw.selesai = false; simpanSewaIni(function () { toast('Sewa selesai. Kabari penyewa lewat tombol WA.'); });
        });
    }
    function simpanSewaIni(lalu) {
        if (sw.antri.some(function (q) { return !q.hasil; })) return toast('Foto masih diproses, tunggu sebentar.', true);
        var w = sw.w, rec = Object.assign({}, w, { bayar: w.bayar.map(function (b) { var x = Object.assign({}, b); delete x.baru; return x; }) });
        var fotoBaru = sw.antri.map(function (q) { return { hasil: q.hasil, tahap: q.tahap }; });
        prosesSimpan('sewa', $('#sw-simpan'), teksUnggah(sw.antri), function () { return A.simpanSewa(rec, fotoBaru); }, function (row) {
            lepasAntri(sw.antri); sw = { baru: false, w: salin(row), antri: [], selesai: false }; gambarSewa2(); if (lalu) lalu(row); else toast('Tersimpan.');
        }, function (r) { sw.w = r; });
    }
    /* WA: buka dulu (harus langsung dari ketukan); pengingat dicatat di data */
    function kirimWaSewa(jenis, btn) {
        if (dirty) return toast('Simpan perubahan dulu, supaya pesan yang dikirim sudah terbaru.', true);
        var w = sw.w; bukaWa(w.hp, L.pesanSewa[jenis](w));
        if (jenis !== 'pengingat') return;
        var rec = salin(w); rec.pengingat = (rec.pengingat || []).concat(L.hariIni());
        sibuk(btn, true, 'Mencatat…');
        A.simpanSewa(rec).then(function (row) { taruh('sewa', row); sw = { baru: false, w: salin(row), antri: [], selesai: false }; gambarSewa2(); }).catch(function (e) { sibuk(btn, false); gagal(e); });
    }

    /* ================= stok gitar (baru & bekas) ================= */
    function bulanIni() { return L.hariIni().slice(0, 7); }
    /* tombol di kartu stok: Sewa (gitar used yang bisa disewa) dan Bagikan (poster & penawaran jual) */
    /* aksesoris: kolom "warna" dipakai untuk varian (tipe, ukuran, tension, warna); semua aksesoris baru */
    var LBL_VARIAN = 'Varian / tipe (opsional)', PH_VARIAN = 'mis. Nylon Klasik Hard Tension, ukuran 11-52';
    function tombolKartuStok(s) {
        var b = (L.bisaDisewa(s, cache.sewa) ? '<button type="button" class="ly-btn ly-btn--sm" data-sewa="' + E(s.id) + '">Sewa</button>' : '') +
            (adaStok(s) && s.harga_jual ? '<button type="button" class="ly-btn ly-btn--sm" data-tawar="' + E(s.id) + '">Bagikan</button>' : '');
        return b ? '<span class="ly-item__b">' + b + '</span>' : '';
    }
    function daftarStok() {
        app.innerHTML = '<section><div class="ly-head"><h1>Stok</h1><a class="ly-btn" href="#opname">Stock opname</a><a class="ly-btn ly-btn--pri" href="#stok/baru">+ Tambah stok</a></div>' +
            '<p class="ly-muted">Barang tersedia yang berharga jual dan berlabel 🌐 tampil di <a href="' + E(L.situs()) + 'katalog.html" target="_blank">katalog website</a> (±1 menit setelah disimpan).</p>' +
            '<div class="ly-sum ly-card" id="sk-rekap" style="margin:0"></div>' +
            '<div class="ly-cari"><input class="ly-in" id="cari" type="search" placeholder="Cari kode, nama, merk, warna, no. seri…" autocomplete="off"></div>' +
            '<div class="ly-filter" id="filter"></div><div class="ly-list" id="list"></div></section>';
        $('#cari').value = cariSk;
        $('#cari').addEventListener('input', function () { cariSk = this.value; gambarDaftarStok(); });
        $('#filter').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filterSk = b.dataset.f; gambarDaftarStok(); } });
        $('#list').addEventListener('click', function (e) { var sb = e.target.closest('[data-sewa]'); if (sb) { e.preventDefault(); pindah('#sewa/baru/' + sb.dataset.sewa); return; } var b = e.target.closest('[data-tawar]'); if (b) { e.preventDefault(); bagikanStok(cariId('stok', b.dataset.tawar), b); } });
        gambarDaftarStok();
    }
    function adaStok(s) { return s.status === 'tersedia' || s.status === 'dipesan'; }
    function kelStok(s) { return s.kategori === 'aksesoris' ? 'aksesoris' : s.kondisi; }
    function chipStok(s) {
        var aks = s.kategori === 'aksesoris';
        return '<span class="st-chip ' + (aks ? 'st-menunggu_dp' : s.kondisi === 'baru' ? 'st-antri' : 'st-dikerjakan') + '">' + (aks ? 'Aksesoris' : L.KONDISI[s.kondisi] + (L.tingkatStok(s) ? ' ' + L.tingkatStok(s) : '')) + ' · ' + L.STATUS_STOK[s.status] + '</span>';
    }
    function gambarDaftarStok() {
        if (!$('#list')) return;
        var rows = cache.stok, bln = bulanIni(), hari = L.hariIni(), c = cariSk.trim().toLowerCase();
        var unit = { baru: 0, bekas: 0, aksesoris: 0 }, n = { tersedia: 0, baru: 0, bekas: 0, aksesoris: 0, terjual: 0 }, modal = 0, potensi = 0, tanpaHarga = 0, terjualUnit = 0, untung = 0, diWeb = 0;
        rows.forEach(function (s) {
            if (adaStok(s)) {
                var kel = kelStok(s);
                n.tersedia++; n[kel] = (n[kel] || 0) + 1;
                unit[kel] = (unit[kel] || 0) + (+s.jumlah || 0); modal += (+s.jumlah || 0) * (+s.harga_beli || 0); if (L.diKatalog(s)) diWeb++;
                if (+s.harga_jual > 0) potensi += (+s.jumlah || 0) * (s.harga_jual - (+s.harga_beli || 0)); else tanpaHarga++;
            }
            if ((s.penjualan || []).length) n.terjual++;
            (s.penjualan || []).forEach(function (p) { if (String(p.tgl).slice(0, 7) === bln) { terjualUnit += p.qty; untung += (p.harga - (+s.harga_beli || 0)) * p.qty; } });
        });
        $('#sk-rekap').innerHTML = '<div><span>Stok tersedia</span><span>' + (unit.baru + unit.bekas + unit.aksesoris) + ' unit</span></div>' +
            '<div><span>&nbsp; gitar baru / bekas / aksesoris</span><span>' + unit.baru + ' / ' + unit.bekas + ' / ' + unit.aksesoris + '</span></div>' +
            '<div><span>Tampil di katalog website</span><span>' + diWeb + ' barang</span></div>' +
            (owner() ? '<div><span>Modal di stok</span><span>' + L.rupiah(modal) + '</span></div><div><span>Perkiraan untung bila semua terjual' + (tanpaHarga ? '<br><small class="ly-warn">' + tanpaHarga + ' barang belum ada harga jual</small>' : '') + '</span><span>' + L.rupiah(potensi) + '</span></div>' : '') +
            '<div class="ly-total"><span>Terjual bulan ini</span><span>' + terjualUnit + ' unit' + (owner() ? ' · untung ' + L.rupiah(untung) : '') + '</span></div>';
        $('#filter').innerHTML = [['tersedia', 'Tersedia'], ['baru', 'Gitar baru'], ['bekas', 'Gitar used'], ['aksesoris', 'Aksesoris'], ['terjual', 'Terjual'], ['semua', 'Semua']].map(function (x) {
            return '<button type="button" data-f="' + x[0] + '" aria-pressed="' + (filterSk === x[0]) + '">' + x[1] + '<b>' + (x[0] === 'semua' ? rows.length : n[x[0]] || 0) + '</b></button>';
        }).join('');
        var hasil = rows.filter(function (s) {
            var ok = filterSk === 'semua' ? true : filterSk === 'terjual' ? (s.penjualan || []).length > 0 : filterSk === 'tersedia' ? adaStok(s) : adaStok(s) && kelStok(s) === filterSk;
            return ok && (!c || [s.kode, s.nama, s.sub, s.gitar_jenis, s.gitar_merk, s.warna, s.no_seri, s.deskripsi].join(' ').toLowerCase().indexOf(c) > -1);
        });
        $('#list').innerHTML = hasil.length ? hasil.map(function (s) {
            var u = L.untungStok(s), lama = L.hariAntara(s.tgl_masuk, hari);
            return '<div class="ly-item"><a class="ly-item__a" href="#stok/' + E(s.id) + '"><span class="ly-item__k">' + E(s.kode) + (L.diKatalog(s) ? ' 🌐' : '') + '</span></a>' + chipStok(s) +
                '<span class="ly-item__t">' + E(L.jenisStok(s)) + ' · ' + E(L.namaStok(s)) + (s.warna ? ' · ' + E(s.warna) : '') + '</span>' +
                '<span class="ly-item__m">' + (owner() ? '<span>Modal ' + L.rupiah(s.harga_beli) + '</span>' : '') + '<span>Jual ' + (s.harga_jual ? L.rupiah(s.harga_jual) : '<span class="ly-warn">belum diisi</span>') + '</span>' +
                (adaStok(s) ? '<span>Stok ' + s.jumlah + '</span><span' + (lama > 90 ? ' class="ly-telat"' : '') + '>Masuk ' + (lama > 0 ? lama + ' hari lalu' : 'hari ini') + '</span>' : '') +
                (u.unitTerjual ? '<span>Terjual ' + u.unitTerjual + (owner() ? ' · untung ' + L.rupiah(u.untung) : '') + '</span>' : '') + '</span>' +
                tombolKartuStok(s) + '</div>';
        }).join('') : '<p class="ly-kosong">' + (rows.length ? 'Tidak ada di kategori ini.' : 'Belum ada stok. Tekan “+ Tambah stok”.') + '</p>';
    }
    function teksTawar(s) {
        var judul = L.judulStok(s);
        return judul + (s.warna ? ' (' + s.warna + ')' : '') + ' – ' + (s.kondisi === 'bekas' ? 'USED' + (L.tingkatStok(s) ? ' (' + L.tingkatStok(s) + ')' : '') : 'BARU') + '\n' +
            (s.deskripsi ? s.deskripsi + '\n' : '') + 'Harga: ' + L.rupiah(s.harga_jual) + '\n\nTersedia di ' + C.toko.nama + ', ' + C.toko.alamat +
            (L.diKatalog(s) ? '\nLihat foto & detail: ' + L.urlUnit(s.kode) : '') +
            '\nTanya / pesan: https://wa.me/' + C.toko.wa;
    }
    /* ---------- poster penawaran (gambar 1080×1920, pas untuk Story) + menu Bagikan ---------- */
    function gambarDari(b) { return new Promise(function (ok, gagal) { var u = URL.createObjectURL(b), im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { gagal(new Error('foto rusak')); }; im.src = u; }); }
    function muatGambar(url, cache) {
        return fetch(url, { cache: cache || 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('foto ' + r.status); return r.blob(); }).then(gambarDari);
    }
    /* foto produk untuk poster: dibaca lewat GitHub (langsung benar begitu diunggah, tanpa menunggu situs selesai dibangun);
       bila gagal, dicoba dari situs dengan pengecekan ulang (cache 'force-cache' bisa menyimpan 404 dari sebelum situs selesai dibangun) */
    function muatFotoPoster(s, f) {
        return A.fotoBlob(s, f, true).then(gambarDari).catch(function () { return muatGambar(L.situs() + f.path, 'no-cache'); })
            .catch(function () { throw new Error('Foto produk belum bisa dimuat. Periksa internet lalu coba lagi.'); });
    }
    function barisTeks(c, teks, lebar, maks) {
        var kata = String(teks || '').replace(/\s+/g, ' ').trim().split(' '), baris = [], cur = '';
        kata.forEach(function (k) { var t = cur ? cur + ' ' + k : k; if (c.measureText(t).width > lebar && cur) { baris.push(cur); cur = k; } else cur = t; });
        if (cur) baris.push(cur);
        if (baris.length > maks) { baris = baris.slice(0, maks); var l = baris[maks - 1]; while (l.length > 1 && c.measureText(l + '…').width > lebar) l = l.slice(0, -1); baris[maks - 1] = l + '…'; }
        return baris;
    }
    function rect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    /* opsi.sewa = { harian: tarif 1 hari (0 = sesuai lama sewa), deposit } membuat poster penawaran SEWA dengan foto unit */
    function buatPoster(s, opsi) {
        var sewa = opsi && opsi.sewa;
        var fp = (s.foto || []).filter(function (f) { return f.repo === 'publik'; })[0];
        var judul = L.judulStok(s);
        var fonts = Promise.all(['700 70px Fraunces', '700 40px "Plus Jakarta Sans"'].map(function (f) { return document.fonts && document.fonts.load ? document.fonts.load(f) : null; }));
        fonts = Promise.race([fonts, new Promise(function (ok) { setTimeout(ok, 1200); })]).catch(function () {});
        var foto = fp ? muatFotoPoster(s, fp) : Promise.resolve(null);
        return Promise.all([foto, muatGambar(L.situs() + 'logo/ayri-logo-putih.svg').catch(function () { return null; }), fonts]).then(function (r) {
            var cv = document.createElement('canvas'), W = 1080, H = 1920, EMAS = '#E0A95C', SERIF = 'Fraunces, Georgia, serif', SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
            cv.width = W; cv.height = H;
            var c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, H), wa = '0' + String(C.toko.wa).slice(2), jenis = s.kategori === 'aksesoris' ? (s.sub || 'Aksesoris') : (L.tingkatStok(s) || (sewa ? 'USED' : ''));
            wa = wa.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3'); c.textBaseline = 'alphabetic';
            g.addColorStop(0, '#1d1812'); g.addColorStop(1, '#0d0a07'); c.fillStyle = g; c.fillRect(0, 0, W, H);
            var gl = c.createRadialGradient(W / 2, 620, 60, W / 2, 620, 760); gl.addColorStop(0, 'rgba(224,169,92,.20)'); gl.addColorStop(1, 'rgba(224,169,92,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, 1300);
            /* foto: muat utuh (tidak terpotong), dipusatkan. Area teks Story: sisakan ±250 px atas & bawah */
            var fx = 60, fy = 250, fw = 960, fh = 740;
            if (r[0]) {
                var im = r[0], k = Math.min(fw / im.width, fh / im.height), w = im.width * k, h = im.height * k, x0 = fx + (fw - w) / 2, y0 = fy + (fh - h) / 2;
                c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 50; c.shadowOffsetY = 18; rect(c, x0, y0, w, h, 40); c.fillStyle = '#000'; c.fill(); c.restore();
                c.save(); rect(c, x0, y0, w, h, 40); c.clip(); c.drawImage(im, x0, y0, w, h); c.restore();
                rect(c, x0, y0, w, h, 40); c.strokeStyle = 'rgba(224,169,92,.55)'; c.lineWidth = 3; c.stroke();
            }
            else if (r[1]) { var lw = 240, lh = lw * r[1].height / r[1].width; c.globalAlpha = .25; c.drawImage(r[1], fx + (fw - lw) / 2, fy + (fh - lh) / 2, lw, lh); c.globalAlpha = 1; }
            /* lencana: kondisi (isi emas) + tingkat kondisi gitar bekas / kategori aksesoris (garis emas). Jenis gitar tidak diulang: sudah ada di judul */
            var kond = sewa ? 'SEWA' : s.kondisi === 'bekas' ? 'USED' : 'BARU', cy = 1040; c.font = '800 28px ' + SANS;
            var bw = c.measureText(kond).width + 52; rect(c, 60, cy, bw, 56, 28); c.fillStyle = EMAS; c.fill(); c.fillStyle = '#1a1510'; c.fillText(kond, 86, cy + 38);
            if (jenis) { c.font = '700 28px ' + SANS; var jw = c.measureText(jenis.toUpperCase()).width + 52; rect(c, 60 + bw + 12, cy, jw, 56, 28); c.strokeStyle = 'rgba(224,169,92,.7)'; c.lineWidth = 2; c.stroke(); c.fillStyle = EMAS; c.fillText(jenis.toUpperCase(), 86 + bw + 12, cy + 38); }
            /* nama + warna */
            c.fillStyle = '#fff'; c.font = '700 66px ' + SERIF;
            var y = 1176; barisTeks(c, judul, 960, 2).forEach(function (b) { c.fillText(b, 60, y); y += 76; });
            if (String(s.warna || '').trim()) { c.fillStyle = '#c9bfb2'; c.font = '600 34px ' + SANS; c.fillText(s.warna, 60, y - 14); y += 40; }
            /* harga: "Rp" kecil + angka besar */
            if (sewa) {
                if (sewa.harian > 0) {
                    var ang = L.rupiah(sewa.harian).replace(/^Rp\s*/, '');
                    c.fillStyle = EMAS; c.font = '600 46px ' + SERIF; c.fillText('Rp', 60, y + 62); var rw0 = c.measureText('Rp').width + 12;
                    c.font = '700 108px ' + SERIF; c.fillText(ang, 60 + rw0, y + 76); var aw = c.measureText(ang).width;
                    c.fillStyle = '#c9bfb2'; c.font = '600 40px ' + SANS; c.fillText('/ hari', 60 + rw0 + aw + 18, y + 76);
                } else { c.fillStyle = EMAS; c.font = '700 66px ' + SERIF; c.fillText('Tarif sesuai lama sewa', 60, y + 70); }
                y += 100;
                c.fillStyle = '#d8cfc3'; c.font = '600 32px ' + SANS; c.fillText('Deposit ' + L.rupiah(sewa.deposit) + ' · dikembalikan saat gitar kembali', 60, y + 14); y += 70;
            } else {
            var angka = L.rupiah(s.harga_jual).replace(/^Rp\s*/, '');
            c.fillStyle = EMAS; c.font = '600 46px ' + SERIF; c.fillText('Rp', 60, y + 62); var rw = c.measureText('Rp').width + 12;
            c.font = '700 108px ' + SERIF; c.fillText(angka, 60 + rw, y + 76); y += 100;
            }
            /* deskripsi */
            if (!sewa && String(s.deskripsi || '').trim()) { c.fillStyle = '#d8cfc3'; c.font = '500 32px ' + SANS; barisTeks(c, s.deskripsi, 960, Math.max(0, Math.min(2, Math.floor((1528 - y) / 44)))).forEach(function (b) { y += 44; c.fillText(b, 60, y + 6); }); }
            /* penutup: logo besar di kiri; di kanannya nomor WhatsApp, ajakan ke situs, dan alamat (gambar tidak bisa diketuk, jadi semuanya teks biasa) */
            c.fillStyle = 'rgba(224,169,92,.35)'; c.fillRect(60, 1528, 960, 2);
            var tx = 60; if (r[1]) { var lh1 = 120, lw1 = lh1 * r[1].width / r[1].height; c.drawImage(r[1], 60, 1546, lw1, lh1); tx = 60 + lw1 + 32; }
            c.fillStyle = '#25D366'; c.beginPath(); c.arc(tx + 24, 1584, 24, 0, 7); c.fill();
            c.save(); c.translate(tx + 24 - 14, 1584 - 14); c.scale(28 / 24, 28 / 24); c.fillStyle = '#fff'; c.fill(new Path2D(WA_IKON.match(/ d="([^"]+)"/)[1])); c.restore();
            c.fillStyle = '#fff'; c.font = '800 42px ' + SANS; c.fillText(wa, tx + 64, 1598);
            var web = L.situs().replace(/^https?:\/\//, '').replace(/\/$/, '');
            c.fillStyle = EMAS; c.font = '700 30px ' + SANS; c.fillText('Lihat koleksi lengkap di ' + web, tx, 1642);
            c.fillStyle = '#b9ad9d'; c.font = '500 24px ' + SANS; c.fillText(barisTeks(c, C.toko.alamat, 1020 - tx, 1)[0], tx, 1672);
            return new Promise(function (ok, gagal) { cv.toBlob(function (b) { b ? ok(b) : gagal(new Error('Gagal membuat gambar.')); }, 'image/jpeg', .85); });
        });
    }
    function blobBase64(b) { return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(String(f.result).split(',')[1] || ''); }; f.readAsDataURL(b); }); }
    /* Bagikan: poster + teks lewat menu bagikan HP (WA, Status WA, Instagram, Threads, X, dll). Di PC tanpa menu bagikan berkas: hanya teks, lewat menu bagikan atau WhatsApp. */
    function bagikanStok(s, tombol) { bagikanPoster(s, teksTawar(s), null, tombol); }
    function bagikanPoster(s, teks, opsi, tombol) {
        var nama = 'ayri-' + (opsi && opsi.sewa ? 'sewa-' : '') + String(s.kode || 'barang').toLowerCase() + '.jpg';
        if (tombol) sibuk(tombol, true, 'Menyiapkan…');
        function lepas() { if (tombol) sibuk(tombol, false); }
        /* PC / browser tanpa menu bagikan berkas: tanpa unduhan gambar, kirim teks penawaran lewat WhatsApp */
        var cobaBerkas = adaAplikasi() || !!(navigator.canShare && navigator.canShare({ files: [new File([''], nama, { type: 'image/jpeg' })] }));
        if (!cobaBerkas) { lepas(); if (navigator.share) { navigator.share({ text: teks, title: C.toko.nama }).catch(function () {}); } else bukaWa('', teks); return; }
        buatPoster(s, opsi).then(function (blob) {
            if (adaAplikasi()) return blobBase64(blob).then(function (b64) { kirimKeAplikasi('bagikan', { nama: nama, mime: 'image/jpeg', b64: b64, teks: teks }); });
            return navigator.share({ files: [new File([blob], nama, { type: 'image/jpeg' })], text: teks, title: C.toko.nama });
        }).catch(function (e) { if (e && e.name !== 'AbortError') toast('Gagal membagikan: ' + (e.message || e), true); }).then(lepas);
    }
    /* AI: draf deskripsi dari data barang + catatan + foto barang (maks. 3: yang sudah diunggah, lalu yang baru dipilih) */
    function keJpegAi(im) {
        var k = Math.min(1, 896 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k));
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        return cv.toDataURL('image/jpeg', 0.8);
    }
    function fotoUntukAi(s) {
        var sumber = (s.foto || []).filter(function (f) { return f.repo === 'publik'; }).slice(0, 3).map(function (f) { return function () { return muatFotoPoster(s, f); }; });
        (sk && sk.antri || []).forEach(function (q) { if (q.hasil && sumber.length < 3) sumber.push(function () { return gambarDari(q.hasil.kecil); }); });
        return Promise.all(sumber.map(function (ambil) { return ambil().then(keJpegAi).catch(function () { return null; }); })).then(function (l) { return l.filter(Boolean); });
    }
    function tulisDeskripsiAi(b) {
        var s = sk.s, ada = String(s.deskripsi || '').trim();
        sibuk(b, true, 'AI melihat foto…');
        fotoUntukAi(s).then(function (gambar) {
            var minta = L.ai.deskripsi(s, gambar.length); minta.gambar = gambar;
            $('#sk-ai').textContent = 'AI menulis…';
            return A.ai(minta);
        }).then(function (teks) {
            sibuk(b, false);
            if (ada && !confirm('Ganti isi deskripsi dengan tulisan AI?\n\n' + teks)) return;
            s.deskripsi = teks; $('[data-s="deskripsi"]').value = teks; setDirty(true);
            toast(A.ai.catatan || 'Draf dari AI. Periksa dan ubah bila perlu, lalu Simpan.', !!A.ai.catatan);
        }).catch(function (e) { sibuk(b, false); gagal(e); });
    }
    function stokKosong() {
        return { kategori: 'gitar', kondisi: 'bekas', tingkat: '', gitar_jenis: C.jenisGitar[0], gitar_merk: '', sub: C.kategoriAksesoris[0], nama: '', warna: '', no_seri: '', deskripsi: '', jumlah: 1, harga_beli: 0, harga_jual: 0, tgl_masuk: L.hariIni(), asal: '', status: 'tersedia', tampil: true, penjualan: [], foto: [], catatan_admin: '' };
    }
    function bukaStok(id) { ambilCatatan('stok', id, stokKosong, function (s) { s.foto = s.foto || []; s.penjualan = s.penjualan || []; sk = { baru: !id, s: s, antri: [] }; gambarStok(); }); }
    function gambarStok() {
        var s = sk.s, jenis = C.jenisGitar.slice(), subs = C.kategoriAksesoris.slice();
        s.kategori = s.kategori || 'gitar';
        if (s.gitar_jenis && jenis.indexOf(s.gitar_jenis) < 0) jenis.push(s.gitar_jenis);
        if (s.sub && subs.indexOf(s.sub) < 0) subs.push(s.sub);
        var aks = s.kategori === 'aksesoris';
        app.innerHTML = '<section id="sk" class="ly-f"><div class="ly-head"><a class="ly-back" href="#stok">‹ Daftar stok</a></div>' +
            '<div class="ly-head"><h1>' + (sk.baru ? 'Tambah stok' : E(L.namaStok(s))) + '</h1>' + (sk.baru ? '' : chipStok(s)) + '</div>' +
            (sk.baru ? '' : kodeBaris(s, L.diKatalog(s) ? ' <a target="_blank" href="' + E(L.urlUnit(s.kode)) + '">🌐 lihat di katalog</a>' : '')) +
            '<fieldset class="ly-card ly-f"><legend>Barang</legend>' +
            '<div class="ly-status" id="sk-kategori">' + [['gitar', 'Gitar'], ['aksesoris', 'Aksesoris']].map(function (k) { return '<button type="button" data-kategori="' + k[0] + '" aria-pressed="' + (s.kategori === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
            '<div class="ly-status" id="sk-kondisi"' + (aks ? ' hidden' : '') + '>' + ['baru', 'bekas'].map(function (k) { return '<button type="button" data-kondisi="' + k + '" aria-pressed="' + (s.kondisi === k) + '">' + L.KONDISI[k] + '</button>'; }).join('') + '</div>' +
            '<div id="sk-tingkat" class="ly-f"' + (!aks && s.kondisi === 'bekas' ? '' : ' hidden') + '><label>Tingkat kondisi (tampil di poster &amp; katalog)<select data-s="tingkat">' + opsi([['', 'Belum dinilai']].concat(C.tingkatKondisi.map(function (t) { return [t[0], t[1]]; })), s.tingkat || '') + '</select></label>' +
            '<p class="ly-hint" style="margin:0">' + C.tingkatKondisi.map(function (t) { return '<b>' + E(t[1]) + '</b>: ' + E(t[2]); }).join('. ') + '. Cacat yang ada tetap ditulis di deskripsi.</p></div>' +
            '<div id="sk-gitar"' + (aks ? ' hidden' : '') + ' class="ly-f"><div class="ly-row2"><label>Jenis gitar<select data-s="gitar_jenis">' + opsi(jenis, s.gitar_jenis) + '</select></label><label>Merk / model<input data-s="gitar_merk" placeholder="mis. Yamaha F310"></label></div>' +
            '<label>Nomor seri (tidak tampil di website)<input data-s="no_seri" autocapitalize="characters"></label></div>' +
            '<div id="sk-aks"' + (aks ? '' : ' hidden') + ' class="ly-f"><div class="ly-row2"><label>Kategori<select data-s="sub">' + opsi(subs, s.sub) + '</select></label><label>Nama produk<input data-s="nama" placeholder="mis. Senar Elixir Nanoweb 11-52"></label></div></div>' +
            '<label><span id="sk-lbl-warna">' + (aks ? LBL_VARIAN : 'Warna') + '</span><input data-s="warna" placeholder="' + (aks ? PH_VARIAN : 'mis. Hitam Glossy') + '"></label>' +
            '<label>Deskripsi (kondisi, spesifikasi, kelengkapan)<textarea data-s="deskripsi" rows="3" placeholder="mis. mulus, action rendah, bonus softcase"></textarea></label>' +
            (L.ai.aktif ? '<div class="ly-btns"><button type="button" class="ly-btn ly-btn--sm" id="sk-ai">✨ Tulis deskripsi dengan AI</button></div><p class="ly-hint" style="margin:0">Tulis catatan singkat dulu (mis. lecet kecil di body, bonus softcase); AI ikut melihat foto yang sudah diunggah (maks. 3) dan menambah spesifikasi model (jumlah senar, bahan, konstruksi). Spesifikasi itu dari pengetahuan AI, jadi cek lagi dengan barangnya sebelum menyimpan.</p>' : '') + '</fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Harga &amp; jumlah</legend>' +
            '<div class="ly-row2">' + (owner() ? '<label>Modal / harga beli per unit (Rp)<input type="number" inputmode="numeric" min="0" step="10000" data-s="harga_beli"></label>' : '') + '<label>Harga jual (Rp)<input type="number" inputmode="numeric" min="0" step="10000" data-s="harga_jual"></label></div>' +
            '<div class="ly-row2"><label>Jumlah tersedia<input type="number" inputmode="numeric" min="0" data-s="jumlah"></label><label>Tanggal masuk (tidak tampil di website)<input type="date" data-s="tgl_masuk"></label></div>' +
            (owner() ? '<label>Asal barang (opsional, tidak tampil di website)<input data-s="asal" placeholder="mis. beli dari pelanggan / distributor / tukar tambah"></label>' : '') +
            '<label class="ly-cek"><input type="checkbox" id="sk-tampil"> 🌐 Tampilkan di katalog website (bila tersedia dan ada harga jual)</label>' +
            '<div class="ly-sum owner-saja" id="sk-sum"></div></fieldset>' +
            '<fieldset class="ly-card"><legend>Foto</legend><div id="sk-foto"></div><p class="ly-hint" style="margin-top:10px">Foto produk tampil di katalog website (tidak dikunci). Foto pertama menjadi sampul.</p></fieldset>' +
            (sk.baru ? '' : '<fieldset class="ly-card"><legend>Penjualan</legend><div class="ly-bayar" id="sk-jual"></div>' +
                (L.sewaAktifStok(s.id, cache.sewa) ? '<p class="ly-hint" style="margin:10px 0 0"><b>Sedang disewa</b> oleh ' + E(L.sewaAktifStok(s.id, cache.sewa).nama) + ' sampai ' + L.tgl(L.batasSewa(L.sewaAktifStok(s.id, cache.sewa))) + '. <a href="#sewa/' + E(L.sewaAktifStok(s.id, cache.sewa).id) + '">Buka sewa</a></p>' : '') +
                (L.bisaDisewa(s, cache.sewa) ? '<div class="ly-btns" style="margin-top:10px"><button type="button" class="ly-btn" id="sk-sewa-baru">Sewakan gitar ini</button></div>' : '') +
                (L.titipanTerkunci(s) ? '<p class="ly-ingat ly-ingat--info"><span><b>Gitar titipan.</b> Penjualan lewat Kasir belum tersedia (sedang disiapkan).' + (owner() ? ' <a href="#titip/' + E(s.sumber_titip) + '">Buka data titipan</a>' : '') + '</span></p>' : '') +
                (+s.jumlah > 0 && s.status !== 'ditarik' && !L.sewaAktifStok(s.id, cache.sewa) && !L.titipanTerkunci(s) ? '<div class="ly-btns" style="margin-top:10px"><button type="button" class="ly-btn ly-btn--pri" id="sk-jual-baru">Jual / pesan dengan DP</button></div>' +
                    '<p class="ly-hint" style="margin:8px 0 0">Bayar penuh = langsung terjual. Bayar sebagian = DP: barang ditahan ' + C.jual.batasHari + ' hari, nota & pengingat pelunasan dikirim lewat WA.</p>' : '') + '</fieldset>') +
            '<fieldset class="ly-card ly-f"><legend>Status</legend><div class="ly-status" id="sk-status"></div><label>Catatan internal<textarea data-s="catatan_admin" rows="2"></textarea></label></fieldset>' +
            (sk.baru ? '' : '<fieldset class="ly-card"><legend>Lainnya</legend>' + kisiAksi([].concat(s.harga_jual && adaStok(s) ? [aksi({ id: 'sk-tawar', ikon: 'bagikan', teks: 'Bagikan poster &amp; penawaran', kelas: 'ly-akt--pri ly-akt--lebar' })] : [])
                .concat(L.diKatalog(s) ? [aksi({ href: E(L.urlUnit(s.kode)), luar: true, ikon: 'lihat', teks: 'Lihat halaman unit' })] : [])
                .concat(owner() ? [aksi({ id: 'sk-hapus', ikon: 'hapus', teks: 'Hapus data', kelas: 'ly-akt--del' })] : [])) + '</fieldset>') +
            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="sk-simpan">' + (sk.baru ? 'Simpan stok' : 'Simpan perubahan') + '</button></div></section>';
        $$('[data-s]', app).forEach(function (el) { var v = s[el.dataset.s]; el.value = v == null ? '' : v; });
        $('#sk-tampil').checked = s.tampil !== false;
        gambarSumStok(); gambarStatusStok(); gambarJual(); gambarFotoStok(); setDirty(false);
        var el = $('#sk');
        function tampilTingkat() { $('#sk-tingkat').hidden = !(s.kategori !== 'aksesoris' && s.kondisi === 'bekas'); }
        function ubah(e) {
            var t = e.target, k = t.dataset.s;
            if (t.id === 'sk-tampil') { s.tampil = t.checked; setDirty(true); return; }
            if (!k) return;
            s[k] = /^(harga_beli|harga_jual|jumlah)$/.test(k) ? Math.max(0, Math.round(+t.value || 0)) : t.value; setDirty(true);
            if (/harga|jumlah/.test(k)) gambarSumStok();
        }
        el.addEventListener('input', ubah); el.addEventListener('change', ubah);
        el.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
            if (d.kondisi) { s.kondisi = d.kondisi; $$('#sk-kondisi button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.kondisi === s.kondisi); }); tampilTingkat(); setDirty(true); }
            else if (d.kategori) {
                s.kategori = d.kategori; var aks = s.kategori === 'aksesoris';
                if (aks && sk.baru) { s.kondisi = 'baru'; $$('#sk-kondisi button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.kondisi === 'baru'); }); }
                $$('#sk-kategori button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.kategori === s.kategori); });
                $('#sk-gitar').hidden = aks; $('#sk-aks').hidden = !aks; $('#sk-kondisi').hidden = aks; if (aks) s.kondisi = 'baru'; tampilTingkat(); $('#sk-lbl-warna').textContent = aks ? LBL_VARIAN : 'Warna'; $('[data-s="warna"]').placeholder = aks ? PH_VARIAN : 'mis. Hitam Glossy'; setDirty(true);
            }
            else if (b.id === 'sk-ai') tulisDeskripsiAi(b);
            else if (d.sts) { s.status = d.sts; gambarStatusStok(); setDirty(true); }
            else if (d.deljual != null) { var p = s.penjualan[+d.deljual]; if (confirm('Hapus catatan penjualan ' + p.qty + ' unit tanggal ' + L.tgl(p.tgl) + '? Jumlah stok dikembalikan.')) { s.jumlah = (+s.jumlah || 0) + p.qty; s.penjualan.splice(+d.deljual, 1); if (s.status === 'terjual') s.status = 'tersedia'; $('[data-s="jumlah"]').value = s.jumlah; gambarJual(); gambarSumStok(); gambarStatusStok(); setDirty(true); } }
            else if (d.hapusfoto) { if (confirm('Hapus foto ini? (terhapus permanen saat Simpan)')) { s.foto = s.foto.filter(function (f) { return f.id !== d.hapusfoto; }); gambarFotoStok(); setDirty(true); } }
            else if (d.hapusq) { sk.antri = buangQ(sk.antri, d.hapusq); gambarFotoStok(); }
            else if (b.id === 'sk-sewa-baru') { if (dirty) return toast('Simpan perubahan stok dulu.', true); pindah('#sewa/baru/' + s.id); }
            else if (b.id === 'sk-jual-baru') { if (dirty) return toast('Simpan perubahan stok dulu.', true); pindah('#jual/baru/' + s.id); }
            else if (b.id === 'sk-tawar') { if (dirty) return toast('Simpan perubahan dulu.', true); bagikanStok(s, b); }
        });
        pilihFoto($('#sk-foto'), function (tahap, files) { antriFoto(sk.antri, files, {}, gambarFotoStok); });
        $('#sk-simpan').addEventListener('click', simpanStok);
        if (!sk.baru && owner()) $('#sk-hapus').addEventListener('click', hapusStok);
    }
    function gambarSumStok() {
        var s = sk.s, u = L.untungStok(s), per = (+s.harga_jual || 0) - (+s.harga_beli || 0);
        $('#sk-sum').innerHTML = '<div><span>Untung per unit</span><span' + (per < 0 ? ' class="ly-telat"' : '') + '>' + L.rupiah(per) + (s.harga_beli && s.harga_jual ? ' (' + Math.round(per / s.harga_beli * 100) + '%)' : '') + '</span></div>' +
            '<div><span>Perkiraan untung stok tersisa</span><span>' + L.rupiah(u.potensi) + '</span></div>' +
            (u.unitTerjual ? '<div class="ly-total"><span>Sudah terjual ' + u.unitTerjual + ' unit</span><span>untung ' + L.rupiah(u.untung) + '</span></div>' : '');
    }
    function gambarStatusStok() {
        var s = sk.s;
        $('#sk-status').innerHTML = ['tersedia', 'dipesan', 'ditarik'].map(function (k) { return '<button type="button" data-sts="' + k + '" aria-pressed="' + (s.status === k) + '">' + L.STATUS_STOK[k] + '</button>'; }).join('') +
            (s.status === 'terjual' ? '<button type="button" aria-pressed="true" disabled>Terjual</button>' : '');
    }
    function gambarJual() {
        var el = $('#sk-jual'); if (!el) return; var s = sk.s;
        el.innerHTML = s.penjualan.length ? s.penjualan.map(function (p, i) {
            /* penjualan dari transaksi (pembeli, DP) diatur di halaman transaksinya */
            if (p.jual_id) { var j = cariId('jual', p.jual_id); return '<div><span>' + L.tgl(p.tgl) + ' · ' + p.qty + ' unit · <a href="#jual/' + E(p.jual_id) + '">' + E(p.catatan) + '</a>' + (j ? ' · ' + E(L.STATUS_JUAL[j.status]) : '') + '</span><b>' + L.rupiah(p.harga * p.qty) + '</b></div>'; }
            return '<div><span>' + L.tgl(p.tgl) + ' · ' + p.qty + ' unit' + (p.catatan ? ' · ' + E(p.catatan) : '') + (p.baru ? ' <small class="ly-muted">(belum disimpan)</small>' : '') + '</span><b>' + L.rupiah(p.harga * p.qty) + '</b><button type="button" class="ly-x" data-deljual="' + i + '" aria-label="Hapus">×</button></div>';
        }).join('') : '<p class="ly-muted">Belum ada penjualan.</p>';
    }
    function gambarFotoStok() {
        var el = $('#sk-foto'); if (!el) return;
        el.innerHTML = grupFoto('Foto barang', null, sk.s.foto, sk.antri, false);
        L.isiFoto(el, sk.s, A.fotoAdmin);
    }
    function simpanStok() {
        var s = sk.s;
        if (s.kategori === 'aksesoris' ? !String(s.nama || '').trim() : !String(s.gitar_merk || '').trim()) return toast(s.kategori === 'aksesoris' ? 'Isi nama produk.' : 'Isi merk / model gitar.', true);
        if (s.tampil !== false && adaStok(s) && s.harga_jual > 0 && !s.foto.length && !sk.antri.length && !confirm('Barang ini akan tampil di katalog website tanpa foto. Lanjutkan?')) return;
        if (sk.antri.some(function (q) { return !q.hasil; })) return toast('Foto masih diproses, tunggu sebentar.', true);
        if (s.harga_jual && s.harga_jual < s.harga_beli && !confirm('Harga jual lebih rendah dari modal. Tetap simpan?')) return;
        var baru = sk.baru, fotoBaru = sk.antri.map(function (q) { return { hasil: q.hasil }; });
        var rec = Object.assign({}, s, { penjualan: s.penjualan.map(function (p) { var x = Object.assign({}, p); delete x.baru; return x; }) });
        prosesSimpan('stok', $('#sk-simpan'), teksUnggah(fotoBaru), function () { return A.simpanStok(rec, fotoBaru); }, function (row) {
            lepasAntri(sk.antri); sk = { baru: false, s: salin(row), antri: [] };
            toast(baru ? 'Stok tersimpan. Kode: ' + row.kode + '.' : 'Tersimpan.');
            if (baru) pindah('#stok/' + row.id); else gambarStok();
        }, function (r) { lepasAntri(sk.antri); sk = { baru: false, s: r, antri: [] }; gambarFotoStok(); });
    }
    function hapusStok() {
        if (confirm('Hapus data stok ' + sk.s.kode + ' beserta fotonya? Catatan penjualannya ikut terhapus.')) hapusData('stok', sk.s, $('#sk-hapus'), A.hapusStok, 'Data stok dihapus.');
    }
    /* gitar tebus yang menjadi milik toko -> stok bekas (foto gitar ikut dipindah, KTP tidak) */
    function tebusKeStok(t, btn) {
        var fotoGitar = (t.foto || []).filter(function (f) { return f.tahap === 'gitar'; });
        sibuk(btn, true, 'Memindahkan…');
        /* bila langkah kedua (menautkan ke data tebus) pernah gagal, stoknya sudah ada: cukup ditautkan, jangan dibuat dua kali */
        var sudah = cache.stok.filter(function (x) { return x.sumber_tebus === t.id; })[0];
        (sudah ? Promise.resolve(sudah) : Promise.all(fotoGitar.map(function (f) { return Promise.all([A.fotoBlob(t, f, true), A.fotoBlob(t, f, false)]).then(function (b) { return { hasil: { besar: b[0], kecil: b[1] } }; }); }))
            .then(function (fotoBaru) {
                var rec = Object.assign(stokKosong(), { kondisi: 'bekas', gitar_jenis: t.gitar_jenis, gitar_merk: t.gitar_merk, warna: t.warna, no_seri: t.no_seri, deskripsi: t.kelengkapan, harga_beli: t.harga_beli, asal: 'Hak tebus ' + t.kode + ' (' + t.nama + ')', sumber_tebus: t.id });
                return A.simpanStok(rec, fotoBaru);
            })).then(function (row) {
                taruh('stok', row);
                var tr = salin(t); tr.stok_id = row.id;
                return A.simpanTebus(tr).then(function (t2) {
                    taruh('tebus', t2);
                    setDirty(false); toast('Masuk ke stok (' + row.kode + '). Isi harga jualnya.'); pindah('#stok/' + row.id);
                });
            }).catch(function (e) { sibuk(btn, false); gagal(e); });
    }

    /* ================= artikel ================= */
    function daftarArtikel() {
        app.innerHTML = '<section><div class="ly-head"><h1>Artikel</h1><a class="ly-btn ly-btn--pri" href="#artikel/baru">+ Artikel baru</a></div>' +
            '<p class="ly-muted">Artikel berstatus <b>Terbit</b> langsung dibuat menjadi halaman situs, kartu di beranda, dan masuk sitemap Google (tampil ±1 menit setelah disimpan). Buat dari menu servis (tombol <b>Jadikan artikel</b>) supaya foto dan ceritanya terisi otomatis.</p>' +
            '<div class="ly-list" id="list"></div></section>';
        var rows = cache.artikel;
        $('#list').innerHTML = rows.length ? rows.map(function (a) {
            return '<a class="ly-item" href="#artikel/' + E(a.id) + '"><span class="ly-item__k">' + L.tgl((a.status === 'terbit' && a.terbit_at || a.created_at || '').slice(0, 10)) + '</span><span class="st-chip ' + (a.status === 'terbit' ? 'st-selesai' : 'st-menunggu_dp') + '">' + (a.status === 'terbit' ? 'Terbit' : 'Draf') + '</span>' +
                '<span class="ly-item__t">' + E(a.judul) + '</span><span class="ly-item__m"><span>artikel-' + E(a.slug) + '.html</span><span>Diubah ' + L.tgl((a.updated_at || '').slice(0, 10)) + '</span></span></a>';
        }).join('') : '<p class="ly-kosong">Belum ada artikel.</p>';
    }
    function artikelKosong() { return { judul: '', slug: '', ringkasan: '', isi: '', tag: 'Tips Servis', foto: [], status: 'draf', servis_id: null }; }
    function bukaArtikel(id) {
        ambilCatatan('artikel', id, artikelKosong, function (a) {
            a.foto = a.foto || [];
            ae = { baru: !id, a: a, slugManual: !!id, servis: a.servis_id && cariId('servis', a.servis_id) || null }; gambarArtikel();
        });
    }
    /* AI: draf isi + ringkasan artikel dari judul, bahan di kotak isi, dan kasus servis (tanpa data pelanggan) */
    function tulisArtikelAi(b) {
        var a = ae.a;
        if (!String(a.judul || '').trim()) return toast('Isi judul artikel dulu.', true);
        sibuk(b, true, 'AI menulis…');
        A.ai(L.ai.artikel(a, ae.servis)).then(function (teks) {
            sibuk(b, false);
            var h = L.ai.pisahArtikel(teks);
            if (String(a.isi || '').trim() && !confirm('Ganti isi artikel dengan draf dari AI? Isi sekarang sudah dipakai sebagai bahan.')) return;
            a.isi = h.isi; $('[data-a="isi"]').value = h.isi;
            if (h.ringkasan && (!String(a.ringkasan || '').trim() || confirm('Ganti ringkasan Google dengan:\n' + h.ringkasan))) { a.ringkasan = h.ringkasan; $('[data-a="ringkasan"]').value = h.ringkasan; }
            setDirty(true); infoArtikel(); toast('Draf dari AI. Baca dan sesuaikan, lalu Simpan.');
        }).catch(function (e) { sibuk(b, false); gagal(e); });
    }
    function gambarArtikel() {
        var a = ae.a, url = L.situs() + 'artikel-' + a.slug + '.html', terbit = !ae.baru && cache.artikel.some(function (x) { return x.id === a.id && x.status === 'terbit'; });
        app.innerHTML = '<section id="ar" class="ly-f"><div class="ly-head"><a class="ly-back" href="#artikel">‹ Daftar artikel</a></div>' +
            '<div class="ly-head"><h1>' + (ae.baru ? 'Artikel baru' : 'Edit artikel') + '</h1></div>' +
            '<fieldset class="ly-card ly-f"><legend>Judul &amp; alamat</legend>' +
            '<label>Judul<input data-a="judul" maxlength="140" placeholder="mis. Repair Bridge Lepas Yamaha APX500"></label>' +
            '<label>Alamat halaman<input data-a="slug" pattern="[a-z0-9-]+" autocapitalize="off"><span class="ly-hint" id="ar-url"></span></label>' +
            '<div class="ly-row2"><label>Label<input data-a="tag" maxlength="40"></label><label>Status<select data-a="status">' + opsi([['draf', 'Draf'], ['terbit', 'Terbit']], a.status) + '</select></label></div>' +
            '<label>Ringkasan untuk Google (maks. 160 huruf)<textarea data-a="ringkasan" rows="2" maxlength="160"></textarea><span class="ly-hint" id="ar-n"></span></label></fieldset>' +
            '<fieldset class="ly-card ly-f"><legend>Isi artikel</legend>' +
            '<p class="ly-hint">Format: <b>## Judul bagian</b>, <b>- poin</b>, <b>**tebal**</b>, <b>_miring_</b>, <b>[teks](https://alamat)</b>, baris kosong = paragraf baru.</p>' +
            '<textarea data-a="isi" rows="16"></textarea><div class="ly-btns"><button type="button" class="ly-btn ly-btn--sm" id="ar-prev">Pratinjau</button>' + (L.ai.aktif ? '<button type="button" class="ly-btn ly-btn--sm" id="ar-ai">✨ Tulis draf dengan AI</button>' : '') + '</div>' +
            (L.ai.aktif ? '<p class="ly-hint" style="margin:0">AI memakai judul dan isi kotak di atas sebagai bahan. Periksa faktanya sebelum diterbitkan.</p>' : '') + '<div class="ly-prev" id="ar-pv" hidden></div></fieldset>' +
            '<fieldset class="ly-card"><legend>Foto</legend><div class="ly-afoto" id="ar-foto"></div><div id="ar-pick"></div>' +
            '<div class="ly-btns" style="margin-top:10px"><label class="ly-btn ly-btn--sm ly-file">+ Unggah foto<input type="file" accept="image/*" multiple id="ar-file"></label></div>' +
            '<p class="ly-hint" style="margin-top:8px">Foto pertama menjadi sampul. Isi keterangan singkat tiap foto (membantu Google). Pastikan tidak ada wajah, nota, atau nomor seri gitar. Foto artikel bersifat publik.</p></fieldset>' +
            (ae.baru ? '' : '<fieldset class="ly-card"><legend>Lainnya</legend>' + kisiAksi([].concat(terbit ? [aksi({ href: E(url), luar: true, ikon: 'luar', teks: 'Lihat di situs' })] : [])
                .concat([aksi({ id: 'ar-hapus', ikon: 'hapus', teks: 'Hapus artikel', kelas: 'ly-akt--del' })])) + '</fieldset>') +
            '<div class="ly-save"><span class="ly-dirty" id="dirty" hidden>Belum disimpan</span><button type="button" class="ly-btn ly-btn--pri" id="ar-simpan">Simpan</button></div></section>';
        $$('[data-a]', app).forEach(function (el) { el.value = a[el.dataset.a] == null ? '' : a[el.dataset.a]; });
        infoArtikel(); gambarAFoto(); setDirty(false);
        var ar = $('#ar');
        ar.addEventListener('input', function (e) {
            var t = e.target, k = t.dataset.a, i = t.dataset.alt;
            if (k) {
                a[k] = t.value; setDirty(true);
                if (k === 'judul' && !ae.slugManual) { a.slug = ArtikelMd.slug(t.value); $('[data-a="slug"]').value = a.slug; }
                if (k === 'slug') ae.slugManual = true;
                infoArtikel(); if (!$('#ar-pv').hidden) { clearTimeout(pratinjau.t); pratinjau.t = setTimeout(pratinjau, 300); }
            } else if (i != null) { a.foto[+i].alt = t.value; setDirty(true); }
        });
        ar.addEventListener('change', function (e) { if (e.target.dataset.a === 'status') { a.status = e.target.value; setDirty(true); } });
        ar.addEventListener('click', function (e) {
            var t = e.target.closest('button'); if (!t) return; var d = t.dataset;
            if (t.id === 'ar-ai') tulisArtikelAi(t);
            else if (t.id === 'ar-prev') { var pv = $('#ar-pv'); pv.hidden = !pv.hidden; t.textContent = pv.hidden ? 'Pratinjau' : 'Tutup pratinjau'; if (!pv.hidden) pratinjau(); }
            else if (d.fdel != null) { a.foto.splice(+d.fdel, 1); gambarAFoto(); setDirty(true); }
            else if (d.fup != null) { var i = +d.fup; if (i > 0) { var x = a.foto[i]; a.foto[i] = a.foto[i - 1]; a.foto[i - 1] = x; gambarAFoto(); setDirty(true); } }
            else if (d.pick) {
                var f = ae.servis.foto.filter(function (x) { return x.id === d.pick; })[0], ada = -1;
                a.foto.forEach(function (x, j) { if (x.foto === f.id) ada = j; });
                if (ada > -1) a.foto.splice(ada, 1); else a.foto.push({ servis: ae.servis.id, foto: f.id, alt: L.TAHAP[f.tahap] });
                gambarAFoto(); setDirty(true);
            }
        });
        $('#ar-file').addEventListener('change', function () {
            var files = [].slice.call(this.files); this.value = ''; if (!files.length) return;
            toast('Mengunggah ' + files.length + ' foto…');
            /* dikecilkan satu per satu (hemat memori HP), lalu diunggah sekaligus dalam satu commit */
            var hasil = [];
            files.reduce(function (p, file) { return p.then(function () { return L.kompres(file, { kecil: false }).then(function (h) { hasil.push(h); }); }); }, Promise.resolve())
                .then(function () { return A.unggahFotoArtikel(hasil); })
                .then(function (paths) { paths.forEach(function (p) { a.foto.push({ path: p, alt: '' }); }); gambarAFoto(); setDirty(true); toast('Foto terunggah. Isi keterangannya, lalu Simpan.'); }).catch(gagal);
        });
        $('#ar-simpan').addEventListener('click', simpanArtikel);
        if (!ae.baru) $('#ar-hapus').addEventListener('click', function () {
            if (confirm('Hapus artikel ini? Kalau sudah terbit, halamannya ikut dihapus dari situs.')) hapusData('artikel', a, this, A.hapusArtikel, 'Artikel dihapus.');
        });
    }
    function infoArtikel() {
        var a = ae.a; $('#ar-url').textContent = 'ayrigitar.com/artikel-' + (a.slug || '…') + '.html';
        $('#ar-n').textContent = (a.ringkasan || '').length + '/160';
    }
    function isiGambar(el) { $$('img[data-af]', el).forEach(function (img) { var f = ae.a.foto[+img.dataset.af]; if (f) A.fotoArtikel(f).then(function (u) { img.src = u; }, function () { img.alt = 'Foto tidak ditemukan'; }); }); }
    function pratinjau() {
        var a = ae.a; if (!$('#ar-pv')) return;
        $('#ar-pv').innerHTML = '<p class="ly-muted">' + E(a.tag) + '</p><h2>' + E(a.judul || '(tanpa judul)') + '</h2>' + (a.foto[0] ? '<img data-af="0" alt="" style="border-radius:12px;margin:10px 0">' : '') + ArtikelMd.keHtml(a.isi);
        isiGambar($('#ar-pv'));
    }
    function gambarAFoto() {
        if (!$('#ar-foto')) return;
        var a = ae.a;
        $('#ar-foto').innerHTML = a.foto.length ? a.foto.map(function (f, i) {
            return '<div><img data-af="' + i + '" alt=""><input class="ly-in" data-alt="' + i + '" value="' + E(f.alt) + '" placeholder="Keterangan foto"><span class="ly-btns" style="flex-wrap:nowrap">' +
                (i ? '<button type="button" class="ly-x" data-fup="' + i + '" aria-label="Naikkan">↑</button>' : '') + '<button type="button" class="ly-x" data-fdel="' + i + '" aria-label="Hapus dari artikel">×</button></span></div>';
        }).join('') : '<p class="ly-muted">Belum ada foto.</p>';
        isiGambar($('#ar-foto'));
        var pick = $('#ar-pick'), s = ae.servis, dipakai = a.foto.map(function (x) { return x.foto; });
        pick.innerHTML = s && s.foto && s.foto.length ? '<p class="ly-hint" style="margin:12px 0 6px">Foto dari data servis ' + E(s.kode) + ' (ketuk untuk pakai/lepas):</p><div class="ly-pick">' + s.foto.map(function (f, i) {
            return '<button type="button" data-pick="' + E(f.id) + '" aria-pressed="' + (dipakai.indexOf(f.id) > -1) + '"><img data-foto="' + i + '" alt="' + E(L.TAHAP[f.tahap]) + '"></button>';
        }).join('') + '</div>' : '';
        if (s) L.isiFoto(pick, s, A.fotoAdmin);
    }
    function simpanArtikel() {
        var a = ae.a;
        a.judul = (a.judul || '').trim(); a.slug = ArtikelMd.slug(a.slug || a.judul);
        if (!a.judul) return toast('Judul belum diisi.', true);
        if (!a.slug) return toast('Alamat halaman belum benar.', true);
        if (a.status === 'terbit') {
            if (!a.isi.trim()) return toast('Isi artikel masih kosong.', true);
            if (/\((Ceritakan|Tulis)[^)]*\)/.test(a.isi) && !confirm('Masih ada teks contoh dalam tanda kurung (mis. “(Ceritakan hasilnya…)”). Tetap terbitkan?')) return;
            if (!a.ringkasan.trim()) a.ringkasan = ArtikelMd.teksPolos(a.isi).slice(0, 157) + '…';
            if (a.foto.some(function (f) { return !String(f.alt || '').trim(); })) return toast('Isi keterangan untuk setiap foto dulu.', true);
        }
        prosesSimpan('artikel', $('#ar-simpan'), a.status === 'terbit' ? 'Menerbitkan…' : 'Menyimpan…', function () { return A.simpanArtikel(a); }, function (row) {
            toast(row.status === 'terbit' ? 'Terbit! Halaman artikel tampil di situs ±1 menit lagi.' : 'Draf tersimpan.');
            if (ae.baru) pindah('#artikel/' + row.id); else { ae.a = salin(row); ae.slugManual = true; gambarArtikel(); }
        });
    }

    mulai();
})();
