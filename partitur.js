/* Baca & tulis tab / partitur (partitur.html) memakai alphaTab (vendor/alphatab, lisensi MPL-2.0).
   File Guitar Pro / MusicXML dibuka langsung di perangkat pengunjung, tidak diunggah ke mana pun. */
(function () {
    /* ---------- lagu contoh: semuanya bebas hak cipta (domain publik) ---------- */
    var GITAR = '\\tuning (E4 B3 G3 D3 A2 E2) { hide }', RAPI = '\\hideDynamics'; /* stelan standar & tanda dinamika tidak perlu ditulis */
    var CHORD = { C: '(0.1 1.2 0.3 2.4 3.5)', G: '(3.1 0.2 0.3 0.4 2.5 3.6)', G7: '(1.1 0.2 0.3 0.4 2.5 3.6)' };
    function iringan(baris) { /* 'C' = satu bar penuh (2 petikan), 'G C' = setengah bar masing-masing */
        return baris.map(function (b) {
            var c = b.split(' ');
            return ':2 ' + (c.length === 1 ? CHORD[c[0]] + ' {ch "' + c[0] + '"} ' + CHORD[c[0]] : c.map(function (x) { return CHORD[x] + ' {ch "' + x + '"}'; }).join(' '));
        }).join(' |\n  ');
    }
    function bass(baris) {
        var nada = { C: '3.3', G: '3.4', G7: '3.4' };
        return baris.map(function (b) { var c = b.split(' '); return ':2 ' + (c.length === 1 ? nada[c[0]] + ' ' + nada[c[0]] : nada[c[0]] + ' ' + nada[c[1]]); }).join(' | ');
    }
    var HARMONI_ODE = ['C', 'G7', 'C', 'G', 'C', 'G7', 'C', 'G C', 'G C', 'G C', 'G7', 'C G', 'C', 'G7', 'C', 'G C'];
    var CONTOH = {
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
                '  \\chord ("C" 0 1 0 2 3 x)',
                '  \\chord ("G" 3 0 0 0 2 3)',
                '  \\chord ("G7" 1 0 0 0 2 3)',
                '  ' + iringan(HARMONI_ODE),
                '\\track "Bass" { instrument 33 }',
                '  \\staff { score tabs }',
                '  \\tuning (G2 D2 A1 E1) { hide }',
                '  ' + bass(HARMONI_ODE)
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
                '  \\chord ("C" 0 1 0 2 3 x)',
                '  \\chord ("F" 1 1 2 3 3 1)',
                '  \\chord ("G" 3 0 0 0 2 3)',
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
    var KOSONG = [
        '\\title "Lagu saya"',
        RAPI,
        '\\track "Gitar"',
        '  ' + GITAR,
        '  \\ts 4 4 \\tempo 90',
        '  :4 0.3 2.3 0.2 1.2 | (0.1 1.2 0.3 2.4 3.5).2 {ch "C"} r.2'
    ].join('\n');

    /* ---------- elemen ---------- */
    function $(s) { return document.querySelector(s); }
    function $$(s) { return [].slice.call(document.querySelectorAll(s)); }
    var main = $('#konten'), wadah = $('#at'), msg = $('#msg'), tex = $('#tex'), texErr = $('#texerr');
    var btnPlay = $('#play'), waktu = $('#waktu'), mode = 'buka', judulFile = 'partitur', ketik = 0, detikTerakhir = -1;
    if (!window.alphaTab) { msg.textContent = 'Penampil partitur gagal dimuat. Muat ulang halaman.'; return; }

    function pesan(t, salah) { msg.textContent = t || ''; msg.hidden = !t; msg.classList.toggle('err', !!salah); }
    function jam(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

    var hp = window.innerWidth < 600;
    var at = new alphaTab.AlphaTabApi(wadah, {
        core: { fontDirectory: 'vendor/alphatab/font/' },
        display: { staveProfile: 'Default', scale: hp ? 0.8 : 1, padding: hp ? [8, 8, 8, 8] : [20, 20, 20, 20] },
        notation: { elements: { scoreWordsAndMusic: false } },
        player: { playerMode: 'EnabledSynthesizer', soundFont: 'vendor/alphatab/soundfont/sonivox.sf2', scrollElement: main, scrollOffsetY: -150 }
    });
    window.__at = at; /* untuk pengujian */

    /* ---------- memuat lagu ---------- */
    var dariTeks = false;
    function bukaFile(file) {
        if (!file) return;
        judulFile = file.name.replace(/\.[^.]+$/, '') || 'partitur';
        pesan('Membuka ' + file.name + '…');
        file.arrayBuffer().then(function (buf) {
            var score;
            try { score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(buf), at.settings); }
            catch (e) { return pesan('Format file tidak dikenali. Gunakan Guitar Pro (.gp, .gp3–.gp5, .gpx) atau MusicXML (.musicxml, .xml, .mxl).', true); }
            dariTeks = false;
            at.renderScore(score, trackAwal(score));
        }).catch(function () { pesan('File tidak bisa dibaca.', true); });
    }
    /* sampai 3 instrumen tampil semua; file band yang lebih besar dimulai dari instrumen gitar (yang lain bisa dipilih) */
    function trackAwal(score) {
        if (score.tracks.length <= 3) return score.tracks.map(function (t) { return t.index; });
        var gitar = score.tracks.filter(function (t) { var st = t.staves[0]; return st && st.isStringed && !st.isPercussion && st.tuning.length >= 6; })[0];
        return [(gitar || score.tracks[0]).index];
    }
    function muatTeks(t) {
        dariTeks = true; texErr.hidden = true;
        try { at.tex(t, 'all'); } catch (e) { tampilErrTeks(e); }
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
        var c = e && e.cause || e || {}, d = [];
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

    at.scoreLoaded.on(function (score) {
        $('#n-track').textContent = score.tracks.length;
        judulFile = score.title || judulFile;
        gambarTrack(); $('#unduh').disabled = false; pesan('');
    });
    at.renderStarted.on(function () { if (!msg.classList.contains('err')) pesan('Menggambar partitur…'); });
    at.renderFinished.on(function () { if (!msg.classList.contains('err')) pesan(''); });
    at.error.on(function (e) {
        if (dariTeks) tampilErrTeks(e);
        else pesan('File tidak bisa dibuka. Pastikan formatnya Guitar Pro (.gp, .gp3–.gp5, .gpx) atau MusicXML.', true);
    });

    /* ---------- pemutar ---------- */
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
    $('#profil').addEventListener('change', function () {
        at.settings.display.staveProfile = alphaTab.StaveProfile[this.value];
        at.updateSettings(); at.render();
    });

    /* ---------- instrumen (track) ---------- */
    function gambarTrack() {
        var score = at.score; if (!score) return;
        var tampil = at.tracks.map(function (t) { return t.index; });
        $('#tracks').innerHTML = score.tracks.map(function (t) {
            var nama = t.name || 'Instrumen ' + (t.index + 1);
            return '<div class="sc-trk" data-i="' + t.index + '"><b>' + esc(nama) + '</b>' +
                '<label class="tgl"><input type="checkbox" data-tampil' + (tampil.indexOf(t.index) > -1 ? ' checked' : '') + '> Tampil</label>' +
                '<button type="button" class="chip" data-mute aria-pressed="false">Bisu</button>' +
                '<button type="button" class="chip" data-solo aria-pressed="false">Solo</button></div>';
        }).join('');
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    $('#tracks').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var t = at.score.tracks[+b.closest('[data-i]').dataset.i], on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        if (b.hasAttribute('data-mute')) at.changeTrackMute([t], on); else at.changeTrackSolo([t], on);
    });
    $('#tracks').addEventListener('change', function (e) {
        if (!e.target.hasAttribute('data-tampil')) return;
        var pilih = $$('#tracks [data-tampil]').filter(function (c) { return c.checked; }).map(function (c) { return at.score.tracks[+c.closest('[data-i]').dataset.i]; });
        if (!pilih.length) { e.target.checked = true; return; }
        at.renderTracks(pilih);
    });

    /* ---------- unduh & cetak ---------- */
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
        mode = m;
        $$('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m); });
        $('#sc-buka').hidden = m !== 'buka'; $('#sc-tulis').hidden = m !== 'tulis';
        if (m === 'tulis') { if (!tex.value.trim()) tex.value = KOSONG; muatTeks(tex.value); }
    }
    $$('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { gantiMode(b.dataset.mode); }); });
    tex.addEventListener('input', function () { clearTimeout(ketik); ketik = setTimeout(function () { muatTeks(tex.value); }, 600); });
    $('#tex-kosong').addEventListener('click', function () { tex.value = KOSONG; muatTeks(tex.value); tex.focus(); });
    $('#tex-ini').addEventListener('click', function () {
        if (!at.score) return;
        try { tex.value = new alphaTab.exporter.AlphaTexExporter().exportToString(at.score, at.settings); muatTeks(tex.value); } catch (e) { tampilErrTeks(e); }
    });

    $('#file').addEventListener('change', function () { bukaFile(this.files[0]); this.value = ''; });
    $('#contoh').innerHTML = '<option value="">Coba contoh lagu…</option>' + Object.keys(CONTOH).map(function (k) { return '<option value="' + k + '">' + esc(CONTOH[k].nama) + '</option>'; }).join('');
    $('#contoh').addEventListener('change', function () {
        var c = CONTOH[this.value]; if (!c) return;
        tex.value = c.tex; muatTeks(c.tex);
    });
    /* tarik & lepas file ke halaman */
    main.addEventListener('dragover', function (e) { e.preventDefault(); main.classList.add('drop'); });
    main.addEventListener('dragleave', function (e) { if (e.target === main) main.classList.remove('drop'); });
    main.addEventListener('drop', function (e) { e.preventDefault(); main.classList.remove('drop'); if (e.dataTransfer.files[0]) { gantiMode('buka'); bukaFile(e.dataTransfer.files[0]); } });

    /* laci (drawer) Info, Instrumen, Unduh */
    $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { $('#' + b.dataset.open).hidden = false; }); });
    $$('.drawer').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.hidden = true; }); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') $$('.drawer').forEach(function (d) { d.hidden = true; });
        if (e.key === ' ' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) && !btnPlay.disabled) { e.preventDefault(); at.playPause(); }
    });

    /* lagu awal supaya halaman tidak kosong */
    $('#contoh').value = 'ode'; tex.value = CONTOH.ode.tex; muatTeks(CONTOH.ode.tex);
})();
