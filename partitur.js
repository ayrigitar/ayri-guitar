/* Partitur & tab semua instrumen (partitur.html) memakai alphaTab (vendor/alphatab, lisensi MPL-2.0).
   File Guitar Pro / MusicXML dibuka langsung di perangkat pengunjung, tidak diunggah ke mana pun.
   Alur: file/teks dibaca menjadi lagu "dasar"; transpose, kapo, dan pilihan tampilan diterapkan ke salinannya
   setiap kali digambar, jadi lagu dasar tidak pernah berubah. */
(function () {
    /* ================= lagu contoh: semuanya domain publik ================= */
    var GITAR = '\\tuning (E4 B3 G3 D3 A2 E2) { hide }', BASS = '\\tuning (G2 D2 A1 E1) { hide }', RAPI = '\\hideDynamics';
    var CHORD = {
        C: '(0.1 1.2 0.3 2.4 3.5)', F: '(1.1 1.2 2.3 3.4 3.5 1.6)', G: '(3.1 0.2 0.3 0.4 2.5 3.6)',
        G7: '(1.1 0.2 0.3 0.4 2.5 3.6)', C7: '(0.1 1.2 3.3 2.4 3.5)'
    };
    var DIAGRAM = { C: '0 1 0 2 3 x', F: '1 1 2 3 3 1', G: '3 0 0 0 2 3', G7: '1 0 0 0 2 3', C7: '0 1 3 2 3 x' };
    function defChord(nama) { return nama.map(function (n) { return '  \\chord ("' + n + '" ' + DIAGRAM[n] + ')'; }).join('\n'); }
    /* harmoni per bar: 'C' = satu bar, 'G C' = setengah bar masing-masing */
    function strum(harmoni, ketuk) {
        return harmoni.map(function (b) {
            var c = b.split(' ');
            if (c.length === 2) return ':2 ' + c.map(function (x) { return CHORD[x] + ' {ch "' + x + '"}'; }).join(' ');
            return ':' + ketuk + ' ' + CHORD[c[0]] + ' {ch "' + c[0] + '"}' + new Array(ketuk === 4 ? 4 : 2).join(' ' + CHORD[c[0]]);
        }).join(' |\n  ');
    }
    var AKAR = { C: ['3.3', '0.1'], C7: ['3.3', '0.1'], F: ['1.4', '3.3'], G: ['3.4', '0.2'], G7: ['3.4', '0.2'] };
    function bassAkar(harmoni) { return harmoni.map(function (b) { var c = b.split(' '); return ':2 ' + (c.length === 2 ? AKAR[c[0]][0] + ' ' + AKAR[c[1]][0] : AKAR[c[0]].join(' ')); }).join(' | '); }
    var PIANO = { C: '(C4 E4 G4)', C7: '(C4 E4 G4 Bb4)', F: '(C4 F4 A4)', G7: '(B3 D4 F4 G4)', G: '(B3 D4 G4)' };
    function pianoAkor(harmoni) { return harmoni.map(function (b) { var c = b.split(' '); return ':2 ' + (c.length === 2 ? PIANO[c[0]] + ' ' + PIANO[c[1]] : PIANO[c[0]] + ' ' + PIANO[c[0]]); }).join(' | '); }

    var HARMONI_ODE = ['C', 'G7', 'C', 'G', 'C', 'G7', 'C', 'G C', 'G C', 'G C', 'G7', 'C G', 'C', 'G7', 'C', 'G C'];
    var HARMONI_SAINTS = ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'G7', 'C', 'C', 'C7', 'F', 'C', 'C', 'G7', 'C'];
    var DRUM_BAR = ':8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed';

    var CONTOH = {
        saints: {
            nama: 'When the Saints (band): melodi, gitar, bass, piano, drum',
            tex: [
                '\\title "When the Saints Go Marching In"',
                '\\artist "Lagu tradisional"',
                RAPI,
                '\\track "Melodi" { instrument 56 }',
                '  \\staff { score }',
                '  \\tuning none',
                '  \\ts 4 4 \\tempo 120',
                '  :4 r C5 E5 F5 | G5.1 | :4 r C5 E5 F5 | G5.1 |',
                '  :4 r C5 E5 F5 | G5.2 E5.2 | C5.2 E5.2 | D5.1 |',
                '  :4 r E5 E5 D5 | C5.2 {d} C5.4 | E5.2 G5.2 | G5.2 F5.2 |',
                '  :4 r E5 F5 G5 | E5.2 C5.2 | D5.1 | C5.1',
                '\\track "Gitar" { instrument 25 }',
                '  \\staff { score tabs }',
                '  ' + GITAR,
                defChord(['C', 'C7', 'F', 'G7']),
                '  ' + strum(HARMONI_SAINTS, 4),
                '\\track "Bass" { instrument 33 }',
                '  \\staff { tabs }',
                '  ' + BASS,
                '  ' + bassAkar(HARMONI_SAINTS),
                '\\track "Piano" { instrument 0 }',
                '  \\staff { score }',
                '  \\tuning piano',
                '  ' + pianoAkor(HARMONI_SAINTS),
                '\\track "Drum"',
                '  \\instrument percussion',
                '  \\clef neutral',
                '  \\articulation defaults',
                '  ' + new Array(16).join(DRUM_BAR + ' | ') + ':1 (KickHit CrashMediumHit)'
            ].join('\n')
        },
        ode: {
            nama: 'Ode to Joy (Beethoven): melodi, gitar, bass',
            tex: [
                '\\title "Ode to Joy"',
                '\\subtitle "Tema Simfoni No. 9"',
                '\\artist "Ludwig van Beethoven"',
                RAPI,
                '\\track "Melodi" { instrument 24 }',
                '  \\staff { score tabs }',
                '  ' + GITAR,
                '  \\ts 4 4 \\tempo 100',
                '  :4 0.1 0.1 1.1 3.1 | 3.1 1.1 0.1 3.2 | 1.2 1.2 3.2 0.1 | 0.1 {d} 3.2.8 3.2.2 |',
                '  :4 0.1 0.1 1.1 3.1 | 3.1 1.1 0.1 3.2 | 1.2 1.2 3.2 0.1 | 3.2 {d} 1.2.8 1.2.2 |',
                '  :4 3.2 3.2 0.1 1.2 | 3.2 0.1.8 1.1 0.1.4 1.2 | 3.2 0.1.8 1.1 0.1.4 3.2 | 1.2 3.2 0.3.2 |',
                '  :4 0.1 0.1 1.1 3.1 | 3.1 1.1 0.1 3.2 | 1.2 1.2 3.2 0.1 | 3.2 {d} 1.2.8 1.2.2',
                '\\track "Gitar pengiring" { instrument 25 }',
                '  \\staff { score tabs }',
                '  ' + GITAR,
                defChord(['C', 'G', 'G7']),
                '  ' + strum(HARMONI_ODE, 2),
                '\\track "Bass" { instrument 33 }',
                '  \\staff { score tabs }',
                '  ' + BASS,
                '  ' + bassAkar(HARMONI_ODE)
            ].join('\n')
        },
        twinkle: {
            nama: 'Twinkle Twinkle Little Star: melodi + chord + lirik',
            tex: [
                '\\title "Twinkle Twinkle Little Star"',
                '\\artist "Lagu tradisional"',
                RAPI,
                '\\track "Gitar" { instrument 24 }',
                '  \\staff { score tabs }',
                '  ' + GITAR,
                defChord(['C', 'F', 'G']),
                '  \\lyrics "Twin kle twin kle lit tle star, how I won der what you are. Up a bove the world so high, like a dia mond in the sky. Twin kle twin kle lit tle star, how I won der what you are."',
                '  \\ts 4 4 \\tempo 100',
                '  :4 1.2 {ch "C"} 1.2 3.1 3.1 | :4 5.1 {ch "F"} 5.1 3.1.2 {ch "C"} | :4 1.1 {ch "F"} 1.1 0.1 {ch "C"} 0.1 | :4 3.2 {ch "G"} 3.2 1.2.2 {ch "C"} |',
                '  :4 3.1 {ch "C"} 3.1 1.1 {ch "F"} 1.1 | :4 0.1 {ch "C"} 0.1 3.2.2 {ch "G"} | :4 3.1 {ch "C"} 3.1 1.1 {ch "F"} 1.1 | :4 0.1 {ch "C"} 0.1 3.2.2 {ch "G"} |',
                '  :4 1.2 {ch "C"} 1.2 3.1 3.1 | :4 5.1 {ch "F"} 5.1 3.1.2 {ch "C"} | :4 1.1 {ch "F"} 1.1 0.1 {ch "C"} 0.1 | :4 3.2 {ch "G"} 3.2 1.2.2 {ch "C"}'
            ].join('\n')
        },
        romance: {
            nama: 'Romance (Anonim): pola petikan pembuka',
            tex: [
                '\\title "Romance"',
                '\\subtitle "Pola petikan pembuka"',
                '\\artist "Anonim (Spanyol)"',
                RAPI,
                '\\track "Gitar klasik" { instrument 24 }',
                '  \\staff { score tabs }',
                '  ' + GITAR,
                '  \\ts 3 4 \\tempo 60',
                '  :8 {tu 3} (7.1 0.6) 0.2 0.3 7.1 0.2 0.3 7.1 0.2 0.3 |',
                '  :8 {tu 3} (7.1 0.6) 0.2 0.3 5.1 0.2 0.3 3.1 0.2 0.3 |',
                '  :8 {tu 3} (3.1 0.6) 0.2 0.3 2.1 0.2 0.3 0.1 0.2 0.3 |',
                '  :8 {tu 3} (0.1 0.6) 0.2 0.3 3.1 0.2 0.3 7.1 0.2 0.3 |',
                '  :2 (0.1 0.2 0.3 2.4 2.5 0.6) {d}'
            ].join('\n')
        }
    };
    /* templat "mulai baru" per instrumen */
    var TEMPLAT = {
        gitar: ['\\title "Lagu saya"', RAPI, '\\track "Gitar" { instrument 25 }', '  ' + GITAR, defChord(['C']), '  \\ts 4 4 \\tempo 90',
            '  :4 0.3 2.3 0.2 1.2 | (0.1 1.2 0.3 2.4 3.5).2 {ch "C"} r.2'],
        bass: ['\\title "Lagu saya"', RAPI, '\\track "Bass" { instrument 33 }', '  \\tuning (G2 D2 A1 E1)', '  \\ts 4 4 \\tempo 90',
            '  :4 3.3 3.3 0.1 0.1 | 1.4 1.4 3.3 3.3'],
        ukulele: ['\\title "Lagu saya"', RAPI, '\\track "Ukulele" { instrument 24 }', '  \\tuning (A4 E4 C4 G4)', '  \\chord ("C" 3 0 0 0)', '  \\ts 4 4 \\tempo 90',
            '  :4 (3.1 0.2 0.3 0.4) {ch "C"} 0.4 0.3 0.2 | (3.1 0.2 0.3 0.4).2 r.2'],
        piano: ['\\title "Lagu saya"', RAPI, '\\track "Piano" { instrument 0 }', '  \\staff { score }', '  \\tuning piano', '  \\ts 4 4 \\tempo 90',
            '  :4 C4 D4 E4 F4 | (C4 E4 G4).2 (B3 D4 G4).2'],
        drum: ['\\title "Lagu saya"', RAPI, '\\track "Drum"', '  \\instrument percussion', '  \\clef neutral', '  \\articulation defaults', '  \\ts 4 4 \\tempo 90',
            '  ' + DRUM_BAR + ' | ' + DRUM_BAR],
        vokal: ['\\title "Lagu saya"', RAPI, '\\track "Vokal" { instrument 53 }', '  \\staff { score }', '  \\tuning voice', '  \\lyrics "Do re mi fa sol la si do"', '  \\ts 4 4 \\tempo 90',
            '  :4 C4 D4 E4 F4 | G4 A4 B4 C5']
    };

    /* ================= elemen & alphaTab ================= */
    function $(s) { return document.querySelector(s); }
    function $$(s) { return [].slice.call(document.querySelectorAll(s)); }
    var main = $('#konten'), msg = $('#msg'), tex = $('#tex'), texErr = $('#texerr'), btnPlay = $('#play'), waktu = $('#waktu');
    if (!window.alphaTab) { msg.textContent = 'Penampil partitur gagal dimuat. Muat ulang halaman.'; return; }
    var JSONC = alphaTab.model.JsonConverter;
    var judulFile = 'partitur', ketik = 0, detikTerakhir = -1;
    /* keadaan lagu yang tampil */
    var dasar = null, nada = 0, kapo = 0, tampilan = 'semua', tampilTrack = [], bisu = {}, solo = {};

    function pesan(t, salah) { msg.textContent = t || ''; msg.hidden = !t; msg.classList.toggle('err', !!salah); }
    function jam(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    var hp = window.innerWidth < 600;
    var at = new alphaTab.AlphaTabApi($('#at'), {
        core: { fontDirectory: 'vendor/alphatab/font/' },
        display: { scale: hp ? 0.8 : 1, padding: hp ? [8, 8, 8, 8] : [20, 20, 20, 20] },
        notation: { elements: { scoreWordsAndMusic: false } },
        player: { playerMode: 'EnabledSynthesizer', soundFont: 'vendor/alphatab/soundfont/sonivox.sf2', scrollElement: main, scrollOffsetY: -150 }
    });
    window.__at = at; /* untuk pengujian */

    /* ================= transpose, kapo, tampilan ================= */
    function setiapNot(staff, fn) { staff.bars.forEach(function (b) { b.voices.forEach(function (v) { v.beats.forEach(function (bt) { fn(bt); }); }); }); }
    /* gitar & ukulele boleh pakai kapo; bass (senar rendah) dan instrumen 7 senar tidak */
    function bisaKapo(st) { return st.isStringed && !st.isPercussion && st.tuning.length && Math.min.apply(null, st.tuning) >= 40; }
    var KRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], MOL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    function geserNama(nama, d) {
        if (!d) return nama;
        return String(nama).replace(/(^|\/)([A-G])([#b]?)/g, function (m, awal, h, a) {
            var i = (KRES.indexOf(h) + (a === '#' ? 1 : a === 'b' ? -1 : 0) + d + 120) % 12;
            return awal + (a === 'b' || (!a && d < 0) ? MOL : KRES)[i];
        });
    }
    /* bentuk chord terbuka gitar stelan standar (senar 1 = paling tipis; -1 = tidak dibunyikan) */
    var BENTUK = {
        C: [0, 1, 0, 2, 3, -1], C7: [0, 1, 3, 2, 3, -1], D: [2, 3, 2, 0, -1, -1], D7: [2, 1, 2, 0, -1, -1], Dm: [1, 3, 2, 0, -1, -1],
        E: [0, 0, 1, 2, 2, 0], E7: [0, 0, 1, 0, 2, 0], Em: [0, 0, 0, 2, 2, 0], F: [1, 1, 2, 3, 3, 1], G: [3, 0, 0, 0, 2, 3], G7: [1, 0, 0, 0, 2, 3],
        A: [0, 2, 2, 2, 0, -1], A7: [0, 2, 0, 2, 0, -1], Am: [0, 1, 2, 2, 0, -1], B7: [2, 0, 2, 1, 2, -1]
    };
    var STANDAR = '64,59,55,50,45,40';
    function geserChord(st, dNama, dFret) {
        if (!st.chords) return;
        var standar = st.tuning.join(',') === STANDAR;
        st.chords.forEach(function (c) {
            c.name = geserNama(c.name, dNama);
            if (!dFret || !c.strings) return;
            var main1 = c.strings.filter(function (f) { return f >= 0; }).map(function (f) { return f + dFret; });
            if (main1.some(function (f) { return f < 0 || f > 24; })) {
                /* bentuk tidak bisa digeser (senar lepas jadi minus): pakai bentuk terbuka umum bila ada, kalau tidak sembunyikan diagram */
                if (standar && BENTUK[c.name]) { c.strings = BENTUK[c.name].slice(); c.firstFret = 1; c.barreFrets = []; } else c.showDiagram = false;
                return;
            }
            c.strings = c.strings.map(function (f) { return f >= 0 ? f + dFret : f; });
            c.barreFrets = (c.barreFrets || []).map(function (f) { return f + dFret; }).filter(function (f) { return f > 0; });
            var tekan = c.strings.filter(function (f) { return f > 0; });
            c.firstFret = tekan.length && Math.max.apply(null, tekan) > 4 ? Math.min.apply(null, tekan) : 1;
        });
    }
    /* instrumen bersenar: nada baru dicari pada senar yang sama, atau pindah ke senar lain bila fretnya di luar 0-24 */
    function geserSenar(st, d, kapoBaru) {
        var tun = st.tuning, n = tun.length, kapoLama = st.capo || 0;
        function senar(s) { return tun[n - s]; } /* Note.string 1 = senar paling rendah, tuning[0] = paling atas */
        setiapNot(st, function (bt) {
            var dipakai = {};
            bt.notes.forEach(function (nt) {
                var target = senar(nt.string) + kapoLama + nt.fret + d, f = target - senar(nt.string) - kapoBaru;
                if (f >= 0 && f <= 24 && !dipakai[nt.string]) { nt.fret = f; dipakai[nt.string] = 1; return; }
                var pilih = null;
                for (var s = 1; s <= n; s++) {
                    var g = target - senar(s) - kapoBaru;
                    if (!dipakai[s] && g >= 0 && g <= 24 && (!pilih || g < pilih.f)) pilih = { s: s, f: g };
                }
                if (pilih) { nt.string = pilih.s; nt.fret = pilih.f; dipakai[pilih.s] = 1; }
                else { nt.fret = Math.max(0, Math.min(24, f)); dipakai[nt.string] = 1; }
            });
        });
        st.capo = kapoBaru;
    }
    function aturTampilan(st) {
        if (tampilan === 'semua' || st.isPercussion) return;
        var senar = st.isStringed;
        st.showSlash = tampilan === 'slash';
        st.showNumbered = tampilan === 'angka';
        st.showTablature = tampilan === 'tab' && senar;
        st.showStandardNotation = tampilan === 'balok' || (tampilan === 'tab' && !senar);
    }
    /* salinan lagu dasar + transpose, kapo, tampilan, bisu/solo */
    function bangun() {
        var s = JSONC.jsObjectToScore(dasar, at.settings), geserPitch = [];
        s.tracks.forEach(function (t) {
            var bersenar = false;
            t.staves.forEach(function (st) {
                if (st.isPercussion) return;
                if (st.isStringed && st.tuning.length) {
                    bersenar = true;
                    /* dengan kapo, nama & diagram chord menunjukkan bentuk yang dimainkan (bukan nada yang terdengar) */
                    var kapoIni = bisaKapo(st) ? kapo : 0;
                    if (nada || kapoIni) geserSenar(st, nada, (st.capo || 0) + kapoIni);
                    geserChord(st, nada - kapoIni, nada - kapoIni);
                } else geserChord(st, nada, 0);
                aturTampilan(st);
            });
            if (t.staves[0] && t.staves[0].isPercussion) bersenar = true;
            geserPitch[t.index] = bersenar ? 0 : nada;
            t.playbackInfo.isMute = !!bisu[t.index]; t.playbackInfo.isSolo = !!solo[t.index];
        });
        at.settings.notation.transpositionPitches = geserPitch;
        return s;
    }
    function gambar() {
        if (!dasar) return;
        var s = bangun(), idx = tampilTrack.filter(function (i) { return i < s.tracks.length; });
        at.updateSettings();
        at.renderScore(s, idx.length ? idx : [0]);
    }

    /* ================= memuat lagu ================= */
    var dariTeks = false;
    /* sampai 3 instrumen tampil semua; file band yang lebih besar dimulai dari instrumen gitar (yang lain bisa dipilih) */
    function trackAwal(score) {
        if (score.tracks.length <= 3) return score.tracks.map(function (t) { return t.index; });
        var gitar = score.tracks.filter(function (t) { var st = t.staves[0]; return st && st.isStringed && !st.isPercussion && st.tuning.length >= 6; })[0];
        return [(gitar || score.tracks[0]).index];
    }
    /* o.semua: tampilkan semua instrumen; o.baru: lagu lain (atur ulang nada, kapo, bisu/solo) */
    function muatScore(score, o) {
        dasar = JSONC.scoreToJsObject(score);
        if (o.baru) { nada = 0; kapo = 0; bisu = {}; solo = {}; }
        tampilTrack = o.semua ? score.tracks.map(function (t) { return t.index; }) : trackAwal(score);
        if (score.title) judulFile = score.title;
        $('#kapo-w').hidden = !score.tracks.some(function (t) { return t.staves.some(bisaKapo); });
        kontrolNada();
        gambar();
    }
    function bukaFile(file) {
        if (!file) return;
        judulFile = file.name.replace(/\.[^.]+$/, '') || 'partitur';
        pesan('Membuka ' + file.name + '…');
        file.arrayBuffer().then(function (buf) {
            var score;
            try { score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(buf), at.settings); }
            catch (e) { return pesan('Format file tidak dikenali. Gunakan Guitar Pro (.gp, .gp3–.gp5, .gpx) atau MusicXML (.musicxml, .xml, .mxl).', true); }
            dariTeks = false; pesan('');
            muatScore(score, { baru: true });
        }).catch(function () { pesan('File tidak bisa dibaca.', true); });
    }
    function muatTeks(t, baru) {
        texErr.hidden = true;
        var score;
        try { var imp = new alphaTab.importer.AlphaTexImporter(); imp.initFromString(t, at.settings); score = imp.readScore(); }
        catch (e) { return tampilErrTeks(e); }
        dariTeks = true;
        muatScore(score, { semua: true, baru: baru });
    }
    /* pesan pembaca alphaTex (bahasa Inggris) diterjemahkan untuk yang paling sering muncul */
    var TERJEMAH = [
        [/^Unrecognized property '(.*)'\.?$/, 'properti {$1} tidak dikenal'],
        [/^Unrecognized metadata '(.*)'\.?$/, 'perintah \\$1 tidak dikenal'],
        [/^.*Group not closed.*$/, 'kurung belum ditutup'],
        [/^Unexpected '(.*)' token.*$/, function (m, t) { return 'tanda "' + ({ LParen: '(', RParen: ')', LBrace: '{', RBrace: '}', Pipe: '|', Dot: '.', Colon: ':', Asterisk: '*' }[t] || t) + '" tidak pada tempatnya'; }],
        [/^Unexpected end of file.*$/, 'tulisan berakhir sebelum selesai']
    ];
    function terjemah(m) { for (var i = 0; i < TERJEMAH.length; i++) if (TERJEMAH[i][0].test(m)) return m.replace(TERJEMAH[i][0], TERJEMAH[i][1]); return m; }
    function tampilErrTeks(e) {
        var c = e && (e.lexerDiagnostics ? e : e.cause) || e || {}, d = [];
        ['lexerDiagnostics', 'parserDiagnostics', 'semanticDiagnostics'].forEach(function (k) { if (c[k]) d = d.concat(Array.from(c[k])); });
        var salah = d.filter(function (x) { return x.severity >= 2; });
        if (!salah.length) salah = d;
        texErr.dataset.pos = salah[0] && salah[0].start ? salah[0].start.offset + ',' + salah[0].end.offset : '';
        texErr.textContent = salah.length ? salah.slice(0, 3).map(function (x) { return 'Baris ' + x.start.line + ', kolom ' + x.start.col + ': ' + terjemah(x.message); }).join('\n') + '\n(ketuk pesan ini untuk menuju bagian yang salah)'
            : 'Ada yang belum benar: ' + (e && e.message || e);
        texErr.hidden = false;
    }
    texErr.addEventListener('click', function () {
        var p = (texErr.dataset.pos || '').split(','); if (p.length < 2) return;
        tex.focus(); tex.setSelectionRange(+p[0], Math.max(+p[1], +p[0] + 1));
    });

    at.scoreLoaded.on(function (score) { $('#n-track').textContent = score.tracks.length; gambarTrack(); $('#unduh').disabled = false; });
    at.renderStarted.on(function () { if (!msg.classList.contains('err')) pesan('Menggambar partitur…'); });
    at.renderFinished.on(function () { if (!msg.classList.contains('err')) pesan(''); });
    at.error.on(function (e) {
        if (dariTeks) tampilErrTeks(e);
        else pesan('File tidak bisa dibuka. Pastikan formatnya Guitar Pro (.gp, .gp3–.gp5, .gpx) atau MusicXML.', true);
    });

    /* ================= kontrol ================= */
    function kontrolNada() {
        $('#nada').textContent = 'Nada ' + (nada > 0 ? '+' + nada : nada < 0 ? '−' + -nada : '0');
        $('#kapo').value = String(kapo);
    }
    $('#nada-turun').addEventListener('click', function () { if (nada > -12) { nada--; kontrolNada(); gambar(); } });
    $('#nada-naik').addEventListener('click', function () { if (nada < 12) { nada++; kontrolNada(); gambar(); } });
    $('#kapo').innerHTML = '<option value="0">Tanpa kapo</option>' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return '<option value="' + k + '">Kapo ' + k + '</option>'; }).join('');
    $('#kapo').addEventListener('change', function () { kapo = +this.value; gambar(); });
    $('#profil').addEventListener('change', function () { tampilan = this.value; gambar(); });

    at.soundFontLoad.on(function (e) { if (e.total) btnPlay.textContent = 'Memuat suara ' + Math.round(e.loaded / e.total * 100) + '%'; });
    at.playerReady.on(function () { btnPlay.disabled = false; btnPlay.textContent = 'Putar'; });
    at.playerStateChanged.on(function (e) {
        var main1 = e.state === alphaTab.synth.PlayerState.Playing;
        btnPlay.textContent = main1 ? 'Jeda' : 'Putar'; btnPlay.classList.toggle('on', main1);
    });
    at.playerPositionChanged.on(function (e) {
        var d = Math.floor(e.currentTime / 1000);
        if (d === detikTerakhir) return; detikTerakhir = d;
        waktu.textContent = jam(e.currentTime) + ' / ' + jam(e.endTime);
    });
    btnPlay.addEventListener('click', function () { at.playPause(); });
    $('#stop').addEventListener('click', function () { at.stop(); });
    $('#speed').addEventListener('change', function () { at.playbackSpeed = +this.value; });
    function saklar(id, fn) {
        var b = $(id);
        b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); fn(on); });
    }
    saklar('#loop', function (on) { at.isLooping = on; });
    saklar('#metro', function (on) { at.metronomeVolume = on ? 1 : 0; });
    saklar('#countin', function (on) { at.countInVolume = on ? 1 : 0; });

    /* ---------- instrumen (track) ---------- */
    function gambarTrack() {
        var score = at.score; if (!score) return;
        $('#tracks').innerHTML = score.tracks.map(function (t) {
            var i = t.index;
            return '<div class="sc-trk" data-i="' + i + '"><b>' + esc(t.name || 'Instrumen ' + (i + 1)) + '</b>' +
                '<label class="tgl"><input type="checkbox" data-tampil' + (tampilTrack.indexOf(i) > -1 ? ' checked' : '') + '> Tampil</label>' +
                '<button type="button" class="chip" data-mute aria-pressed="' + !!bisu[i] + '">Bisu</button>' +
                '<button type="button" class="chip" data-solo aria-pressed="' + !!solo[i] + '">Solo</button></div>';
        }).join('');
    }
    $('#tracks').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var i = +b.closest('[data-i]').dataset.i, t = at.score.tracks[i], on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        if (b.hasAttribute('data-mute')) { bisu[i] = on; at.changeTrackMute([t], on); } else { solo[i] = on; at.changeTrackSolo([t], on); }
    });
    $('#tracks').addEventListener('change', function (e) {
        if (!e.target.hasAttribute('data-tampil')) return;
        var pilih = $$('#tracks [data-tampil]').filter(function (c) { return c.checked; }).map(function (c) { return +c.closest('[data-i]').dataset.i; });
        if (!pilih.length) { e.target.checked = true; return; }
        tampilTrack = pilih;
        at.renderTracks(pilih.map(function (i) { return at.score.tracks[i]; }));
    });

    /* ---------- unduh & cetak (sesuai yang tampil: sudah ditranspose / pakai kapo) ---------- */
    function simpanBlob(data, nama, tipe) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: tipe })); a.download = nama;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }
    function namaAman() { return (judulFile || 'partitur').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'partitur'; }
    $('#dl-gp').addEventListener('click', function () { simpanBlob(new alphaTab.exporter.Gp7Exporter().export(at.score, at.settings), namaAman() + '.gp', 'application/octet-stream'); });
    $('#dl-midi').addEventListener('click', function () { at.downloadMidi(); });
    $('#dl-tex').addEventListener('click', function () { simpanBlob(new alphaTab.exporter.AlphaTexExporter().exportToString(at.score, at.settings), namaAman() + '.txt', 'text/plain'); });
    $('#cetak').addEventListener('click', function () { at.print(); });

    /* ---------- mode buka / tulis ---------- */
    function gantiMode(m) {
        $$('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m); });
        $('#sc-buka').hidden = m !== 'buka'; $('#sc-tulis').hidden = m !== 'tulis';
        if (m === 'tulis' && !tex.value.trim()) { tex.value = TEMPLAT.gitar.join('\n'); muatTeks(tex.value, true); }
    }
    $$('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { gantiMode(b.dataset.mode); }); });
    tex.addEventListener('input', function () { clearTimeout(ketik); ketik = setTimeout(function () { muatTeks(tex.value, false); }, 600); });
    $('#templat').addEventListener('change', function () {
        var t = TEMPLAT[this.value]; this.value = ''; if (!t) return;
        tex.value = t.join('\n'); muatTeks(tex.value, true); tex.focus();
    });
    $('#tex-ini').addEventListener('click', function () {
        if (!at.score) return;
        try { tex.value = new alphaTab.exporter.AlphaTexExporter().exportToString(at.score, at.settings); muatTeks(tex.value, true); } catch (e) { tampilErrTeks(e); }
    });

    $('#file').addEventListener('change', function () { bukaFile(this.files[0]); this.value = ''; });
    $('#contoh').innerHTML = '<option value="">Coba contoh lagu…</option>' + Object.keys(CONTOH).map(function (k) { return '<option value="' + k + '">' + esc(CONTOH[k].nama) + '</option>'; }).join('');
    $('#contoh').addEventListener('change', function () {
        var c = CONTOH[this.value]; if (!c) return;
        tex.value = c.tex; muatTeks(c.tex, true);
    });
    /* tarik & lepas file ke halaman */
    main.addEventListener('dragover', function (e) { e.preventDefault(); main.classList.add('drop'); });
    main.addEventListener('dragleave', function (e) { if (e.target === main) main.classList.remove('drop'); });
    main.addEventListener('drop', function (e) { e.preventDefault(); main.classList.remove('drop'); if (e.dataTransfer.files[0]) { gantiMode('buka'); bukaFile(e.dataTransfer.files[0]); } });

    /* laci (drawer) Info, Instrumen, Unduh, Cara menulis */
    $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { $('#' + b.dataset.open).hidden = false; }); });
    $$('.drawer').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.hidden = true; }); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') $$('.drawer').forEach(function (d) { d.hidden = true; });
        if (e.key === ' ' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) && !btnPlay.disabled) { e.preventDefault(); at.playPause(); }
    });

    /* lagu awal: band lengkap, supaya terlihat semua instrumen bisa */
    $('#contoh').value = 'saints'; tex.value = CONTOH.saints.tex; muatTeks(CONTOH.saints.tex, true);
})();
