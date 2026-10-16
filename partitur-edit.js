/* Editor ketuk-ketik (seperti Guitar Pro) di partitur.html untuk semua instrumen:
   - gitar, bass, ukulele: ketuk posisi di tab lalu angka fret (keypad di HP, keyboard di komputer)
   - piano, vokal, melodi: tuts piano di layar (atau tombol keyboard komputer, juga not angka 1-7)
   - drum: kisi pukulan per birama
   - lirik per not untuk instrumen bernada
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
    /* instrumen baru dibuat lewat alphaTex: {N} nama, {B} birama staf pertama, {K} birama staf kedua (tangan kiri piano) */
    var ALAT = {
        gitar: { nama: 'Gitar', tex: '\\track "{N}" { instrument 25 }\n\\staff { score tabs }\n\\tuning (E4 B3 G3 D3 A2 E2)\n{B}' },
        bass: { nama: 'Bass', tex: '\\track "{N}" { instrument 33 }\n\\staff { tabs }\n\\tuning (G2 D2 A1 E1)\n{B}' },
        ukulele: { nama: 'Ukulele', tex: '\\track "{N}" { instrument 24 }\n\\staff { score tabs }\n\\tuning (A4 E4 C4 G4)\n{B}' },
        piano: { nama: 'Piano', tex: '\\track "{N}" { instrument 0 }\n\\staff { score }\n\\tuning piano\n{B}\n\\staff { score }\n\\tuning piano\n\\clef F4\n{K}' },
        vokal: { nama: 'Vokal', tex: '\\track "{N}" { instrument 53 }\n\\staff { score }\n\\tuning voice\n{B}' },
        drum: { nama: 'Drum', tex: '\\track "{N}"\n\\instrument percussion\n\\clef neutral\n\\articulation defaults\n{B}' }
    };
    /* baris kisi drum (atas ke bawah seperti partitur drum); m = nomor MIDI yang dianggap baris yang sama */
    var PAD = [
        { n: 'Crash', a: 'CrashHighHit', m: [49, 57, 52, 55] },
        { n: 'Ride', a: 'RideMiddle', m: [51, 53, 59] },
        { n: 'Hi-hat', a: 'HiHatClosed', m: [42, 44] },
        { n: 'HH buka', a: 'HiHatOpen', m: [46] },
        { n: 'Tom 1', a: 'HighTomHit', m: [48, 50] },
        { n: 'Tom 2', a: 'MidTomHit', m: [47, 45] },
        { n: 'Snare', a: 'SnareHit', m: [38, 40, 37] },
        { n: 'Floor', a: 'LowFloorTomHit', m: [41, 43] },
        { n: 'Kick', a: 'KickHit', m: [35, 36] }
    ];
    /* pukulan drum mengisi sampai pukulan berikutnya dengan not terpanjang yang muat */
    var MUAT = [{ d: 1 }, { d: 2, dots: 1 }, { d: 2 }, { d: 4, dots: 1 }, { d: 4 }, { d: 8, dots: 1 }, { d: 8 }, { d: 16, dots: 1 }, { d: 16 }, { d: 32 }];
    /* keadaan editor: s = lagu (JSON), ti/si = instrumen & staf, jenis = senar | piano | drum,
       b = birama, i = ketukan, str = senar (1 = paling rendah), okt = oktaf tuts piano, res = kisi drum (tick) */
    var ed = {
        on: false, s: null, ti: 0, si: 0, jenis: 'senar', b: 0, i: 0, str: 1, okt: 4, akor: false, res: 240,
        dur: { d: 4, dots: 0, tup: false }, riwayat: [], maju: [], puluh: null, bunyi: true, setelah: null, gulir: null, idBaru: 1e9
    };

    /* ================= data lagu ================= */
    function polos(o) {
        if (o instanceof Map) { var r = {}; o.forEach(function (v, k) { r[k] = polos(v); }); return r; }
        if (Array.isArray(o)) return o.map(polos);
        return o;
    }
    function imporTex(tex) { var imp = new alphaTab.importer.AlphaTexImporter(); imp.initFromString(tex, at.settings); return imp.readScore(); }
    function tuning(st) { return (st && st.stringtuning && st.stringtuning.tunings) || []; }
    function jenisStaf(st) { return !st ? 'senar' : st.ispercussion ? 'drum' : tuning(st).length ? 'senar' : 'piano'; }
    function trk() { return ed.s.tracks[ed.ti]; }
    function stf() { return trk().staves[ed.si]; }
    function nSenar() { return tuning(stf()).length; }
    function barJ(ti, si, b) { return ed.s.tracks[ti].staves[si].bars[b]; }
    function beatsJ(b) {
        var bar = barJ(ed.ti, ed.si, b);
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
    /* diam tanpa chord/teks/lirik/perubahan instrumen boleh digabung atau dipecah ulang */
    function diamPolos(bt) { return diam(bt) && !bt.chordid && !bt.text && !(bt.lyrics && bt.lyrics.length) && !(bt.automations && bt.automations.length); }
    function cariNot(bt, s) { return (bt.notes || []).filter(function (n) { return n.string === s; })[0] || null; }
    function terapkanSpek(bt, sp) {
        bt.duration = sp.d; bt.dots = sp.dots || 0; bt.isempty = false;
        bt.tupletnumerator = sp.tup ? 3 : -1; bt.tupletdenominator = sp.tup ? 2 : -1;
        return bt;
    }
    function beatBaru(sp) { return terapkanSpek({ notes: [] }, sp); }
    function panjangSpek(sp) { return panjang(beatBaru(sp)); }
    function spekBeat(bt) { return { d: bt.duration, dots: bt.dots || 0, tup: bt.tupletnumerator === 3 && bt.tupletdenominator === 2 }; }
    /* nada not: piano memakai oktaf + nada (C4 = 5 x 12 + 0), drum memakai daftar artikulasi instrumennya */
    function midiNot(n) { return ed.jenis === 'drum' ? midiDrum(trk(), n) : n.octave * 12 + n.tone; }
    function notPiano(m) { return { octave: Math.floor(m / 12), tone: m % 12 }; }
    function namaNada(m) { return NAMA[m % 12] + (Math.floor(m / 12) - 1); }
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
        ed.s.tracks[ti].staves.forEach(function (st) { st.bars.forEach(function (bar, k) { pasPanjang(bar, kapasitas(k)); }); });
    }
    /* setiap birama/ketukan/not diberi nomor unik sendiri (mulai 1e9) supaya tidak bentrok dengan nomor
       buatan alphaTab, misalnya dari draf sesi lain atau instrumen yang baru ditambahkan */
    function setiapBagian(fn) {
        ed.s.tracks.forEach(function (t) {
            t.staves.forEach(function (st) {
                st.bars.forEach(function (bar) {
                    fn(bar);
                    (bar.voices || []).forEach(function (v) { fn(v); v.beats.forEach(function (bt) { fn(bt, true); (bt.notes || []).forEach(function (n) { fn(n); }); }); });
                });
            });
        });
    }
    function nomoriUlang() { setiapBagian(function (x) { x.id = ed.idBaru++; }); }
    /* nilai turunan dihitung ulang oleh alphaTab; dibuang supaya tidak basi setelah diedit */
    function bersih() {
        ed.s.masterbars.forEach(function (m) { delete m.start; });
        setiapBagian(function (x, beat) {
            if (x.id === undefined) x.id = ed.idBaru++;
            if (beat) { delete x.displaystart; delete x.playbackstart; delete x.displayduration; delete x.playbackduration; }
        });
    }
    function tanpaNomor(o) {
        if (Array.isArray(o)) o.forEach(tanpaNomor);
        else if (o && typeof o === 'object') { delete o.id; ['staves', 'bars', 'voices', 'beats', 'notes'].forEach(function (k) { if (o[k]) tanpaNomor(o[k]); }); }
        return o;
    }
    function batasKursor() {
        ed.b = Math.max(0, Math.min(ed.b, ed.s.masterbars.length - 1));
        ed.i = ed.jenis === 'drum' ? 0 : Math.max(0, Math.min(ed.i, beatsJ(ed.b).length - 1));
        ed.str = Math.max(1, Math.min(ed.str, nSenar() || 1));
    }

    /* ================= urungkan / ulangi =================
       perubahan di satu birama cukup menyimpan birama itu; perubahan besar (birama, instrumen) menyimpan seluruh lagu */
    function kursor() { return [ed.b, ed.i, ed.str, ed.ti, ed.si]; }
    function potret(l) {
        return { l: l, ti: ed.ti, si: ed.si, b: ed.b, cur: kursor(), data: JSON.stringify(l === 'birama' ? barJ(ed.ti, ed.si, ed.b) : ed.s) };
    }
    function catat(l) {
        ed.riwayat.push(potret(l)); ed.maju = [];
        var penuh = ed.riwayat.filter(function (p) { return p.l === 'semua'; }).length;
        while (ed.riwayat.length > 200 || penuh > 12) { if (ed.riwayat.shift().l === 'semua') penuh--; }
    }
    function pasang(p) {
        var balik = { l: p.l, ti: p.ti, si: p.si, b: p.b, cur: kursor() };
        if (p.l === 'birama') { balik.data = JSON.stringify(barJ(p.ti, p.si, p.b)); ed.s.tracks[p.ti].staves[p.si].bars[p.b] = JSON.parse(p.data); }
        else { balik.data = JSON.stringify(ed.s); ed.s = JSON.parse(p.data); }
        ed.b = p.cur[0]; ed.i = p.cur[1]; ed.str = p.cur[2];
        ed.ti = Math.min(p.cur[3], ed.s.tracks.length - 1); ed.si = Math.min(p.cur[4] || 0, trk().staves.length - 1);
        ed.jenis = jenisStaf(stf());
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
    function barRender() {
        var t = at.score && at.score.tracks[ed.ti], st = t && t.staves[ed.si];
        return st ? st.bars[ed.b] : null;
    }
    function beatRender() { var bar = barRender(); return bar && bar.voices[0] ? bar.voices[0].beats[ed.i] : null; }
    /* gitar: di tampilan not balok + tab kotak tab ada paling bawah (saat mengedit hanya satu instrumen yang tampil);
       instrumen lain: kotak staf tempat ketukan itu digambar */
    function kotakStaf(bb) {
        if (ed.jenis !== 'senar') return bb.barBounds;
        return bb.barBounds.masterBarBounds.bars.reduce(function (a, x) { return x.visualBounds.y > a.visualBounds.y ? x : a; }, bb.barBounds);
    }
    function posisiKursor(gulir) {
        var beat = ed.on && beatRender(), bl = at.boundsLookup, bb = beat && bl && bl.findBeat(beat), surf = $('#at .at-surface');
        if (!bb || !surf) { kursorEl.hidden = true; return; }
        var senar = ed.jenis === 'senar', n = nSenar(), kotak = kotakStaf(bb).visualBounds;
        var jarak = senar ? kotak.h / Math.max(1, n - 1) : kotak.h / 4;
        var sr = surf.getBoundingClientRect(), pr = paper.getBoundingClientRect(), x, w;
        if (ed.jenis === 'drum') { x = bb.barBounds.visualBounds.x; w = bb.barBounds.visualBounds.w; }
        else { w = Math.max(18, jarak * 2); x = (bb.onNotesX || bb.visualBounds.x + bb.visualBounds.w / 2) - w / 2; }
        kursorEl.hidden = false;
        kursorEl.style.left = (sr.left - pr.left + x) + 'px';
        kursorEl.style.top = (sr.top - pr.top + kotak.y - jarak * 0.75) + 'px';
        kursorEl.style.width = w + 'px';
        kursorEl.style.height = (kotak.h + jarak * 1.5) + 'px';
        var sel = kursorEl.firstChild;
        sel.hidden = !senar;
        if (senar) {
            sel.style.top = (jarak * 0.75 + (n - ed.str) * jarak - jarak * 0.6) + 'px';
            sel.style.height = (jarak * 1.2) + 'px';
        }
        if (gulir) lihatKursor();
    }
    /* kursor selalu terlihat: di antara kepala (atas) dan panel editor / pemutar (bawah) */
    function lihatKursor() {
        var r = kursorEl.getBoundingClientRect(), atas = $('#kepala').getBoundingClientRect().bottom + 8;
        var bawah = window.innerHeight - 8, pn = panel.getBoundingClientRect();
        if (pn.top > atas + 80 && pn.top < window.innerHeight) bawah = pn.top - 8;
        var tr = $('#transport').getBoundingClientRect();
        if (tr.height && tr.top < bawah && tr.top > atas + 80) bawah = tr.top - 8;
        if (r.top < atas) main.scrollTop -= atas - r.top + 24;
        else if (r.bottom > bawah) main.scrollTop += Math.min(r.bottom - bawah + 24, r.top - atas);
    }
    /* posisi not (boundsLookup) baru diperbarui setelah postRenderFinished, bukan renderFinished */
    (at.postRenderFinished || at.renderFinished).on(function () {
        if (!ed.on) return;
        if (ed.gulir !== null) { main.scrollTop = ed.gulir; ed.gulir = null; }
        try { posisiKursor(true); } catch (e) { kursorEl.hidden = true; }
        var f = ed.setelah; ed.setelah = null;
        if (f && ed.bunyi) try { if (at.isReadyForPlayback && at.playNote) f(); } catch (e) {}
    });
    window.addEventListener('resize', function () { if (ed.on) posisiKursor(false); });

    /* ketuk / klik di partitur: pilih ketukan (dan staf piano), serta senar bila yang diketuk bagian tab */
    $('#at').addEventListener('click', function (e) {
        if (!ed.on || !at.boundsLookup) return;
        var surf = $('#at .at-surface'); if (!surf) return;
        var r = surf.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        var beat = null; try { beat = at.boundsLookup.getBeatAtPos(x, y); } catch (er) {}
        if (!beat) return;
        var bar = beat.voice.bar; if (bar.staff.track.index !== ed.ti) return;
        /* suku kata yang sedang diketik disimpan dulu sebelum pindah not */
        var lirikBuka = !$('#ed-lirik').hidden, ubahLirik = lirikBuka && simpanLirik();
        if (bar.staff.index !== ed.si) { ed.si = bar.staff.index; ed.jenis = jenisStaf(stf()); ed.okt = oktafAwal(); }
        var b0 = bar.voices[0].beats, i = beat.index;
        if (beat.voice.index !== 0) { i = 0; b0.forEach(function (x2, k) { if (x2.playbackStart <= beat.playbackStart) i = k; }); }
        ed.b = bar.index; ed.i = ed.jenis === 'drum' ? 0 : i; ed.puluh = null;
        var bb = ed.jenis === 'senar' && at.boundsLookup.findBeat(b0[i]);
        if (bb) {
            var tab = kotakStaf(bb).visualBounds, n = nSenar(), jarak = tab.h / Math.max(1, n - 1);
            if (y > tab.y - jarak && y < tab.y + tab.h + jarak) ed.str = Math.max(1, Math.min(n, n - Math.round((y - tab.y) / jarak)));
        }
        if (ubahLirik) render(); else { posisiKursor(false); tampilPanel(); }
        if (lirikBuka) { isiLirik(); $('#ed-lirik-in').select(); }
    });

    /* ================= menulis: umum ================= */
    function kabar(t) {
        var el = $('#ed-pesan'); el.textContent = t; el.hidden = !t;
        clearTimeout(kabar.t); if (t) kabar.t = setTimeout(function () { el.hidden = true; }, 4500);
    }
    /* ketukan diam diberi panjang sesuai pilihan sebelum diisi not */
    function siapkanBeat() {
        var bt = beatIni();
        if (diam(bt)) {
            if (panjang(bt) !== panjangSpek(ed.dur)) ubahDurasi(ed.b, ed.i, ed.dur);
            bt = beatIni(); bt.isempty = false; bt.notes = [];
        }
        return bt;
    }
    /* melodi: setelah menulis, kursor maju; di ujung lagu birama baru dibuat */
    function majuSetelahTulis() {
        var bs = beatsJ(ed.b);
        if (ed.i < bs.length - 1) ed.i++;
        else if (ed.b < ed.s.masterbars.length - 1) { ed.b++; ed.i = 0; }
        else { catat('semua'); sisipBirama(ed.b); ed.b++; ed.i = 0; }
        render();
    }
    function jadiDiam() {
        var bt = beatIni();
        if (ed.jenis === 'piano' && !ed.akor) {
            catat('birama');
            if (!diam(bt)) bt.notes = []; else if (panjang(bt) !== panjangSpek(ed.dur)) ubahDurasi(ed.b, ed.i, ed.dur);
            majuSetelahTulis(); return;
        }
        if (diam(bt)) return;
        catat('birama'); bt.notes = []; render();
    }
    function hapus() {
        if (ed.jenis === 'drum') return;
        var bs = beatsJ(ed.b), bt = bs[ed.i], n = ed.jenis === 'senar' ? cariNot(bt, ed.str) : null;
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
        if (ed.jenis === 'drum') return;
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

    /* ================= gitar, bass, ukulele ================= */
    function pasangFret(f, lanjutan) {
        if (!lanjutan) catat('birama');
        var bt = siapkanBeat(), n = cariNot(bt, ed.str), s = ed.str;
        if (n) { n.fret = f; n.isdead = false; n.istiedestination = false; }
        else bt.notes.push({ fret: f, string: ed.str });
        ed.setelah = function () { var b = beatRender(), x = b && b.notes.filter(function (y) { return y.string === s; })[0]; if (x) at.playNote(x); };
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
        catat('birama'); n.fret += 10; render();
    }
    function pindahSenar(arah) { ed.puluh = null; ed.str = Math.max(1, Math.min(nSenar(), ed.str + arah)); posisiKursor(true); tampilPanel(); }
    /* senar paling tinggi ditulis kecil bila namanya sama dengan senar lain (e pada gitar) */
    function namaSenar(s) {
        var tun = tuning(stf()), n = tun.length, m = tun[n - s]; if (m === undefined) return String(s);
        var nm = NAMA[m % 12], kembar = tun.some(function (x, k) { return k !== n - s && x % 12 === m % 12; });
        return s === n && kembar ? nm.toLowerCase() : nm;
    }

    /* ================= piano, vokal, melodi ================= */
    function oktafAwal() { var bar = stf().bars[0]; return bar && bar.clef === 3 ? 2 : 4; }
    function dasarOkt() { return (ed.okt + 1) * 12; }
    function bunyiNada(m) { if (ed.bunyi && P.bunyiNada) P.bunyiNada(m); }
    /* ketuk tuts: mode melodi menulis satu not lalu maju; mode akor menambah/membuang nada di ketukan yang sama */
    function tekanTuts(m) {
        if (m < 12 || m > 119) return;
        bunyiNada(m);
        catat('birama');
        var bt = siapkanBeat(), ada = bt.notes.filter(function (n) { return midiNot(n) === m; })[0];
        if (ed.akor) {
            if (ada) bt.notes.splice(bt.notes.indexOf(ada), 1); else bt.notes.push(notPiano(m));
            render(); return;
        }
        bt.notes = [notPiano(m)];
        majuSetelahTulis();
    }
    function geserNada(d) {
        var bt = beatIni(); if (diam(bt)) return;
        var hasil = bt.notes.map(function (n) { return midiNot(n) + d; });
        if (hasil.some(function (m) { return m < 12 || m > 119; })) return;
        catat('birama');
        bt.notes.forEach(function (n, k) { n.octave = Math.floor(hasil[k] / 12); n.tone = hasil[k] % 12; });
        bunyiNada(Math.max.apply(null, hasil));
        render();
    }
    function gantiOktaf(d) { ed.okt = Math.max(0, Math.min(7, ed.okt + d)); tampilPanel(); }
    var PUTIH = [0, 2, 4, 5, 7, 9, 11], HITAM = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 }, tutsDasar = -1;
    function gambarTuts() {
        var dasar = dasarOkt(); if (dasar === tutsDasar) return;
        tutsDasar = dasar;
        var h = '', o;
        for (o = 0; o < 2; o++) PUTIH.forEach(function (p) {
            var m = dasar + o * 12 + p;
            h += '<button type="button" class="p" data-midi="' + m + '" aria-pressed="false" aria-label="' + namaNada(m) + '"><span>' + (p === 0 ? namaNada(m) : NAMA[p]) + '</span></button>';
        });
        for (o = 0; o < 2; o++) [1, 3, 6, 8, 10].forEach(function (p) {
            var m = dasar + o * 12 + p;
            h += '<button type="button" class="h" data-midi="' + m + '" aria-pressed="false" aria-label="' + namaNada(m) + '" style="left:' + ((o * 7 + HITAM[p]) / 14 * 100).toFixed(3) + '%"></button>';
        });
        $('#ed-tuts').innerHTML = h;
        $('#ed-okt').textContent = namaNada(dasar) + ' – ' + namaNada(dasar + 23);
    }

    /* ================= drum: kisi per birama ================= */
    var katalog = null;
    /* data artikulasi tiap pad diambil sekali dari alphaTex (\articulation defaults) */
    function artDrum(nama) {
        if (!katalog) {
            katalog = {};
            try {
                var t = polos(JSONC.scoreToJsObject(imporTex('\\track "D"\n\\instrument percussion\n\\clef neutral\n\\articulation defaults\n:16 ' + PAD.map(function (p) { return p.a; }).join(' ')))).tracks[0];
                var bs = t.staves[0].bars[0].voices[0].beats;
                PAD.forEach(function (p, k) { var n = bs[k] && bs[k].notes[0]; if (n && t.percussionarticulations) katalog[p.a] = t.percussionarticulations[n.percussionarticulation]; });
            } catch (e) {}
        }
        return katalog[nama];
    }
    function idxArt(t, nama) {
        var a = artDrum(nama); if (!a) return -1;
        t.percussionarticulations = t.percussionarticulations || [];
        for (var k = 0; k < t.percussionarticulations.length; k++) {
            var x = t.percussionarticulations[k];
            if (x && x.id === a.id && x.outputmidinumber === a.outputmidinumber) return k;
        }
        t.percussionarticulations.push(JSON.parse(JSON.stringify(a)));
        return t.percussionarticulations.length - 1;
    }
    function midiDrum(t, n) { var a = (t.percussionarticulations || [])[n.percussionarticulation]; return a ? a.outputmidinumber : -1; }
    function barisPad(m) { for (var r = 0; r < PAD.length; r++) if (PAD[r].m.indexOf(m) > -1) return r; return -1; }
    /* semua suara di birama dibaca ke kisi; posisi yang tidak pas kisi dibulatkan */
    function bacaKisi(b) {
        var bar = barJ(ed.ti, ed.si, b), n = Math.max(1, Math.floor(kapasitas(b) / ed.res)), peta = {}, aneh = false;
        (bar.voices || []).forEach(function (v) {
            var pos = 0;
            v.beats.forEach(function (bt) {
                if (!diam(bt)) {
                    var k = pos / ed.res; if (k % 1) { aneh = true; k = Math.round(k); }
                    k = Math.min(n - 1, k);
                    (peta[k] = peta[k] || []).push.apply(peta[k], bt.notes);
                }
                pos += panjang(bt);
            });
        });
        return { peta: peta, n: n, aneh: aneh };
    }
    function adaDi(model, k, r) { var t = trk(); return (model.peta[k] || []).some(function (nt) { return barisPad(midiDrum(t, nt)) === r; }); }
    function spekMuat(gap) {
        for (var k = 0; k < MUAT.length; k++) { var sp = { d: MUAT[k].d, dots: MUAT[k].dots || 0, tup: false }; if (panjangSpek(sp) <= gap) return sp; }
        return { d: 32, dots: 0, tup: false };
    }
    /* kisi ditulis kembali ke birama: tiap pukulan sepanjang jarak ke pukulan berikutnya, sisanya diam */
    function tulisKisi(b, peta) {
        var bar = barJ(ed.ti, ed.si, b), cap = kapasitas(b), res = ed.res, pal = res === 320 ? { d: 8, dots: 0, tup: true } : null;
        var v0 = bar.voices && bar.voices[0], oto = v0 && v0.beats[0] && v0.beats[0].automations;
        var on = Object.keys(peta).map(Number).filter(function (k) { return peta[k] && peta[k].length; }).sort(function (a, c) { return a - c; });
        var hasil = [], pos = 0;
        on.forEach(function (k, j) {
            var mulai = k * res, akhir = j + 1 < on.length ? on[j + 1] * res : cap;
            if (mulai > pos) hasil = hasil.concat(isiDiam(pos, mulai, pal));
            var bt = beatBaru(pal || spekMuat(akhir - mulai)); bt.notes = peta[k]; hasil.push(bt);
            pos = mulai + panjang(bt);
            if (pos < akhir) hasil = hasil.concat(isiDiam(pos, akhir, pal));
            pos = akhir;
        });
        if (pos < cap) hasil = hasil.concat(isiDiam(pos, cap, pal));
        if (oto && oto.length && hasil[0]) hasil[0].automations = oto;
        /* suara lain dikosongkan karena semua pukulan sudah digabung ke suara pertama */
        bar.voices = [{ beats: hasil }].concat((bar.voices || []).slice(1).map(function () { return { beats: [{ isempty: true, notes: [], duration: 4 }] }; }));
    }
    function ketukKisi(r, k) {
        var model = bacaKisi(ed.b), t = trk(), ada = adaDi(model, k, r), isi = model.peta[k] || [], idx = -1;
        if (!ada) { idx = idxArt(t, PAD[r].a); if (idx < 0) { kabar('Suara drum ini belum tersedia.'); return; } }
        catat('birama');
        model.peta[k] = ada ? isi.filter(function (nt) { return barisPad(midiDrum(t, nt)) !== r; }) : isi.concat([{ percussionarticulation: idx }]);
        tulisKisi(ed.b, model.peta);
        if (!ada) {
            var mulai = k * ed.res;
            ed.setelah = function () {
                var bar = barRender(), bt = bar && bar.voices[0].beats.filter(function (x) { return x.playbackStart === mulai; })[0];
                var n = bt && bt.notes.filter(function (x) { return x.percussionArticulation === idx; })[0]; if (n) at.playNote(n);
            };
        }
        render();
    }
    var kisi = $('#ed-kisi'), kisiKunci = '';
    function gambarKisi() {
        var b = ed.b, model = bacaKisi(b), mb = ed.s.masterbars[b];
        var perKetuk = Math.max(1, Math.round(3840 / mb.timesignaturedenominator / ed.res)), h = '';
        PAD.forEach(function (p, r) {
            h += '<span class="ed-lbl">' + p.n + '</span>';
            for (var k = 0; k < model.n; k++) {
                h += '<button type="button" class="' + (Math.floor(k / perKetuk) % 2 ? 'g' : '') + '" data-r="' + r + '" data-k="' + k + '" aria-pressed="' + adaDi(model, k, r) + '" aria-label="' + p.n + ' ' + (k + 1) + '"></button>';
            }
        });
        if (h !== kisiKunci) { kisiKunci = h; kisi.style.setProperty('--langkah', model.n); kisi.innerHTML = h; }
        $('#ed-drum-birama').textContent = 'Birama ' + (b + 1) + '/' + ed.s.masterbars.length;
        return model;
    }

    /* ================= teknik ================= */
    function notSebelum(cocok) {
        var b = ed.b, i = ed.i - 1;
        while (b >= 0) {
            var bs = beatsJ(b);
            for (; i >= 0; i--) { var n = (bs[i].notes || []).filter(cocok)[0]; if (n) return n; if (!diam(bs[i])) return null; }
            b--; if (b >= 0) i = beatsJ(b).length - 1;
        }
        return null;
    }
    function asalSambung(n) {
        var m = midiNot(n);
        return notSebelum(ed.jenis === 'senar' ? function (x) { return x.string === n.string; } : function (x) { return midiNot(x) === m; });
    }
    var EFEK = {
        hammer: { untuk: 'senar', cek: function (n) { return !!n.ishammerpullorigin; }, atur: function (n, on) { n.ishammerpullorigin = on; } },
        slide: { untuk: 'senar', cek: function (n) { return n.slideouttype === 2; }, atur: function (n, on) { n.slideouttype = on ? 2 : 0; } },
        bend: { untuk: 'senar', cek: function (n) { return n.bendtype > 0; }, atur: function (n, on) { n.bendtype = on ? 2 : 0; n.bendpoints = on ? [{ offset: 0, value: 0 }, { offset: 60, value: 4 }] : []; } },
        vibrato: { untuk: 'senar piano', cek: function (n) { return n.vibrato > 0; }, atur: function (n, on) { n.vibrato = on ? 1 : 0; } },
        pm: { untuk: 'senar', cek: function (n) { return !!n.ispalmmute; }, atur: function (n, on) { n.ispalmmute = on; } },
        mati: { untuk: 'senar', cek: function (n) { return !!n.isdead; }, atur: function (n, on) { n.isdead = on; } },
        ring: { untuk: 'senar', cek: function (n) { return !!n.isletring; }, atur: function (n, on) { n.isletring = on; } },
        staccato: { untuk: 'piano', cek: function (n) { return !!n.isstaccato; }, atur: function (n, on) { n.isstaccato = on; } },
        aksen: { untuk: 'piano', cek: function (n) { return n.accentuated > 0; }, atur: function (n, on) { n.accentuated = on ? 1 : 0; } },
        sambung: {
            untuk: 'senar piano', cek: function (n) { return !!n.istiedestination; },
            atur: function (n, on) { var asal = on && asalSambung(n); if (on && !asal) return; n.istiedestination = on; if (asal && ed.jenis === 'senar') n.fret = asal.fret; }
        }
    };
    function notTerpilih() {
        var bt = beatIni(); if (ed.jenis === 'drum' || diam(bt)) return [];
        var n = ed.jenis === 'senar' && cariNot(bt, ed.str);
        return n ? [n] : bt.notes;
    }
    function efek(nama) {
        var e = EFEK[nama]; if (!e || e.untuk.split(' ').indexOf(ed.jenis) < 0) return;
        var ns = notTerpilih();
        if (!ns.length) { kabar(ed.jenis === 'senar' ? 'Pilih not dulu (ketuk angka di tab), lalu pasang tekniknya.' : 'Tulis not dulu, lalu pasang tandanya.'); return; }
        if (nama === 'sambung' && !e.cek(ns[0]) && !asalSambung(ns[0])) { kabar('Sambung (tie) butuh not yang sama tepat sebelumnya.'); return; }
        catat('birama');
        var on = !e.cek(ns[0]);
        ns.forEach(function (n) { e.atur(n, on); });
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

    /* ================= lirik ================= */
    function notBeat(bt) { return !diam(bt) && !bt.notes.every(function (n) { return n.istiedestination; }); }
    function cariNotBeat(arah) {
        var b = ed.b, i = ed.i + arah;
        while (b >= 0 && b < ed.s.masterbars.length) {
            var bs = beatsJ(b);
            if (i < 0) { b--; if (b >= 0) i = beatsJ(b).length - 1; continue; }
            if (i >= bs.length) { b++; i = 0; continue; }
            if (notBeat(bs[i])) return [b, i];
            i += arah;
        }
        return null;
    }
    function isiLirik() { var bt = beatIni(), inp = $('#ed-lirik-in'); inp.value = (bt.lyrics && bt.lyrics[0]) || ''; }
    function bukaLirik() {
        if (ed.jenis === 'drum') return;
        if (!notBeat(beatIni())) { var p = cariNotBeat(1); if (p) { ed.b = p[0]; ed.i = p[1]; } }
        $('#ed-chord').hidden = true; $('#ed-lirik').hidden = false;
        isiLirik(); posisiKursor(true); tampilPanel();
        $('#ed-lirik-in').focus(); $('#ed-lirik-in').select();
    }
    function simpanLirik() {
        var bt = beatIni(), v = $('#ed-lirik-in').value.trim().slice(0, 24), lama = (bt.lyrics && bt.lyrics[0]) || '';
        if (v === lama) return false;
        catat('birama'); bt.lyrics = v ? [v] : null;
        return true;
    }
    /* simpan suku kata lalu pindah ke not berikutnya / sebelumnya (diam dan not sambungan dilewati) */
    function lirikPindah(arah) {
        var ubah = simpanLirik(), p = cariNotBeat(arah);
        if (p) { ed.b = p[0]; ed.i = p[1]; } else if (arah > 0) kabar('Sudah sampai not terakhir.');
        if (ubah) render(); else { posisiKursor(true); tampilPanel(); }
        isiLirik(); $('#ed-lirik-in').select();
    }
    function tutupLirik() { if ($('#ed-lirik').hidden) return; if (simpanLirik()) render(); $('#ed-lirik').hidden = true; }
    $('#ed-lirik-in').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); lirikPindah(1); }
        else if ((e.key === 'Tab' && e.shiftKey) || (e.key === 'Backspace' && !this.value)) { e.preventDefault(); lirikPindah(-1); }
        else if (e.key === 'Escape') { e.stopPropagation(); tutupLirik(); }
    });

    /* ================= birama & instrumen ================= */
    function barKosong(contoh, cap) {
        var b = {};
        ['clef', 'clefottava', 'keysignature', 'keysignaturetype', 'displayscale'].forEach(function (k) { if (contoh && k in contoh) b[k] = contoh[k]; });
        b.voices = [{ beats: isiDiam(0, cap) }];
        return b;
    }
    function sisipBirama(setelah) {
        var lama = ed.s.masterbars[setelah];
        ed.s.masterbars.splice(setelah + 1, 0, { timesignaturenumerator: lama.timesignaturenumerator, timesignaturedenominator: lama.timesignaturedenominator, tripletfeel: lama.tripletfeel || 0, tempoautomations: [] });
        var cap = kapasitas(setelah + 1);
        ed.s.tracks.forEach(function (t) { t.staves.forEach(function (st) { st.bars.splice(setelah + 1, 0, barKosong(st.bars[setelah], cap)); }); });
    }
    function tambahBirama(setelah) { catat('semua'); sisipBirama(setelah); }
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
    /* salin isi birama ini (instrumen yang diedit) ke birama berikutnya; birama baru dibuat bila berikutnya sudah berisi */
    function salinBirama() {
        var st = stf(), b = ed.b, tujuan = b + 1, cap = kapasitas(b);
        var kosong = function (bar) { return (bar.voices || []).every(function (v) { return v.beats.every(diamPolos); }); };
        catat('semua');
        if (!(tujuan < ed.s.masterbars.length && kapasitas(tujuan) === cap && kosong(st.bars[tujuan]))) sisipBirama(b);
        var salin = tanpaNomor(JSON.parse(JSON.stringify(st.bars[b])));
        (salin.voices || []).forEach(function (v) { v.beats.forEach(function (bt) { delete bt.automations; }); });
        st.bars[tujuan] = salin;
        ed.b = tujuan; ed.i = 0; render();
        kabar('Birama ' + (b + 1) + ' disalin ke birama ' + (tujuan + 1) + '.');
    }
    function kanan() {
        ed.puluh = null;
        if (ed.jenis !== 'drum' && ed.i < beatsJ(ed.b).length - 1) ed.i++;
        else if (ed.b < ed.s.masterbars.length - 1) { ed.b++; ed.i = 0; }
        else {
            /* di ujung lagu: birama baru dibuat bila birama terakhir sudah berisi not */
            if (!beatsJ(ed.b).some(function (x) { return !diam(x); })) { if (ed.jenis === 'drum') kabar('Isi birama ini dulu, atau pakai Salin birama.'); return; }
            tambahBirama(ed.b); ed.b++; ed.i = 0; render(); return;
        }
        posisiKursor(true); tampilPanel();
    }
    function kiri() {
        ed.puluh = null;
        if (ed.jenis !== 'drum' && ed.i > 0) ed.i--;
        else if (ed.b > 0) { ed.b--; ed.i = ed.jenis === 'drum' ? 0 : beatsJ(ed.b).length - 1; }
        posisiKursor(true); tampilPanel();
    }
    function pindahBirama(arah) {
        ed.puluh = null; ed.b = Math.max(0, Math.min(ed.s.masterbars.length - 1, ed.b + arah)); ed.i = 0;
        posisiKursor(true); tampilPanel();
    }
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
    function texAlat(jenis, nama, birama, biramaKiri) {
        return ALAT[jenis].tex.replace('{N}', nama.replace(/"/g, '')).replace('{B}', birama).replace('{K}', biramaKiri || birama);
    }
    /* instrumen baru dibuat lewat alphaTex lalu digabung; diberi kanal suara sendiri (drum selalu kanal 10) */
    function trackBaru(jenis) {
        /* diawali ":4" supaya "r" tidak terbaca sebagai argumen perintah sebelumnya (misalnya 	uning piano) */
        var isi = [];
        for (var k = 0; k < ed.s.masterbars.length; k++) isi.push('r');
        var nama = ALAT[jenis].nama, ke = 1;
        while (ed.s.tracks.some(function (t) { return t.name === nama; })) nama = ALAT[jenis].nama + ' ' + (++ke);
        var t = tanpaNomor(polos(JSONC.scoreToJsObject(imporTex(texAlat(jenis, nama, ':4 ' + isi.join(' | '))))).tracks[0]);
        if (jenis === 'drum') { t.playbackinfo.primarychannel = 9; t.playbackinfo.secondarychannel = 9; }
        else {
            /* MIDI hanya punya 16 kanal: pakai kanal kosong; bila habis, berbagi dengan instrumen bersuara sama */
            var pakai = {}, bebas = [], sama = null;
            ed.s.tracks.forEach(function (x) {
                var pb = x.playbackinfo; if (!pb) return;
                pakai[pb.primarychannel] = 1; pakai[pb.secondarychannel] = 1;
                if (!sama && pb.primarychannel !== 9 && pb.program === t.playbackinfo.program) sama = pb;
            });
            for (var c = 0; c < 16 && bebas.length < 2; c++) if (c !== 9 && !pakai[c]) bebas.push(c);
            if (bebas.length) { t.playbackinfo.primarychannel = bebas[0]; t.playbackinfo.secondarychannel = bebas[1] === undefined ? bebas[0] : bebas[1]; }
            else if (sama) { t.playbackinfo.primarychannel = sama.primarychannel; t.playbackinfo.secondarychannel = sama.secondarychannel; }
        }
        return t;
    }
    function aturJenis() {
        ed.jenis = jenisStaf(stf()); ed.str = nSenar() || 1; ed.okt = oktafAwal(); ed.i = 0; ed.puluh = null;
        $('#ed-chord').hidden = true; $('#ed-lirik').hidden = true;
    }
    function tambahTrack(jenis) {
        var t; try { t = trackBaru(jenis); } catch (e) { kabar('Instrumen belum bisa ditambahkan.'); isiPilihTrack(); return; }
        catat('semua');
        ed.s.tracks.push(t);
        ed.ti = ed.s.tracks.length - 1; ed.si = 0; aturJenis();
        rapikanTrack(ed.ti);
        gambarUlang(true);
        kabar(ALAT[jenis].nama + ' ditambahkan ke lagu ini.');
    }
    function gantiTrack(ti, si) {
        tutupLirik();
        ed.ti = ti; ed.si = Math.min(si || 0, ed.s.tracks[ti].staves.length - 1); aturJenis();
        rapikanTrack(ti);
        gambarUlang(true);
    }

    /* ================= buka / tutup editor ================= */
    var panel = $('#editor');
    function pilihAwal() {
        var gitar = -1, senar = -1;
        ed.s.tracks.forEach(function (x, k) {
            if (jenisStaf(x.staves[0]) !== 'senar') return;
            if (senar < 0) senar = k;
            if (gitar < 0 && tuning(x.staves[0]).length >= 6) gitar = k;
        });
        return gitar >= 0 ? gitar : senar >= 0 ? senar : 0;
    }
    function buka(ti, si) {
        var d = P.skor(); if (!d) return;
        ed.s = JSON.parse(JSON.stringify(polos(d)));
        nomoriUlang();
        if (ti === null || ti === undefined || !ed.s.tracks[ti]) { ti = pilihAwal(); si = 0; }
        ed.ti = ti; ed.si = Math.min(si || 0, ed.s.tracks[ti].staves.length - 1); ed.b = 0;
        ed.riwayat = []; ed.maju = []; tutsDasar = -1; kisiKunci = '';
        aturJenis();
        rapikanTrack(ti);
        var bt0 = beatsJ(0)[0]; if (bt0 && !diam(bt0) && ed.jenis !== 'drum') ed.dur = spekBeat(bt0);
        ed.on = true;
        main.classList.add('edit-on'); panel.hidden = false; panel.classList.remove('info');
        P.tutupLembar();
        isiPilihTrack(); bersih();
        ed.gulir = null; main.scrollTop = 0;
        P.mulaiEdit(ed.ti, ed.s);
        tampilPanel(); ukurPanel(); kabar('');
    }
    /* tanpaGambar: lagu lain sedang dimuat, jadi tidak perlu menggambar ulang */
    function tutup(tanpaGambar) {
        if (!ed.on) return;
        if (!tanpaGambar) tutupLirik();
        ed.on = false; kursorEl.hidden = true; panel.hidden = true; $('#ed-chord').hidden = true; $('#ed-lirik').hidden = true;
        main.classList.remove('edit-on', 'ed-main');
        if (!tanpaGambar) P.selesaiEdit();
    }
    function baru(jenis) {
        var isi = ':1 r | r | r | r';
        if (!ALAT[jenis]) jenis = 'gitar';
        P.muatTeksBaru('\\title "Lagu saya"\n\\hideDynamics\n' + texAlat(jenis, ALAT[jenis].nama, '\\ts 4 4 \\tempo 90\n' + isi, isi));
        ed.dur = { d: 4, dots: 0, tup: false };
        buka(0, 0);
        if (jenis === 'vokal') kabar('Ketuk tuts untuk menulis melodi, lalu tombol Lirik untuk menulis suku katanya.');
    }

    /* tulisan terakhir disimpan di perangkat ini */
    var tDraf = 0;
    function simpanDraf() {
        clearTimeout(tDraf);
        tDraf = setTimeout(function () {
            if (!ed.s) return;
            try {
                localStorage.setItem(KUNCI_DRAF, JSON.stringify({ v: 1, ti: ed.ti, si: ed.si, s: ed.s }));
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
        if (!d || !d.s) { P.pesan('Tulisan terakhir tidak bisa dibuka.', true); return; }
        P.tutupLembar();
        try { P.muatJson(d.s); } catch (e) { P.pesan('Tulisan terakhir tidak bisa dibuka.', true); return; }
        buka(d.ti, d.si);
    });

    /* ================= panel editor ================= */
    function isiPilihTrack() {
        var h = '';
        ed.s.tracks.forEach(function (t, k) {
            var banyak = t.staves.length > 1;
            t.staves.forEach(function (st, s) {
                var j = jenisStaf(st); if (s > 0 && j !== 'piano') return;
                var ket = j === 'senar' ? ' (' + tuning(st).length + ' senar)' : banyak && j === 'piano' ? (s === 0 ? ' (atas)' : s === 1 ? ' (bawah)' : ' (' + (s + 1) + ')') : '';
                h += '<option value="' + k + '.' + s + '">' + P.esc(t.name || 'Instrumen ' + (k + 1)) + ket + '</option>';
            });
        });
        h += '<optgroup label="Tambah instrumen">' + ['gitar', 'bass', 'ukulele', 'piano', 'vokal', 'drum'].map(function (j) { return '<option value="+' + j + '">+ ' + ALAT[j].nama + '</option>'; }).join('') + '</optgroup>';
        $('#ed-track').innerHTML = h;
        $('#ed-track').value = ed.ti + '.' + ed.si;
    }
    function tampilPanel() {
        if (!ed.on) return;
        batasKursor();
        panel.setAttribute('data-jenis', ed.jenis);
        var bt = beatIni(), sp = spekKini(), mb = ed.s.masterbars[ed.b], status;
        $$('#editor [data-dur]').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.dur === sp.d); });
        $('#ed-titik').setAttribute('aria-pressed', sp.dots > 0);
        $('#ed-triol').setAttribute('aria-pressed', !!sp.tup);
        if (ed.jenis === 'senar') {
            var n = nSenar(), senar = $('#ed-senar');
            if (senar.children.length !== n) {
                var h = ''; for (var s = n; s >= 1; s--) h += '<button type="button" data-s="' + s + '" aria-pressed="false"><span></span><b></b></button>';
                senar.innerHTML = h; senar.style.gridTemplateRows = 'repeat(' + n + ', minmax(0, 1fr))';
            }
            $$('#ed-senar [data-s]').forEach(function (b) {
                var s2 = +b.dataset.s, nt = cariNot(bt, s2);
                b.setAttribute('aria-pressed', s2 === ed.str);
                b.firstChild.textContent = namaSenar(s2);
                b.lastChild.textContent = nt ? (nt.isdead ? 'x' : nt.fret) : '–';
            });
            status = 'Birama ' + (ed.b + 1) + '/' + ed.s.masterbars.length + ' · ketukan ' + (ed.i + 1) + ' · senar ' + (n - ed.str + 1) + ' (' + namaSenar(ed.str) + ')';
        } else if (ed.jenis === 'piano') {
            gambarTuts();
            var nada = diam(bt) ? [] : bt.notes.map(midiNot);
            $$('#ed-tuts [data-midi]').forEach(function (b) { b.setAttribute('aria-pressed', nada.indexOf(+b.dataset.midi) > -1); });
            $('#ed-akor').setAttribute('aria-pressed', ed.akor);
            status = 'Birama ' + (ed.b + 1) + '/' + ed.s.masterbars.length + ' · ketukan ' + (ed.i + 1) + ' · ' + (nada.length ? nada.sort(function (a, c) { return a - c; }).map(namaNada).join(' ') : 'diam') +
                (bt.lyrics && bt.lyrics[0] ? ' · “' + bt.lyrics[0] + '”' : '');
        } else {
            var model = gambarKisi();
            status = 'Ketuk kotak untuk memukul, ketuk lagi untuk menghapus' + (model.aneh ? ' · irama birama ini dirapikan ke kisi saat diubah' : '');
        }
        var ns = notTerpilih();
        $$('#editor [data-efek]').forEach(function (b) { b.setAttribute('aria-pressed', !!ns.length && EFEK[b.dataset.efek].cek(ns[0])); });
        var ch = bt.chordid && stf().chords && stf().chords[bt.chordid];
        $('#ed-chord-btn').setAttribute('aria-pressed', !!ch);
        $('#ed-chord-btn').textContent = ch ? 'Chord ' + ch.name : 'Chord';
        $('#ed-urung').disabled = !ed.riwayat.length; $('#ed-ulang').disabled = !ed.maju.length;
        $('#ed-bunyi').setAttribute('aria-pressed', ed.bunyi);
        var ts = mb.timesignaturenumerator + '/' + mb.timesignaturedenominator, sel = $('#ed-ts');
        if (![].some.call(sel.options, function (o) { return o.value === ts; })) { var o = document.createElement('option'); o.value = ts; o.textContent = ts; sel.appendChild(o); }
        sel.value = ts;
        if (document.activeElement !== $('#ed-judul')) $('#ed-judul').value = ed.s.title || '';
        if (document.activeElement !== $('#ed-tempo')) $('#ed-tempo').value = Math.round(ed.s.tempo || (mb.tempoautomations && mb.tempoautomations[0] && mb.tempoautomations[0].value) || 120);
        $('#ed-posisi').textContent = status;
    }
    /* tinggi panel dipakai sebagai ruang kosong di bawah partitur (HP) */
    function ukurPanel() { if (ed.on) main.style.setProperty('--ed-h', panel.offsetHeight + 'px'); }
    if (window.ResizeObserver) new ResizeObserver(ukurPanel).observe(panel);

    $('#ed-mulai').addEventListener('click', function () { buka(null); });
    $('#ed-lagu-ini').addEventListener('click', function () { buka(null); });
    $('#ed-selesai').addEventListener('click', function () { tutup(false); });
    $('#ed-track').addEventListener('change', function () {
        var v = this.value; this.blur();
        if (v.charAt(0) === '+') tambahTrack(v.slice(1)); else { var p = v.split('.'); gantiTrack(+p[0], +p[1]); }
    });
    $('#ed-res').addEventListener('change', function () { ed.res = +this.value; this.blur(); tampilPanel(); });
    $('#ed-urung').addEventListener('click', urungkan);
    $('#ed-ulang').addEventListener('click', ulangi);
    $('#ed-putar').addEventListener('click', function () { if (at.isReadyForPlayback) at.playPause(); });
    at.playerStateChanged.on(function (e) {
        var on = e.state === alphaTab.synth.PlayerState.Playing, b = $('#ed-putar');
        main.classList.toggle('ed-main', on);
        b.textContent = on ? '❚❚' : '▶'; b.setAttribute('aria-label', on ? 'Jeda' : 'Putar');
    });
    $('#ed-senar').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) { ed.str = +b.dataset.s; ed.puluh = null; posisiKursor(true); tampilPanel(); } });
    var AKSI = {
        titik: function () { var sp = spekKini(); pilihDurasi({ d: sp.d, dots: sp.dots ? 0 : 1, tup: sp.tup }); },
        triol: function () { var sp = spekKini(); pilihDurasi({ d: sp.d, dots: sp.dots, tup: !sp.tup }); },
        hapus: hapus, kiri: kiri, kanan: kanan, plus10: tambahSepuluh, diam: jadiDiam, sisip: sisip,
        'tambah-birama': function () { tambahBirama(ed.b); ed.b++; ed.i = 0; render(); },
        'hapus-birama': hapusBirama, salin: salinBirama,
        info: function (b) { panel.classList.toggle('info'); b.setAttribute('aria-pressed', panel.classList.contains('info')); },
        bunyi: function () { ed.bunyi = !ed.bunyi; tampilPanel(); },
        chord: bukaChord, lirik: bukaLirik,
        'lirik-kiri': function () { lirikPindah(-1); }, 'lirik-lanjut': function () { lirikPindah(1); }, 'lirik-tutup': tutupLirik,
        'okt-turun': function () { gantiOktaf(-1); }, 'okt-naik': function () { gantiOktaf(1); },
        akor: function () { ed.akor = !ed.akor; tampilPanel(); kabar(ed.akor ? 'Mode akor: ketuk beberapa tuts untuk ketukan yang sama, lalu → untuk lanjut.' : 'Mode melodi: setiap tuts menulis satu not lalu maju.'); },
        'birama-kiri': kiri, 'birama-kanan': kanan
    };
    panel.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || !ed.on) return;
        if (b.dataset.dur) { pilihDurasi({ d: +b.dataset.dur, dots: 0, tup: false }); return; }
        if (b.dataset.angka) { ketikAngka(+b.dataset.angka); return; }
        if (b.dataset.midi) { tekanTuts(+b.dataset.midi); return; }
        if (b.dataset.k !== undefined && b.dataset.r !== undefined) { ketukKisi(+b.dataset.r, +b.dataset.k); return; }
        if (b.dataset.efek) { efek(b.dataset.efek); return; }
        var f = AKSI[b.dataset.aksi]; if (f) f(b);
    });
    /* nama chord di atas ketukan */
    function bukaChord() {
        if (ed.jenis === 'drum') return;
        var bt = beatIni(), ch = bt.chordid && stf().chords && stf().chords[bt.chordid];
        $('#ed-lirik').hidden = true; $('#ed-chord').hidden = false; $('#ed-chord-in').value = ch ? ch.name : ''; $('#ed-chord-in').focus();
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

    /* keyboard komputer. Piano: A W S E D F T G Y H U J K = tuts C sampai C, 1-7 = do re mi fa sol la si, Z/X = oktaf */
    var TUTS_PC = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12 };
    document.addEventListener('keydown', function (e) {
        if (!ed.on || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
        var k = e.key, ctrl = e.ctrlKey || e.metaKey, kecil = k.length === 1 ? k.toLowerCase() : k, j = ed.jenis, aksi = null;
        if (ctrl) {
            if (kecil === 'z') { e.preventDefault(); if (e.shiftKey) ulangi(); else urungkan(); }
            else if (kecil === 'y') { e.preventDefault(); ulangi(); }
            else if (k === 'Enter') { e.preventDefault(); AKSI['tambah-birama'](); }
            else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); pindahBirama(k === 'ArrowLeft' ? -1 : 1); }
            return;
        }
        if (j === 'piano' && !e.shiftKey && TUTS_PC[kecil] !== undefined) aksi = function () { tekanTuts(dasarOkt() + TUTS_PC[kecil]); };
        else if (j === 'piano' && /^[1-7]$/.test(k)) aksi = function () { tekanTuts(dasarOkt() + PUTIH[+k - 1]); };
        else if (j === 'piano' && (kecil === 'z' || kecil === 'x')) aksi = function () { gantiOktaf(kecil === 'z' ? -1 : 1); };
        else if (j === 'senar' && /^[0-9]$/.test(k)) aksi = function () { ketikAngka(+k); };
        else if (k === 'ArrowUp' || k === 'ArrowDown') {
            var naik = k === 'ArrowUp' ? 1 : -1;
            if (j === 'senar') aksi = function () { pindahSenar(naik); };
            else if (j === 'piano') aksi = function () { geserNada(naik * (e.shiftKey ? 12 : 1)); };
        } else {
            aksi = {
                ArrowLeft: kiri, ArrowRight: kanan, Backspace: hapus, Delete: hapus, Insert: sisip,
                Home: function () { ed.i = 0; posisiKursor(true); tampilPanel(); },
                End: function () { if (j !== 'drum') ed.i = beatsJ(ed.b).length - 1; posisiKursor(true); tampilPanel(); },
                '.': AKSI.titik, t: AKSI.triol, r: jadiDiam,
                '-': function () { geserDurasi(1); }, '+': function () { geserDurasi(-1); }, '=': function () { geserDurasi(-1); },
                h: function () { efek('hammer'); }, s: function () { efek('slide'); }, b: function () { efek('bend'); }, v: function () { efek('vibrato'); },
                p: function () { efek('pm'); }, x: function () { efek('mati'); }, l: function () { efek('sambung'); }, i: function () { efek('ring'); },
                c: bukaChord, n: bukaLirik
            }[kecil] || null;
            if (j === 'drum' && aksi && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(k) < 0) aksi = null;
        }
        if (!aksi) return;
        e.preventDefault(); aksi();
    });

    tampilDraf();
    window.PartiturEdit = { baru: baru, buka: buka, tutup: tutup, _ed: ed };
})();
