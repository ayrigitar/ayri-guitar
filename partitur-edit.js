/* Editor tab ketuk-ketik (seperti Guitar Pro) untuk gitar, bass, dan ukulele di partitur.html.
   Pilih posisi dengan mengetuk/klik tab, lalu ketik angka fret (keypad di HP, keyboard di komputer).
   Lagu disunting sebagai salinan JSON alphaTab lewat jembatan window.Partitur (partitur.js),
   lalu digambar ulang setiap ada perubahan. Tulisan terakhir disimpan otomatis di perangkat ini. */
(function () {
    var P = window.Partitur; if (!P || !window.alphaTab) return;
    var at = P.at, $ = P.$, $$ = P.$$, main = P.main, JSONC = alphaTab.model.JsonConverter;
    var KUNCI_DRAF = 'ayri-partitur-draf', KUNCI_INFO = 'ayri-partitur-draf-info';
    /* panjang not dalam tick (not seperempat = 960) */
    var TICK = { '-4': 15360, '-2': 7680, 1: 3840, 2: 1920, 4: 960, 8: 480, 16: 240, 32: 120, 64: 60, 128: 30 };
    var DURASI = [1, 2, 4, 8, 16, 32];
    var NAMA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var ALAT = {
        gitar: { nama: 'Gitar', program: 25, tuning: 'E4 B3 G3 D3 A2 E2', staff: 'score tabs' },
        bass: { nama: 'Bass', program: 33, tuning: 'G2 D2 A1 E1', staff: 'tabs' },
        ukulele: { nama: 'Ukulele', program: 24, tuning: 'A4 E4 C4 G4', staff: 'score tabs' }
    };
    /* keadaan editor: s = lagu (JSON), ti = instrumen, b = birama, i = ketukan, str = senar (1 = paling rendah) */
    var ed = { on: false, s: null, ti: 0, b: 0, i: 0, str: 1, dur: { d: 4, dots: 0, tup: false }, riwayat: [], maju: [], puluh: null, bunyi: true, putarNot: false, gulir: null };

    /* ================= data lagu ================= */
    function polos(o) {
        if (o instanceof Map) { var r = {}; o.forEach(function (v, k) { r[k] = polos(v); }); return r; }
        if (Array.isArray(o)) return o.map(polos);
        return o;
    }
    function tuning(st) { return (st && st.stringtuning && st.stringtuning.tunings) || []; }
    function bersenar(t) { var st = t.staves[0]; return !!st && !st.ispercussion && tuning(st).length > 0; }
    function stf() { return ed.s.tracks[ed.ti].staves[0]; }
    function nSenar() { return tuning(stf()).length; }
    function barJ(ti, b) { return ed.s.tracks[ti].staves[0].bars[b]; }
    function beatsJ(b) {
        var bar = barJ(ed.ti, b);
        if (!bar.voices || !bar.voices.length) bar.voices = [{ beats: [] }];
        return bar.voices[0].beats;
    }
    function beatIni() { return beatsJ(ed.b)[ed.i]; }
    function panjang(bt) {
        if (bt.isempty || bt.gracetype > 0) return 0;
        var t = TICK[bt.duration] || 960;
        if (bt.dots === 1) t *= 1.5; else if (bt.dots === 2) t *= 1.75;
        if (bt.tupletnumerator > 0 && bt.tupletdenominator > 0) t = t * bt.tupletdenominator / bt.tupletnumerator;
        return Math.round(t);
    }
    function jumlah(bs) { return bs.reduce(function (a, x) { return a + panjang(x); }, 0); }
    function diam(bt) { return !!bt.isempty || !bt.notes || !bt.notes.length; }
    /* diam tanpa chord/teks/perubahan instrumen boleh digabung atau dipecah ulang */
    function diamPolos(bt) { return diam(bt) && !bt.chordid && !bt.text && !(bt.automations && bt.automations.length); }
    function cariNot(bt, s) { return (bt.notes || []).filter(function (n) { return n.string === s; })[0] || null; }
    function terapkanSpek(bt, sp) {
        bt.duration = sp.d; bt.dots = sp.dots || 0; bt.isempty = false;
        bt.tupletnumerator = sp.tup ? 3 : -1; bt.tupletdenominator = sp.tup ? 2 : -1;
        return bt;
    }
    function beatBaru(sp) { return terapkanSpek({ notes: [] }, sp); }
    function panjangSpek(sp) { return panjang(beatBaru(sp)); }
    function spekBeat(bt) { return { d: bt.duration, dots: bt.dots || 0, tup: bt.tupletnumerator === 3 && bt.tupletdenominator === 2 }; }
    /* panjang birama; birama pembuka (anacrusis) mengikuti isi terpanjang di semua instrumen */
    function kapasitas(b) {
        var m = ed.s.masterbars[b], penuh = Math.round(m.timesignaturenumerator * 3840 / m.timesignaturedenominator);
        if (!m.isanacrusis) return penuh;
        var maks = 0;
        ed.s.tracks.forEach(function (t) { t.staves.forEach(function (st) { var v = st.bars[b] && st.bars[b].voices && st.bars[b].voices[0]; if (v) maks = Math.max(maks, jumlah(v.beats)); }); });
        return Math.min(penuh, maks || penuh);
    }
    /* tanda diam untuk mengisi pos..akhir: sebesar mungkin dan rata ketukan; not bertitik/triol diisi dengan jenisnya sendiri dulu */
    function isiDiam(pos, akhir, palet) {
        var hasil = [], aneh = palet && (palet.dots || palet.tup), pl = aneh ? panjangSpek(palet) : 0;
        while (pos < akhir) {
            var sisa = akhir - pos, pilih = null, k;
            for (k = 0; k < DURASI.length && !pilih; k++) if (TICK[DURASI[k]] <= sisa && pos % TICK[DURASI[k]] === 0) pilih = { d: DURASI[k] };
            if (!pilih && aneh && pl <= sisa) pilih = palet;
            for (k = 0; k < DURASI.length && !pilih; k++) if (TICK[DURASI[k]] <= sisa) pilih = { d: DURASI[k] };
            if (!pilih) break;
            var bt = beatBaru(pilih); hasil.push(bt); pos += panjang(bt);
        }
        return hasil;
    }
    function sisipkan(bs, i, isi) { bs.splice.apply(bs, [i, 0].concat(isi)); }
    /* isi kekurangan / pangkas diam di akhir supaya birama pas dengan tanda biramanya */
    function pasPanjang(bar, cap) {
        if (!bar.voices || !bar.voices.length) bar.voices = [{ beats: [] }];
        var v = bar.voices[0], bs = v.beats, oto = bs[0] && bs[0].automations;
        if (!bs.length || bs.every(function (x) { return x.isempty; })) {
            v.beats = isiDiam(0, cap); if (oto && oto.length && v.beats[0]) v.beats[0].automations = oto;
            return;
        }
        while (jumlah(bs) > cap && bs.length > 1 && diam(bs[bs.length - 1])) bs.pop();
        if (jumlah(bs) < cap) sisipkan(bs, bs.length, isiDiam(jumlah(bs), cap));
    }
    /* ubah panjang ketukan i; memakai diam sesudahnya (atau sisa ruang di akhir birama) bila jadi lebih panjang */
    function ubahDurasi(b, i, sp) {
        var bs = beatsJ(b), bt = bs[i], lama = panjang(bt), baru = panjangSpek(sp), pos = jumlah(bs.slice(0, i));
        if (baru <= lama) {
            /* sisa ruang digabung dengan diam sesudahnya supaya tidak jadi potongan kecil-kecil */
            var k = i + 1, ujung = pos + lama;
            while (k < bs.length && diamPolos(bs[k])) { ujung += panjang(bs[k]); k++; }
            terapkanSpek(bt, sp); bs.splice(i + 1, k - i - 1); sisipkan(bs, i + 1, isiDiam(pos + baru, ujung, sp));
            return true;
        }
        var perlu = baru - lama, ada = 0, j = i + 1;
        while (j < bs.length && diam(bs[j]) && ada < perlu) { ada += panjang(bs[j]); j++; }
        var keAkhir = j >= bs.length, akhir = pos + lama + ada;
        if (ada < perlu && keAkhir) ada += Math.max(0, kapasitas(b) - jumlah(bs));
        if (ada < perlu) return false;
        bs.splice(i + 1, j - i - 1);
        terapkanSpek(bt, sp);
        sisipkan(bs, i + 1, isiDiam(pos + baru, keAkhir ? Math.max(kapasitas(b), akhir) : akhir, sp));
        return true;
    }
    /* diam di ujung birama disusun ulang dari not terakhir sampai akhir birama */
    function rapikanEkor(b) {
        var bs = beatsJ(b), k = bs.length;
        while (k > 1 && diamPolos(bs[k - 1])) k--;
        if (k === 1 && diamPolos(bs[0])) k = 0;
        bs.splice(k); sisipkan(bs, k, isiDiam(jumlah(bs), kapasitas(b)));
    }
    function rapikanTrack(ti) {
        var st = ed.s.tracks[ti].staves[0];
        st.bars.forEach(function (bar, k) { pasPanjang(bar, kapasitas(k)); });
    }
    /* nilai turunan dihitung ulang oleh alphaTab; dibuang supaya tidak basi setelah diedit */
    function bersih() {
        ed.s.masterbars.forEach(function (m) { delete m.start; });
        ed.s.tracks[ed.ti].staves.forEach(function (st) {
            st.bars.forEach(function (bar) {
                (bar.voices || []).forEach(function (v) { v.beats.forEach(function (bt) { delete bt.displaystart; delete bt.playbackstart; delete bt.displayduration; delete bt.playbackduration; }); });
            });
        });
    }
    function batasKursor() {
        ed.b = Math.max(0, Math.min(ed.b, ed.s.masterbars.length - 1));
        ed.i = Math.max(0, Math.min(ed.i, beatsJ(ed.b).length - 1));
        ed.str = Math.max(1, Math.min(ed.str, nSenar()));
    }

    /* ================= urungkan / ulangi =================
       perubahan di satu birama cukup menyimpan birama itu; perubahan besar (birama, instrumen) menyimpan seluruh lagu */
    function kursor() { return [ed.b, ed.i, ed.str, ed.ti]; }
    function potret(l) {
        return { l: l, ti: ed.ti, b: ed.b, cur: kursor(), data: JSON.stringify(l === 'birama' ? barJ(ed.ti, ed.b) : ed.s) };
    }
    function catat(l) {
        ed.riwayat.push(potret(l)); ed.maju = [];
        var penuh = ed.riwayat.filter(function (p) { return p.l === 'semua'; }).length;
        while (ed.riwayat.length > 200 || penuh > 12) { if (ed.riwayat.shift().l === 'semua') penuh--; }
    }
    function pasang(p) {
        var balik = { l: p.l, ti: p.ti, b: p.b, cur: kursor() };
        if (p.l === 'birama') { balik.data = JSON.stringify(barJ(p.ti, p.b)); ed.s.tracks[p.ti].staves[0].bars[p.b] = JSON.parse(p.data); }
        else { balik.data = JSON.stringify(ed.s); ed.s = JSON.parse(p.data); }
        ed.b = p.cur[0]; ed.i = p.cur[1]; ed.str = p.cur[2]; ed.ti = Math.min(p.cur[3], ed.s.tracks.length - 1);
        return balik;
    }
    function batal() { var p = ed.riwayat.pop(); if (p) pasang(p); }
    function urungkan() { var p = ed.riwayat.pop(); if (!p) return; ed.maju.push(pasang(p)); gambarUlang(true); }
    function ulangi() { var p = ed.maju.pop(); if (!p) return; ed.riwayat.push(pasang(p)); gambarUlang(true); }

    /* ================= menggambar & kursor ================= */
    function render() { bersih(); batasKursor(); ed.gulir = main.scrollTop; P.pakai(ed.s); simpanDraf(); tampilPanel(); }
    function gambarUlang(semua) {
        bersih(); batasKursor(); ed.gulir = main.scrollTop;
        if (semua) { isiPilihTrack(); P.mulaiEdit(ed.ti, ed.s); } else P.pakai(ed.s);
        simpanDraf(); tampilPanel();
    }
    var paper = $('.sc-paper'), kursorEl = document.createElement('div');
    kursorEl.className = 'ed-kursor'; kursorEl.hidden = true; kursorEl.innerHTML = '<div class="ed-sel"></div>';
    paper.appendChild(kursorEl);
    function beatRender() {
        var t = at.score && at.score.tracks[ed.ti], bar = t && t.staves[0].bars[ed.b];
        return bar && bar.voices[0] ? bar.voices[0].beats[ed.i] : null;
    }
    /* saat mengedit hanya satu instrumen yang tampil; di tampilan not balok + tab kotak tab ada paling bawah */
    function kotakTab(bb) {
        return bb.barBounds.masterBarBounds.bars.reduce(function (a, x) { return x.visualBounds.y > a.visualBounds.y ? x : a; }, bb.barBounds);
    }
    function posisiKursor(gulir) {
        var beat = ed.on && beatRender(), bl = at.boundsLookup, bb = beat && bl && bl.findBeat(beat), surf = $('#at .at-surface');
        if (!bb || !surf) { kursorEl.hidden = true; return; }
        var n = nSenar(), tab = kotakTab(bb).visualBounds, jarak = tab.h / Math.max(1, n - 1);
        var sr = surf.getBoundingClientRect(), pr = paper.getBoundingClientRect();
        var cx = bb.onNotesX || bb.visualBounds.x + bb.visualBounds.w / 2, w = Math.max(18, jarak * 2);
        kursorEl.hidden = false;
        kursorEl.style.left = (sr.left - pr.left + cx - w / 2) + 'px';
        kursorEl.style.top = (sr.top - pr.top + tab.y - jarak * 0.75) + 'px';
        kursorEl.style.width = w + 'px';
        kursorEl.style.height = (tab.h + jarak * 1.5) + 'px';
        var sel = kursorEl.firstChild;
        sel.style.top = (jarak * 0.75 + (n - ed.str) * jarak - jarak * 0.6) + 'px';
        sel.style.height = (jarak * 1.2) + 'px';
        if (gulir) lihatKursor();
    }
    /* kursor selalu terlihat: di antara kepala (atas) dan panel editor (bawah) */
    function lihatKursor() {
        var r = kursorEl.getBoundingClientRect(), atas = $('#kepala').getBoundingClientRect().bottom + 8;
        var bawah = window.innerHeight - 8, pn = panel.getBoundingClientRect();
        if (pn.top > atas + 80 && pn.top < window.innerHeight) bawah = pn.top - 8;
        var tr = $('#transport').getBoundingClientRect();
        if (tr.height && tr.top < bawah && tr.top > atas + 80) bawah = tr.top - 8;
        if (r.top < atas) main.scrollTop -= atas - r.top + 24;
        else if (r.bottom > bawah) main.scrollTop += r.bottom - bawah + 24;
    }
    /* posisi not (boundsLookup) baru diperbarui setelah postRenderFinished, bukan renderFinished */
    (at.postRenderFinished || at.renderFinished).on(function () {
        if (!ed.on) return;
        if (ed.gulir !== null) { main.scrollTop = ed.gulir; ed.gulir = null; }
        try { posisiKursor(true); } catch (e) { kursorEl.hidden = true; }
        if (ed.putarNot) {
            ed.putarNot = false;
            var bt = beatRender(), n = bt && bt.notes.filter(function (x) { return x.string === ed.str; })[0];
            try { if (n && at.isReadyForPlayback && at.playNote) at.playNote(n); } catch (e) {}
        }
    });
    window.addEventListener('resize', function () { if (ed.on) posisiKursor(false); });

    /* ketuk / klik di partitur: pilih ketukan, dan senar bila yang diketuk bagian tab */
    $('#at').addEventListener('click', function (e) {
        if (!ed.on || !at.boundsLookup) return;
        var surf = $('#at .at-surface'); if (!surf) return;
        var r = surf.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        var beat = null; try { beat = at.boundsLookup.getBeatAtPos(x, y); } catch (er) {}
        if (!beat) return;
        var bar = beat.voice.bar; if (bar.staff.track.index !== ed.ti) return;
        var b0 = bar.voices[0].beats, i = beat.index;
        if (beat.voice.index !== 0) { i = 0; b0.forEach(function (x, k) { if (x.playbackStart <= beat.playbackStart) i = k; }); }
        ed.b = bar.index; ed.i = i; ed.puluh = null;
        var bb = at.boundsLookup.findBeat(b0[i]);
        if (bb) {
            var tab = kotakTab(bb).visualBounds, n = nSenar(), jarak = tab.h / Math.max(1, n - 1);
            if (y > tab.y - jarak && y < tab.y + tab.h + jarak) ed.str = Math.max(1, Math.min(n, n - Math.round((y - tab.y) / jarak)));
        }
        posisiKursor(false); tampilPanel();
    });

    /* ================= menulis ================= */
    function kabar(t) {
        var el = $('#ed-pesan'); el.textContent = t; el.hidden = !t;
        clearTimeout(kabar.t); if (t) kabar.t = setTimeout(function () { el.hidden = true; }, 4500);
    }
    function pasangFret(f, lanjutan) {
        if (!lanjutan) catat('birama');
        var bt = beatIni();
        if (diam(bt)) {
            if (panjang(bt) !== panjangSpek(ed.dur)) ubahDurasi(ed.b, ed.i, ed.dur);
            bt = beatIni(); bt.isempty = false; bt.notes = bt.notes || [];
        }
        var n = cariNot(bt, ed.str);
        if (n) { n.fret = f; n.isdead = false; n.istiedestination = false; }
        else bt.notes.push({ fret: f, string: ed.str });
        ed.putarNot = ed.bunyi;
        render();
    }
    /* dua angka cepat berturut-turut = fret 10-24 */
    function ketikAngka(d) {
        var p = ed.puluh, now = Date.now();
        if (p && p.b === ed.b && p.i === ed.i && p.s === ed.str && now - p.t < 1000 && p.v * 10 + d <= 24) { ed.puluh = null; pasangFret(p.v * 10 + d, true); return; }
        ed.puluh = d <= 2 ? { v: d, t: now, b: ed.b, i: ed.i, s: ed.str } : null;
        pasangFret(d);
    }
    function tambahSepuluh() {
        var n = cariNot(beatIni(), ed.str);
        if (!n) { kabar('Ketik angka fret dulu, lalu +10 (contoh: 2 lalu +10 = fret 12).'); return; }
        if (n.fret + 10 > 24) { kabar('Fret paling tinggi 24.'); return; }
        catat('birama'); n.fret += 10; ed.putarNot = ed.bunyi; render();
    }
    function jadiDiam() {
        var bt = beatIni(); if (diam(bt)) return;
        catat('birama'); bt.notes = []; render();
    }
    function hapus() {
        var bs = beatsJ(ed.b), bt = bs[ed.i], n = cariNot(bt, ed.str);
        if (n) { catat('birama'); bt.notes.splice(bt.notes.indexOf(n), 1); }
        else if (!diam(bt)) { catat('birama'); bt.notes = []; }
        else if (bs.length > 1) {
            /* ketukan diam dihapus: not sesudahnya maju, sisa birama diisi diam di akhir */
            catat('birama');
            var oto = bt.automations; bs.splice(ed.i, 1);
            if (ed.i === 0 && oto && oto.length) bs[0].automations = (bs[0].automations || []).concat(oto);
            rapikanEkor(ed.b);
            ed.i = Math.min(ed.i, bs.length - 1);
        } else { kiri(); return; }
        render();
    }
    /* sisipkan ketukan diam di posisi kursor; diam di akhir birama dipangkas supaya tetap muat */
    function sisip() {
        catat('birama');
        var bs = beatsJ(ed.b), cap = kapasitas(ed.b), baru = beatBaru(ed.dur);
        if (ed.i === 0 && bs[0].automations && bs[0].automations.length) { baru.automations = bs[0].automations; bs[0].automations = []; }
        bs.splice(ed.i, 0, baru);
        while (jumlah(bs) > cap && bs.length > ed.i + 1 && diam(bs[bs.length - 1])) bs.pop();
        if (jumlah(bs) > cap) { batal(); kabar('Birama ini sudah penuh. Hapus not di akhir birama dulu, atau tambah birama.'); return; }
        if (jumlah(bs) < cap) sisipkan(bs, bs.length, isiDiam(jumlah(bs), cap));
        render();
    }
    function pilihDurasi(sp) {
        ed.dur = sp;
        var bt = beatIni();
        if (!diam(bt)) {
            catat('birama');
            if (!ubahDurasi(ed.b, ed.i, sp)) { batal(); kabar('Tidak cukup ruang di birama ini. Hapus atau pendekkan not sesudahnya dulu.'); }
            else { render(); return; }
        }
        tampilPanel();
    }
    function spekKini() { var bt = beatIni(); return diam(bt) ? ed.dur : spekBeat(bt); }
    function geserDurasi(arah) {
        var sp = spekKini(), k = DURASI.indexOf(sp.d); if (k < 0) k = 2;
        k = Math.max(0, Math.min(DURASI.length - 1, k + arah));
        pilihDurasi({ d: DURASI[k], dots: sp.dots, tup: sp.tup });
    }
    /* teknik: berlaku untuk not di senar terpilih, atau semua not di ketukan itu */
    function notSebelum(s) {
        var b = ed.b, i = ed.i - 1;
        while (b >= 0) {
            var bs = beatsJ(b); if (i < 0) i = bs.length - 1;
            for (; i >= 0; i--) { var n = cariNot(bs[i], s); if (n) return n; if (!diam(bs[i])) return null; }
            b--; i = -1;
        }
        return null;
    }
    var EFEK = {
        hammer: { cek: function (n) { return !!n.ishammerpullorigin; }, atur: function (n, on) { n.ishammerpullorigin = on; } },
        slide: { cek: function (n) { return n.slideouttype === 2; }, atur: function (n, on) { n.slideouttype = on ? 2 : 0; } },
        bend: { cek: function (n) { return n.bendtype > 0; }, atur: function (n, on) { n.bendtype = on ? 2 : 0; n.bendpoints = on ? [{ offset: 0, value: 0 }, { offset: 60, value: 4 }] : []; } },
        vibrato: { cek: function (n) { return n.vibrato > 0; }, atur: function (n, on) { n.vibrato = on ? 1 : 0; } },
        pm: { cek: function (n) { return !!n.ispalmmute; }, atur: function (n, on) { n.ispalmmute = on; } },
        mati: { cek: function (n) { return !!n.isdead; }, atur: function (n, on) { n.isdead = on; } },
        ring: { cek: function (n) { return !!n.isletring; }, atur: function (n, on) { n.isletring = on; } },
        sambung: {
            cek: function (n) { return !!n.istiedestination; },
            atur: function (n, on) { var asal = on && notSebelum(n.string); if (on && !asal) return; n.istiedestination = on; if (asal) n.fret = asal.fret; }
        }
    };
    function notTerpilih() { var bt = beatIni(), n = cariNot(bt, ed.str); return n ? [n] : diam(bt) ? [] : bt.notes; }
    function efek(nama) {
        var ns = notTerpilih();
        if (!ns.length) { kabar('Pilih not dulu (ketuk angka di tab), lalu pasang tekniknya.'); return; }
        if (nama === 'sambung' && !notSebelum(ns[0].string)) { kabar('Sambung (tie) butuh not di senar yang sama sebelumnya.'); return; }
        catat('birama');
        var on = !EFEK[nama].cek(ns[0]);
        ns.forEach(function (n) { EFEK[nama].atur(n, on); });
        render();
    }
    function aturChord(nama) {
        var st = stf(), bt = beatIni();
        nama = String(nama || '').trim().slice(0, 16);
        catat('birama');
        if (!nama) delete bt.chordid;
        else {
            st.chords = st.chords || {};
            var id = Object.keys(st.chords).filter(function (k) { return st.chords[k] && st.chords[k].name === nama; })[0];
            if (!id) { id = 'ed-' + nama; st.chords[id] = { name: nama, firstfret: 1, strings: [], barrefrets: [], showname: true, showdiagram: true, showfingering: false }; }
            bt.chordid = id;
        }
        render();
    }

    /* ================= birama & instrumen ================= */
    function barKosong(contoh, cap) {
        var b = {};
        ['clef', 'clefottava', 'keysignature', 'keysignaturetype', 'displayscale'].forEach(function (k) { if (contoh && k in contoh) b[k] = contoh[k]; });
        b.voices = [{ beats: isiDiam(0, cap) }];
        return b;
    }
    function tambahBirama(setelah) {
        catat('semua');
        var lama = ed.s.masterbars[setelah];
        ed.s.masterbars.splice(setelah + 1, 0, { timesignaturenumerator: lama.timesignaturenumerator, timesignaturedenominator: lama.timesignaturedenominator, tripletfeel: lama.tripletfeel || 0, tempoautomations: [] });
        var cap = kapasitas(setelah + 1);
        ed.s.tracks.forEach(function (t) { t.staves.forEach(function (st) { st.bars.splice(setelah + 1, 0, barKosong(st.bars[setelah], cap)); }); });
    }
    function hapusBirama() {
        if (ed.s.masterbars.length < 2) { kabar('Lagu minimal satu birama.'); return; }
        catat('semua');
        var b = ed.b, mb = ed.s.masterbars.splice(b, 1)[0];
        if (b === 0 && mb.tempoautomations && mb.tempoautomations.length && !(ed.s.masterbars[0].tempoautomations || []).length) ed.s.masterbars[0].tempoautomations = mb.tempoautomations;
        ed.s.tracks.forEach(function (t) {
            t.staves.forEach(function (st) {
                var lama = st.bars.splice(b, 1)[0], oto = lama.voices && lama.voices[0] && lama.voices[0].beats[0] && lama.voices[0].beats[0].automations;
                var b0 = b === 0 && st.bars[0].voices && st.bars[0].voices[0] && st.bars[0].voices[0].beats[0];
                if (b0 && oto && oto.length) b0.automations = (b0.automations || []).concat(oto);
            });
        });
        ed.i = 0; render();
    }
    function kanan() {
        ed.puluh = null;
        if (ed.i < beatsJ(ed.b).length - 1) ed.i++;
        else if (ed.b < ed.s.masterbars.length - 1) { ed.b++; ed.i = 0; }
        else {
            /* di ujung lagu: birama baru dibuat bila birama terakhir sudah berisi not */
            if (!beatsJ(ed.b).some(function (x) { return !diam(x); })) return;
            tambahBirama(ed.b); ed.b++; ed.i = 0; render(); return;
        }
        posisiKursor(true); tampilPanel();
    }
    function kiri() {
        ed.puluh = null;
        if (ed.i > 0) ed.i--;
        else if (ed.b > 0) { ed.b--; ed.i = beatsJ(ed.b).length - 1; }
        posisiKursor(true); tampilPanel();
    }
    function pindahBirama(arah) {
        ed.puluh = null; ed.b = Math.max(0, Math.min(ed.s.masterbars.length - 1, ed.b + arah)); ed.i = 0;
        posisiKursor(true); tampilPanel();
    }
    function pindahSenar(arah) { ed.puluh = null; ed.str = Math.max(1, Math.min(nSenar(), ed.str + arah)); posisiKursor(true); tampilPanel(); }

    function aturTempo(v) {
        v = Math.max(30, Math.min(300, Math.round(v) || 0)); if (!v) return;
        catat('semua');
        var m0 = ed.s.masterbars[0], lain = (m0.tempoautomations || []).filter(function (a) { return a.ratioposition > 0; });
        m0.tempoautomations = [{ type: 0, value: v, ratioposition: 0, islinear: false, text: '', isvisible: true }].concat(lain);
        ed.s.tempo = v;
        render();
    }
    function aturBirama(n, d) {
        catat('semua');
        for (var k = ed.b; k < ed.s.masterbars.length; k++) {
            var m = ed.s.masterbars[k]; m.timesignaturenumerator = n; m.timesignaturedenominator = d; m.timesignaturecommon = false;
        }
        ed.s.tracks.forEach(function (t) { t.staves.forEach(function (st) { for (var k2 = ed.b; k2 < st.bars.length; k2++) pasPanjang(st.bars[k2], kapasitas(k2)); }); });
        render();
    }
    /* instrumen baru dibuat lewat alphaTex lalu digabung; diberi kanal suara sendiri supaya bunyinya tidak tertukar */
    function trackBaru(jenis) {
        var a = ALAT[jenis], isi = [];
        for (var k = 0; k < ed.s.masterbars.length; k++) isi.push('r.4');
        var nama = a.nama, ke = 1;
        while (ed.s.tracks.some(function (t) { return t.name === nama; })) nama = a.nama + ' ' + (++ke);
        var imp = new alphaTab.importer.AlphaTexImporter();
        imp.initFromString('\\track "' + nama + '" { instrument ' + a.program + ' }\n\\staff { ' + a.staff + ' }\n\\tuning (' + a.tuning + ')\n' + isi.join(' | '), at.settings);
        var t = polos(JSONC.scoreToJsObject(imp.readScore())).tracks[0], pakai = {}, bebas = [];
        ed.s.tracks.forEach(function (x) { if (x.playbackinfo) { pakai[x.playbackinfo.primarychannel] = 1; pakai[x.playbackinfo.secondarychannel] = 1; } });
        for (var c = 0; c < 16 && bebas.length < 2; c++) if (c !== 9 && !pakai[c]) bebas.push(c);
        if (bebas.length) { t.playbackinfo.primarychannel = bebas[0]; t.playbackinfo.secondarychannel = bebas[1] === undefined ? bebas[0] : bebas[1]; }
        return t;
    }
    function tambahTrack(jenis) {
        catat('semua');
        ed.s.tracks.push(trackBaru(jenis));
        ed.ti = ed.s.tracks.length - 1; ed.i = 0; ed.str = nSenar();
        rapikanTrack(ed.ti);
        gambarUlang(true);
        kabar(ALAT[jenis].nama + ' ditambahkan ke lagu ini.');
    }
    function gantiTrack(ti) {
        ed.ti = ti; ed.i = 0; ed.puluh = null; ed.str = nSenar();
        rapikanTrack(ti);
        gambarUlang(true);
    }

    /* ================= buka / tutup editor ================= */
    var panel = $('#editor');
    function pilihAwal() {
        var t = ed.s.tracks, gitar = -1, senar = -1;
        t.forEach(function (x, k) { if (bersenar(x)) { if (senar < 0) senar = k; if (gitar < 0 && tuning(x.staves[0]).length >= 6) gitar = k; } });
        return gitar >= 0 ? gitar : senar;
    }
    function buka(ti) {
        var d = P.skor(); if (!d) return;
        ed.s = JSON.parse(JSON.stringify(polos(d)));
        if (ti === null || ti === undefined || !ed.s.tracks[ti] || !bersenar(ed.s.tracks[ti])) ti = pilihAwal();
        var baruDitambah = false;
        if (ti < 0) { ed.s.tracks.push(trackBaru('gitar')); ti = ed.s.tracks.length - 1; baruDitambah = true; }
        ed.ti = ti; ed.b = 0; ed.i = 0; ed.str = nSenar(); ed.puluh = null; ed.riwayat = []; ed.maju = [];
        var bt0 = null;
        rapikanTrack(ti);
        bt0 = beatsJ(0)[0]; if (bt0 && !diam(bt0)) ed.dur = spekBeat(bt0);
        ed.on = true;
        main.classList.add('edit-on'); panel.hidden = false; panel.classList.remove('info');
        P.tutupLembar();
        isiPilihTrack(); bersih();
        ed.gulir = null; main.scrollTop = 0;
        P.mulaiEdit(ed.ti, ed.s);
        tampilPanel(); ukurPanel();
        kabar(baruDitambah ? 'Lagu ini belum punya gitar, bass, atau ukulele, jadi ditambahkan Gitar baru. Piano, drum, dan vokal: pakai Mode teks dulu.' : '');
    }
    /* tanpaGambar: lagu lain sedang dimuat, jadi tidak perlu menggambar ulang */
    function tutup(tanpaGambar) {
        if (!ed.on) return;
        ed.on = false; kursorEl.hidden = true; panel.hidden = true; $('#ed-chord').hidden = true;
        main.classList.remove('edit-on');
        if (!tanpaGambar) P.selesaiEdit();
    }
    function baru(jenis) {
        var a = ALAT[jenis] || ALAT.gitar;
        P.muatTeksBaru(['\\title "Lagu saya"', '\\hideDynamics', '\\track "' + a.nama + '" { instrument ' + a.program + ' }', '  \\staff { ' + a.staff + ' }', '  \\tuning (' + a.tuning + ')', '  \\ts 4 4 \\tempo 90', '  r.1 | r.1 | r.1 | r.1'].join('\n'));
        ed.dur = { d: 4, dots: 0, tup: false };
        buka(0);
    }

    /* tulisan terakhir disimpan di perangkat ini */
    var tDraf = 0;
    function simpanDraf() {
        clearTimeout(tDraf);
        tDraf = setTimeout(function () {
            if (!ed.s) return;
            try {
                localStorage.setItem(KUNCI_DRAF, JSON.stringify({ v: 1, ti: ed.ti, s: ed.s }));
                localStorage.setItem(KUNCI_INFO, JSON.stringify({ judul: ed.s.title || 'Lagu saya', waktu: Date.now() }));
            } catch (e) { try { localStorage.removeItem(KUNCI_DRAF); localStorage.removeItem(KUNCI_INFO); } catch (e2) {} }
            tampilDraf();
        }, 800);
    }
    function tampilDraf() {
        var info = null; try { info = JSON.parse(localStorage.getItem(KUNCI_INFO) || 'null'); } catch (e) {}
        $('#ed-draf').hidden = !info;
        if (info) $('#ed-draf-info').textContent = info.judul + ' · ' + new Date(info.waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    $('#ed-draf').addEventListener('click', function () {
        var d = null; try { d = JSON.parse(localStorage.getItem(KUNCI_DRAF) || 'null'); } catch (e) {}
        if (!d || !d.s) { kabar(''); P.pesan('Tulisan terakhir tidak bisa dibuka.', true); return; }
        P.tutupLembar();
        try { P.muatJson(d.s); } catch (e) { P.pesan('Tulisan terakhir tidak bisa dibuka.', true); return; }
        buka(d.ti);
    });

    /* ================= panel editor ================= */
    function isiPilihTrack() {
        $('#ed-track').innerHTML = ed.s.tracks.map(function (t, k) {
            return bersenar(t) ? '<option value="' + k + '">' + P.esc(t.name || 'Instrumen ' + (k + 1)) + ' (' + tuning(t.staves[0]).length + ' senar)</option>' : '';
        }).join('') + '<optgroup label="Tambah instrumen"><option value="+gitar">+ Gitar</option><option value="+bass">+ Bass</option><option value="+ukulele">+ Ukulele</option></optgroup>';
        $('#ed-track').value = String(ed.ti);
    }
    /* senar paling tinggi ditulis kecil bila namanya sama dengan senar lain (e pada gitar) */
    function namaSenar(s) {
        var tun = tuning(stf()), n = tun.length, m = tun[n - s]; if (m === undefined) return String(s);
        var nm = NAMA[m % 12], kembar = tun.some(function (x, k) { return k !== n - s && x % 12 === m % 12; });
        return s === n && kembar ? nm.toLowerCase() : nm;
    }
    function tampilPanel() {
        if (!ed.on) return;
        batasKursor();
        var bt = beatIni(), n = nSenar(), sp = spekKini();
        $$('#editor [data-dur]').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.dur === sp.d); });
        $('#ed-titik').setAttribute('aria-pressed', sp.dots > 0);
        $('#ed-triol').setAttribute('aria-pressed', !!sp.tup);
        var senar = $('#ed-senar');
        if (senar.children.length !== n) {
            var h = ''; for (var s = n; s >= 1; s--) h += '<button type="button" data-s="' + s + '" aria-pressed="false"><span></span><b></b></button>';
            senar.innerHTML = h; senar.style.gridTemplateRows = 'repeat(' + n + ', minmax(0, 1fr))';
        }
        $$('#ed-senar [data-s]').forEach(function (b) {
            var s = +b.dataset.s, nt = cariNot(bt, s);
            b.setAttribute('aria-pressed', s === ed.str);
            b.firstChild.textContent = namaSenar(s);
            b.lastChild.textContent = nt ? (nt.isdead ? 'x' : nt.fret) : '–';
        });
        var ns = notTerpilih();
        $$('#editor [data-efek]').forEach(function (b) { b.setAttribute('aria-pressed', !!ns.length && EFEK[b.dataset.efek].cek(ns[0])); });
        var ch = bt.chordid && stf().chords && stf().chords[bt.chordid];
        $('#ed-chord-btn').setAttribute('aria-pressed', !!ch);
        $('#ed-chord-btn').textContent = ch ? 'Chord ' + ch.name : 'Chord';
        $('#ed-urung').disabled = !ed.riwayat.length; $('#ed-ulang').disabled = !ed.maju.length;
        $('#ed-bunyi').setAttribute('aria-pressed', ed.bunyi);
        var mb = ed.s.masterbars[ed.b], ts = mb.timesignaturenumerator + '/' + mb.timesignaturedenominator, sel = $('#ed-ts');
        if (![].some.call(sel.options, function (o) { return o.value === ts; })) { var o = document.createElement('option'); o.value = ts; o.textContent = ts; sel.appendChild(o); }
        sel.value = ts;
        if (document.activeElement !== $('#ed-judul')) $('#ed-judul').value = ed.s.title || '';
        if (document.activeElement !== $('#ed-tempo')) $('#ed-tempo').value = Math.round(ed.s.tempo || (mb.tempoautomations && mb.tempoautomations[0] && mb.tempoautomations[0].value) || 120);
        $('#ed-posisi').textContent = 'Birama ' + (ed.b + 1) + '/' + ed.s.masterbars.length + ' · ketukan ' + (ed.i + 1) + ' · senar ' + (n - ed.str + 1) + ' (' + namaSenar(ed.str) + ')';
    }
    /* tinggi panel dipakai sebagai ruang kosong di bawah partitur (HP) */
    function ukurPanel() { if (ed.on) main.style.setProperty('--ed-h', panel.offsetHeight + 'px'); }
    if (window.ResizeObserver) new ResizeObserver(ukurPanel).observe(panel);

    $('#ed-mulai').addEventListener('click', function () { buka(null); });
    $('#ed-lagu-ini').addEventListener('click', function () { buka(null); });
    $('#ed-selesai').addEventListener('click', function () { tutup(false); });
    $('#ed-track').addEventListener('change', function () {
        var v = this.value; this.blur();
        if (v.charAt(0) === '+') tambahTrack(v.slice(1)); else gantiTrack(+v);
    });
    $('#ed-urung').addEventListener('click', urungkan);
    $('#ed-ulang').addEventListener('click', ulangi);
    $('#ed-putar').addEventListener('click', function () { if (at.isReadyForPlayback) at.playPause(); });
    at.playerStateChanged.on(function (e) {
        var on = e.state === alphaTab.synth.PlayerState.Playing, b = $('#ed-putar');
        main.classList.toggle('ed-main', on);
        b.textContent = on ? '❚❚' : '▶'; b.setAttribute('aria-label', on ? 'Jeda' : 'Putar');
    });
    $('#ed-senar').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) { ed.str = +b.dataset.s; ed.puluh = null; posisiKursor(true); tampilPanel(); } });
    panel.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || !ed.on) return;
        if (b.dataset.dur) { pilihDurasi({ d: +b.dataset.dur, dots: 0, tup: false }); return; }
        if (b.dataset.angka) { ketikAngka(+b.dataset.angka); return; }
        if (b.dataset.efek) { efek(b.dataset.efek); return; }
        var a = b.dataset.aksi;
        if (a === 'titik') { var sp = spekKini(); pilihDurasi({ d: sp.d, dots: sp.dots ? 0 : 1, tup: sp.tup }); }
        else if (a === 'triol') { var sp2 = spekKini(); pilihDurasi({ d: sp2.d, dots: sp2.dots, tup: !sp2.tup }); }
        else if (a === 'hapus') hapus();
        else if (a === 'kiri') kiri();
        else if (a === 'kanan') kanan();
        else if (a === 'plus10') tambahSepuluh();
        else if (a === 'diam') jadiDiam();
        else if (a === 'sisip') sisip();
        else if (a === 'tambah-birama') { tambahBirama(ed.b); ed.b++; ed.i = 0; render(); }
        else if (a === 'hapus-birama') hapusBirama();
        else if (a === 'info') { panel.classList.toggle('info'); b.setAttribute('aria-pressed', panel.classList.contains('info')); }
        else if (a === 'bunyi') { ed.bunyi = !ed.bunyi; tampilPanel(); }
        else if (a === 'chord') bukaChord();
    });
    /* nama chord di atas ketukan */
    function bukaChord() {
        var bt = beatIni(), ch = bt.chordid && stf().chords && stf().chords[bt.chordid];
        $('#ed-chord').hidden = false; $('#ed-chord-in').value = ch ? ch.name : ''; $('#ed-chord-in').focus();
    }
    function tutupChord() { $('#ed-chord').hidden = true; }
    $('#ed-chord-ok').addEventListener('click', function () { aturChord($('#ed-chord-in').value); tutupChord(); });
    $('#ed-chord-x').addEventListener('click', function () { aturChord(''); tutupChord(); });
    $('#ed-chord-in').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); aturChord(this.value); tutupChord(); }
        else if (e.key === 'Escape') tutupChord();
    });
    /* judul, tempo, tanda birama */
    var tJudul = 0;
    $('#ed-judul').addEventListener('input', function () {
        var v = this.value;
        clearTimeout(tJudul); tJudul = setTimeout(function () { ed.s.title = v.trim() || 'Lagu saya'; P.aturJudul(ed.s.title); render(); }, 600);
    });
    $('#ed-tempo').addEventListener('change', function () { aturTempo(+this.value); });
    $('#ed-ts').addEventListener('change', function () { var p = this.value.split('/'); this.blur(); aturBirama(+p[0], +p[1]); });

    /* keyboard (komputer) */
    document.addEventListener('keydown', function (e) {
        if (!ed.on || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
        var k = e.key, ctrl = e.ctrlKey || e.metaKey, kecil = k.length === 1 ? k.toLowerCase() : k;
        if (ctrl) {
            if (kecil === 'z') { e.preventDefault(); if (e.shiftKey) ulangi(); else urungkan(); }
            else if (kecil === 'y') { e.preventDefault(); ulangi(); }
            else if (k === 'Enter') { e.preventDefault(); tambahBirama(ed.b); ed.b++; ed.i = 0; render(); }
            else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); pindahBirama(k === 'ArrowLeft' ? -1 : 1); }
            return;
        }
        var aksi = {
            ArrowLeft: kiri, ArrowRight: kanan, ArrowUp: function () { pindahSenar(1); }, ArrowDown: function () { pindahSenar(-1); },
            Backspace: hapus, Delete: hapus, Insert: sisip, Home: function () { ed.i = 0; posisiKursor(true); tampilPanel(); },
            End: function () { ed.i = beatsJ(ed.b).length - 1; posisiKursor(true); tampilPanel(); },
            '.': function () { var sp = spekKini(); pilihDurasi({ d: sp.d, dots: sp.dots ? 0 : 1, tup: sp.tup }); },
            t: function () { var sp = spekKini(); pilihDurasi({ d: sp.d, dots: sp.dots, tup: !sp.tup }); },
            r: jadiDiam, '-': function () { geserDurasi(1); }, '+': function () { geserDurasi(-1); }, '=': function () { geserDurasi(-1); },
            h: function () { efek('hammer'); }, s: function () { efek('slide'); }, b: function () { efek('bend'); }, v: function () { efek('vibrato'); },
            p: function () { efek('pm'); }, x: function () { efek('mati'); }, l: function () { efek('sambung'); }, i: function () { efek('ring'); },
            c: bukaChord
        }[kecil];
        if (/^[0-9]$/.test(k)) aksi = function () { ketikAngka(+k); };
        if (!aksi) return;
        e.preventDefault(); aksi();
    });

    tampilDraf();
    window.PartiturEdit = { baru: baru, buka: buka, tutup: tutup, _ed: ed };
})();
