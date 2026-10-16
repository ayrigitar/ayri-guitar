/* Amp & Efek gitar (efek.html): sinyal gitar dari audio interface diolah langsung di browser (Web Audio).
   Rantai: input -> blok yang bisa diurutkan (noise gate, boost, overdrive, distortion, fuzz, EQ,
   amp + kabinet, delay, reverb) -> volume -> pembatas -> output.
   Semua diproses di perangkat pengunjung; tidak ada suara yang dikirim ke mana pun.
   Nama amp dan kabinet sengaja deskriptif (tanpa merek). Rekaman kabinet & ruang reverb dibuat sintetis. */
(function () {
    'use strict';
    function $(s) { return document.querySelector(s); }
    function $$(s) { return [].slice.call(document.querySelectorAll(s)); }
    var AC = window.AudioContext || window.webkitAudioContext;
    var statusEl = $('#ef-status');
    function kabar(t, salah) { statusEl.textContent = t; statusEl.classList.toggle('err', !!salah); }
    if (!AC) { kabar('Browser ini belum bisa mengolah suara. Pakai Chrome, Edge, Firefox, atau Safari versi terbaru.', true); return; }

    function db(v) { return Math.pow(10, v / 20); }
    function angka(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ','); }
    /* bilangan acak berbenih: suara contoh & ruang reverb selalu sama setiap dibuka */
    function acak(benih) { var a = benih >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

    /* ================= bentuk distorsi (waveshaper) ================= */
    var NK = 8192;
    function kurva(fn) {
        var c = new Float32Array(NK), m = 0, i;
        for (i = 0; i < NK; i++) { c[i] = fn(i * 2 / (NK - 1) - 1); m = Math.max(m, Math.abs(c[i])); }
        for (i = 0; i < NK; i++) c[i] /= m;
        return c;
    }
    var K = {
        tabung: kurva(function (x) { return Math.tanh(2.5 * x); }),
        /* tabung tak simetris: menambah harmonik genap (lebih "hangat") */
        asimetris: kurva(function (x) { return Math.tanh(2.5 * (x + 0.2)) - Math.tanh(0.5); }),
        keras: kurva(function (x) { var y = 1.5 * x - 0.5 * x * x * x; return x < 0 ? y * 0.9 : y; }),
        kotak: kurva(function (x) { return (x < 0 ? -0.82 : 1) * (1 - Math.exp(-Math.abs(x) * 12)); })
    };

    /* ================= pembantu node ================= */
    function gn(ctx, v) { var g = ctx.createGain(); g.gain.value = v; return g; }
    function bq(ctx, type, f, q, g) {
        var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f;
        if (q !== null && q !== undefined) b.Q.value = q;
        if (g !== null && g !== undefined) b.gain.value = g;
        return b;
    }
    function ws(ctx, c) { var w = ctx.createWaveShaper(); w.curve = c; w.oversample = '4x'; return w; }
    function rangkai(nodes) { for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes; }
    /* node AudioWorklet (efek-worklet.js); bila browser belum mendukung, blok menjadi jalur lurus */
    function wnode(ctx, nama, stereo) {
        if (!ctx.ayriSiap) return null;
        try { return new AudioWorkletNode(ctx, nama, stereo ? { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] } : { numberOfInputs: 1, numberOfOutputs: 1 }); } catch (e) { return null; }
    }
    function lurus(ctx) { var g = gn(ctx, 1); return { masuk: g, keluar: g, atur: function () {} }; }
    function setP(node, nama, v) { var a = node.parameters.get(nama); if (a) a.value = v; }
    function blokWorklet(ctx, nama, stereo, atur) {
        var n = wnode(ctx, nama, stereo); if (!n) return lurus(ctx);
        return { masuk: n, keluar: n, atur: function (p) { atur(n, p); } };
    }
    /* perubahan kenop dihaluskan ~15 ms supaya tidak berbunyi "klik" */
    function halus(ctx, param, v) {
        if (ctx.state !== 'running') { param.value = v; return; }
        param.setTargetAtTime(v, ctx.currentTime, 0.015);
    }

    /* ================= filter dalam JS (untuk membuat rekaman kabinet) ================= */
    function koef(t, f, q, g, sr) {
        var A = Math.pow(10, (g || 0) / 40), w = 2 * Math.PI * f / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q), b0, b1, b2, a0, a1, a2;
        if (t === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
        else if (t === 'highpass') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
        else { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
        return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
    }
    function saring(x, c) {
        var y = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (var i = 0; i < x.length; i++) { var v = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
        return y;
    }
    /* kabinet speaker: respons frekuensi khas + pantulan pendek (kabinet terbuka/tertutup) */
    var KAB = {
        '1x12': { nama: '1x12 terbuka', f: [['highpass', 75, 0.7], ['peaking', 120, 1.2, 3], ['peaking', 2200, 1.4, 4], ['peaking', 4200, 2, -5], ['lowpass', 5800, 0.8], ['lowpass', 7500, 0.7]], pantul: [0.0007, 0.3] },
        '2x12': { nama: '2x12', f: [['highpass', 80, 0.7], ['peaking', 110, 1.2, 4], ['peaking', 1800, 1.2, 3], ['peaking', 3200, 1.6, 2], ['lowpass', 5200, 0.8], ['lowpass', 6500, 0.7]], pantul: [0.0004, 0.2] },
        '4x12': { nama: '4x12 tertutup', f: [['highpass', 70, 1.0], ['peaking', 100, 1.4, 6], ['peaking', 400, 1, -2], ['peaking', 2500, 1.8, 4], ['lowpass', 4600, 1.0], ['lowpass', 5600, 0.7]], pantul: [0.0011, 0.15] },
        tanpa: { nama: 'Tanpa kabinet (DI)', f: [], pantul: [0, 0] }
    };
    var cacheIR = {};
    function irKabinet(ctx, nama) {
        var kunci = nama + ctx.sampleRate; if (cacheIR[kunci]) return cacheIR[kunci];
        var sr = ctx.sampleRate, n = Math.round(sr * 0.06), k = KAB[nama] || KAB['2x12'], x = new Float32Array(n), i;
        x[0] = 1;
        var d = Math.round(k.pantul[0] * sr); if (d > 0 && d < n) x[d] += k.pantul[1];
        k.f.forEach(function (f) { x = saring(x, koef(f[0], f[1], f[2], f[3], sr)); });
        var e = 0; for (i = 0; i < n; i++) e += x[i] * x[i];
        var skala = (k.f.length ? 0.35 : 0.9) / Math.sqrt(e);
        for (i = 0; i < n; i++) x[i] *= skala * (i > n * 0.8 ? (n - i) / (n * 0.2) : 1);
        var b = ctx.createBuffer(1, n, sr); b.getChannelData(0).set(x);
        cacheIR[kunci] = b;
        return b;
    }
    /* ruang reverb sintetis: derau yang meluruh, makin lama makin gelap; pegas diberi pantulan berulang */
    var RUANG = { ruang: { nama: 'Room', bangun: 0.004, redam: 0.55, cerah: 0.35 }, aula: { nama: 'Hall', bangun: 0.02, redam: 0.4, cerah: 0.3 }, plat: { nama: 'Plate', bangun: 0.001, redam: 0.15, cerah: 0.6 }, pegas: { nama: 'Spring', bangun: 0.002, redam: 0.35, cerah: 0.45 } };
    function irReverb(ctx, jenis, decay) {
        var sr = ctx.sampleRate, cfg = RUANG[jenis] || RUANG.aula, n = Math.round(sr * Math.min(7, decay * 1.2 + 0.1)), b = ctx.createBuffer(2, n, sr), rnd = acak(7 + n);
        for (var c = 0; c < 2; c++) {
            var d = b.getChannelData(c), lp = 0, k60 = Math.log(1000) / (decay * sr), i, e = 0;
            for (i = 0; i < n; i++) {
                var t = i / sr, a = cfg.cerah * Math.exp(-t * (1 + cfg.redam * 6) / decay) + 0.04;
                lp += a * ((rnd() * 2 - 1) - lp);
                d[i] = lp * Math.exp(-k60 * i) * Math.min(1, t / cfg.bangun);
            }
            if (jenis === 'pegas') {
                var lag = Math.round(sr * (0.029 + c * 0.004)), hp = 0, px = 0;
                for (i = lag; i < n; i++) d[i] += d[i - lag] * 0.45;
                for (i = 0; i < n; i++) { var x0 = d[i]; hp = 0.97 * (hp + x0 - px); px = x0; d[i] = hp; }
            }
            for (i = 0; i < n; i++) e += d[i] * d[i];
            var s = 0.6 / Math.sqrt(e); for (i = 0; i < n; i++) d[i] *= s;
        }
        return b;
    }

    /* ================= blok efek =================
       tiap blok: nama, warna (kelas CSS), param (kenop/pilihan), buat(ctx) -> { masuk, keluar, atur(p, kunciYangBerubah) } */
    function R(k, label, min, max, def, step, sat) { return { k: k, label: label, min: min, max: max, def: def, step: step || 0.1, sat: sat || '' }; }
    function KN(k, label, def) { return R(k, label, 0, 10, def === undefined ? 5 : def); }
    function PIL(k, label, pilihan, def) { return { k: k, label: label, pilihan: pilihan, def: def }; }
    var AMP = {
        bersih: { nama: 'Clean Amerika', hp: 70, terang: 3, bass: 110, mid: 450, midDasar: -3, treble: 2400, kal: 0.55,
            tahap: function (g) { return [[1 + g * 0.5, K.tabung, 9000]]; } },
        crunch: { nama: 'Crunch Inggris', hp: 90, terang: 1, bass: 120, mid: 900, midDasar: 2, treble: 2800, kal: 0.32,
            tahap: function (g) { return [[db(4 + g * 2.6), K.asimetris, 6500], [db(g * 1.2), K.tabung, 6000]]; } },
        lead: { nama: 'Lead Halus', hp: 100, terang: 0, bass: 120, mid: 750, midDasar: 3, treble: 2600, kal: 0.3,
            tahap: function (g) { return [[db(10 + g * 2.6), K.asimetris, 5500], [db(4 + g * 1.4), K.tabung, 5000], [db(2 + g), K.tabung, 4600]]; } },
        higain: { nama: 'Hi-gain Modern', hp: 150, terang: 1, bass: 100, mid: 650, midDasar: -2, treble: 3000, kal: 0.3,
            tahap: function (g) { return [[db(14 + g * 3), K.asimetris, 6500], [db(8 + g * 1.6), K.tabung, 5500], [db(4 + g * 1.2), K.tabung, 5000]]; } }
    };
    var BLOK = {
        gate: {
            nama: 'Noise gate', warna: 'abu', catatan: 'Meredam dengung saat senar tidak dipetik.',
            param: [R('ambang', 'Ambang', -90, -20, -62, 1, ' dB'), R('lepas', 'Lepas', 20, 600, 120, 5, ' ms')],
            buat: function (ctx) {
                if (!ctx.ayriSiap) { var g = gn(ctx, 1); return { masuk: g, keluar: g, atur: function () {} }; }
                var n = new AudioWorkletNode(ctx, 'ayri-gerbang', { numberOfInputs: 1, numberOfOutputs: 1 });
                return { masuk: n, keluar: n, atur: function (p) { n.parameters.get('ambang').value = p.ambang; n.parameters.get('lepas').value = p.lepas; } };
            }
        },
        boost: {
            nama: 'Boost', warna: 'perak', catatan: 'Menaikkan volume tanpa mengubah karakter, untuk mendorong amp atau menonjolkan solo.',
            param: [R('level', 'Level', 0, 20, 8, 0.5, ' dB'), R('terang', 'Terang', -6, 6, 0, 0.5, ' dB')],
            buat: function (ctx) {
                var g = gn(ctx, 1), t = bq(ctx, 'highshelf', 2500, null, 0); g.connect(t);
                return { masuk: g, keluar: t, atur: function (p) { halus(ctx, g.gain, db(p.level)); halus(ctx, t.gain, p.terang); } };
            }
        },
        od: {
            nama: 'Overdrive', warna: 'hijau', catatan: 'Pecah lembut seperti amp tabung yang didorong; responsif pada kuat-lemah petikan.',
            param: [KN('drive', 'Drive', 5), KN('tone', 'Tone', 5), KN('level', 'Level', 5)],
            buat: function (ctx) {
                var masuk = gn(ctx, 1), keluar = gn(ctx, 1), dorong = gn(ctx, 1), bersih = gn(ctx, 0.25), jumlah = gn(ctx, 1), nada = bq(ctx, 'lowpass', 3000, 0.5);
                rangkai([masuk, bq(ctx, 'highpass', 600, 0.7), bq(ctx, 'peaking', 900, 0.8, 4), dorong, ws(ctx, K.tabung), bq(ctx, 'lowpass', 6000, 0.7), jumlah]);
                masuk.connect(bersih); bersih.connect(jumlah); rangkai([jumlah, nada, keluar]);
                return { masuk: masuk, keluar: keluar, atur: function (p) {
                    halus(ctx, dorong.gain, db(6 + p.drive * 3.6)); halus(ctx, nada.frequency, 700 * Math.pow(10, p.tone / 10));
                    halus(ctx, keluar.gain, 0.32 * db((p.level - 5) * 2.4));
                } };
            }
        },
        dist: {
            nama: 'Distortion', warna: 'oranye', catatan: 'Pecah tajam dan padat untuk rock dan metal.',
            param: [KN('gain', 'Distorsi', 6), KN('tone', 'Tone', 5), KN('level', 'Level', 5)],
            buat: function (ctx) {
                var masuk = gn(ctx, 1), keluar = gn(ctx, 1), dorong = gn(ctx, 1), nada = bq(ctx, 'lowpass', 3000, 0.6);
                rangkai([masuk, bq(ctx, 'highpass', 90, 0.7), bq(ctx, 'peaking', 1200, 0.7, 6), dorong, ws(ctx, K.keras), bq(ctx, 'highpass', 25, 0.7), bq(ctx, 'lowpass', 7000, 0.7), nada, keluar]);
                return { masuk: masuk, keluar: keluar, atur: function (p) {
                    halus(ctx, dorong.gain, db(15 + p.gain * 4.5)); halus(ctx, nada.frequency, 800 * Math.pow(11, p.tone / 10));
                    halus(ctx, keluar.gain, 0.16 * db((p.level - 5) * 2.4));
                } };
            }
        },
        fuzz: {
            nama: 'Fuzz', warna: 'ungu', catatan: 'Gelombang hampir kotak: kasar, berdengung, khas rock garasi 60-an.',
            param: [KN('fuzz', 'Fuzz', 7), KN('tone', 'Tone', 5), KN('level', 'Level', 5)],
            buat: function (ctx) {
                var masuk = gn(ctx, 1), keluar = gn(ctx, 1), dorong = gn(ctx, 1), nada = bq(ctx, 'lowpass', 2500, 0.9);
                rangkai([masuk, bq(ctx, 'highpass', 60, 0.7), dorong, ws(ctx, K.kotak), bq(ctx, 'highpass', 25, 0.7), bq(ctx, 'peaking', 700, 0.8, -6), nada, keluar]);
                return { masuk: masuk, keluar: keluar, atur: function (p) {
                    halus(ctx, dorong.gain, db(20 + p.fuzz * 5)); halus(ctx, nada.frequency, 500 * Math.pow(16, p.tone / 10));
                    halus(ctx, keluar.gain, 0.14 * db((p.level - 5) * 2.4));
                } };
            }
        },
        eq: {
            nama: 'EQ', warna: 'baja', catatan: 'Atur frekuensi rendah sampai tinggi untuk membentuk tone.',
            param: [R('f100', '100', -12, 12, 0, 0.5, ' dB'), R('f200', '200', -12, 12, 0, 0.5, ' dB'), R('f400', '400', -12, 12, 0, 0.5, ' dB'), R('f800', '800', -12, 12, 0, 0.5, ' dB'),
                R('f1600', '1,6k', -12, 12, 0, 0.5, ' dB'), R('f3200', '3,2k', -12, 12, 0, 0.5, ' dB'), R('f6400', '6,4k', -12, 12, 0, 0.5, ' dB'), R('level', 'Level', -12, 12, 0, 0.5, ' dB')],
            buat: function (ctx) {
                var pita = [100, 200, 400, 800, 1600, 3200, 6400].map(function (f) { return bq(ctx, 'peaking', f, 1.1, 0); }), keluar = gn(ctx, 1);
                rangkai(pita.concat([keluar]));
                return { masuk: pita[0], keluar: keluar, atur: function (p) {
                    [100, 200, 400, 800, 1600, 3200, 6400].forEach(function (f, i) { halus(ctx, pita[i].gain, p['f' + f]); });
                    halus(ctx, keluar.gain, db(p.level));
                } };
            }
        },
        amp: {
            nama: 'Amplifier', warna: 'amp', lebar: true,
            param: [PIL('model', 'Model', Object.keys(AMP).map(function (k) { return [k, AMP[k].nama]; }), 'crunch'),
                PIL('kab', 'Kabinet', Object.keys(KAB).map(function (k) { return [k, KAB[k].nama]; }), '2x12'),
                KN('gain', 'Gain', 5), KN('bass', 'Bass', 5), KN('mid', 'Middle', 5), KN('treble', 'Treble', 5), KN('presence', 'Presence', 5), KN('master', 'Master', 5)],
            buat: function (ctx) {
                var masuk = gn(ctx, 1), hp = bq(ctx, 'highpass', 80, 0.7), terang = bq(ctx, 'highshelf', 2000, null, 0), tahap = [], prev = terang;
                rangkai([masuk, hp, terang]);
                for (var i = 0; i < 3; i++) {
                    var g = gn(ctx, 1), s = ws(ctx, null), lp = bq(ctx, 'lowpass', 8000, 0.7);
                    rangkai([prev, g, s, bq(ctx, 'highpass', 25, 0.7), lp]); prev = lp; tahap.push({ g: g, s: s, lp: lp });
                }
                var bass = bq(ctx, 'lowshelf', 120, null, 0), mid = bq(ctx, 'peaking', 700, 0.8, 0), treble = bq(ctx, 'highshelf', 2600, null, 0);
                var daya = gn(ctx, 1), pres = bq(ctx, 'highshelf', 3800, null, 0), kab = ctx.createConvolver(), keluar = gn(ctx, 1);
                kab.normalize = false;
                rangkai([prev, bass, mid, treble, daya, ws(ctx, K.tabung), pres, kab, keluar]);
                var kabKini = '';
                return { masuk: masuk, keluar: keluar, atur: function (p) {
                    var m = AMP[p.model] || AMP.crunch, st = m.tahap(p.gain);
                    halus(ctx, hp.frequency, m.hp); halus(ctx, terang.gain, m.terang);
                    tahap.forEach(function (t, k) {
                        var d = st[k];
                        if (d) { halus(ctx, t.g.gain, d[0]); if (t.s.curve !== d[1]) t.s.curve = d[1]; halus(ctx, t.lp.frequency, d[2]); }
                        else { halus(ctx, t.g.gain, 1); if (t.s.curve) t.s.curve = null; halus(ctx, t.lp.frequency, 20000); }
                    });
                    halus(ctx, bass.frequency, m.bass); halus(ctx, bass.gain, (p.bass - 5) * 2.4);
                    halus(ctx, mid.frequency, m.mid); halus(ctx, mid.gain, m.midDasar + (p.mid - 5) * 2.4);
                    halus(ctx, treble.frequency, m.treble); halus(ctx, treble.gain, (p.treble - 5) * 2.4);
                    halus(ctx, pres.gain, (p.presence - 5) * 2);
                    /* master tinggi = power amp makin jenuh */
                    halus(ctx, daya.gain, db((p.master - 5) * 1.6));
                    halus(ctx, keluar.gain, m.kal * db((p.master - 5) * 0.8));
                    if (kabKini !== p.kab) { kabKini = p.kab; kab.buffer = irKabinet(ctx, p.kab); }
                } };
            }
        },
        delay: {
            nama: 'Delay', warna: 'biru', catatan: 'Pengulangan suara (gema) setelah jeda tertentu.',
            param: [R('waktu', 'Waktu', 40, 1200, 380, 5, ' ms'), R('umpan', 'Ulangan', 0, 90, 35, 1, '%'), R('campur', 'Campur', 0, 100, 30, 1, '%'), KN('nada', 'Tone', 5)],
            buat: function (ctx) {
                var masuk = gn(ctx, 1), keluar = gn(ctx, 1), dl = ctx.createDelay(2.5), lp = bq(ctx, 'lowpass', 4500, 0.5), fb = gn(ctx, 0.35), basah = gn(ctx, 0.3);
                masuk.connect(keluar); rangkai([masuk, dl, lp, fb, dl]); lp.connect(basah); basah.connect(keluar);
                return { masuk: masuk, keluar: keluar, atur: function (p) {
                    if (ctx.state === 'running') dl.delayTime.setTargetAtTime(p.waktu / 1000, ctx.currentTime, 0.04); else dl.delayTime.value = p.waktu / 1000;
                    halus(ctx, fb.gain, p.umpan / 100); halus(ctx, basah.gain, p.campur / 100); halus(ctx, lp.frequency, 600 * Math.pow(20, p.nada / 10));
                } };
            }
        },
        reverb: {
            nama: 'Reverb', warna: 'hijau-laut', catatan: 'Pantulan suara di ruangan: room, hall, plate, atau spring.',
            param: [PIL('jenis', 'Jenis', Object.keys(RUANG).map(function (k) { return [k, RUANG[k].nama]; }), 'aula'), R('decay', 'Panjang', 0.3, 6, 1.8, 0.1, ' s'), R('campur', 'Campur', 0, 100, 25, 1, '%'), KN('nada', 'Tone', 6), R('pre', 'Pre-delay', 0, 120, 15, 1, ' ms')],
            buat: function (ctx) {
                var masuk = gn(ctx, 1), keluar = gn(ctx, 1), pre = ctx.createDelay(0.2), kv = ctx.createConvolver(), lp = bq(ctx, 'lowpass', 6000, 0.6), basah = gn(ctx, 0.25);
                kv.normalize = false;
                masuk.connect(keluar); rangkai([masuk, pre, kv, lp, basah, keluar]);
                var kini = '', tunda = 0;
                return { masuk: masuk, keluar: keluar, atur: function (p) {
                    pre.delayTime.value = p.pre / 1000; halus(ctx, basah.gain, p.campur / 100); halus(ctx, lp.frequency, 1500 * Math.pow(8, p.nada / 10));
                    var kunci = p.jenis + p.decay; if (kunci === kini) return; kini = kunci;
                    clearTimeout(tunda);
                    var buat = function () { kv.buffer = irReverb(ctx, p.jenis, p.decay); };
                    if (!kv.buffer) buat(); else tunda = setTimeout(buat, 200);
                } };
            }
        }
    };
    /* tahap 2: dinamika & filter, modulasi */
    BLOK.komp = {
        nama: 'Compressor', warna: 'kuning', catatan: 'Meratakan keras-pelan petikan; sustain lebih panjang dan suara lebih stabil.',
        param: [KN('sustain', 'Sustain', 5), R('attack', 'Attack', 1, 50, 10, 1, ' ms'), R('level', 'Level', -6, 12, 0, 0.5, ' dB'), R('campur', 'Campur', 0, 100, 100, 1, '%')],
        buat: function (ctx) {
            var masuk = gn(ctx, 1), keluar = gn(ctx, 1), k = ctx.createDynamicsCompressor(), isi = gn(ctx, 1), kering = gn(ctx, 0);
            k.knee.value = 6; k.release.value = 0.25;
            rangkai([masuk, k, isi, keluar]); masuk.connect(kering); kering.connect(keluar);
            return { masuk: masuk, keluar: keluar, atur: function (p) {
                halus(ctx, k.threshold, -10 - p.sustain * 4); halus(ctx, k.ratio, 3 + p.sustain * 0.7); k.attack.value = p.attack / 1000;
                halus(ctx, isi.gain, db(p.level + p.sustain * 1.6) * p.campur / 100); halus(ctx, kering.gain, 1 - p.campur / 100);
            } };
        }
    };
    BLOK.wah = {
        nama: 'Wah', warna: 'gelap', catatan: 'Geser Pedal untuk mengubah suara dari "uu" (tumit) ke "aa" (ujung kaki).',
        param: [KN('pedal', 'Pedal', 5), KN('reso', 'Resonansi', 5), KN('level', 'Level', 5)],
        buat: function (ctx) {
            var masuk = gn(ctx, 1), bp = bq(ctx, 'bandpass', 800, 5), isi = gn(ctx, 3), kering = gn(ctx, 0.08), keluar = gn(ctx, 1);
            rangkai([masuk, bp, isi, keluar]); masuk.connect(kering); kering.connect(keluar);
            return { masuk: masuk, keluar: keluar, atur: function (p) {
                halus(ctx, bp.frequency, 350 * Math.pow(2300 / 350, p.pedal / 10)); halus(ctx, bp.Q, 2 + p.reso * 0.8);
                halus(ctx, isi.gain, (2 + p.reso * 0.3) * db((p.level - 5) * 2.4));
            } };
        }
    };
    BLOK.autowah = {
        nama: 'Auto-wah', warna: 'merah-muda', catatan: 'Wah otomatis yang mengikuti kuat-lemah petikan (envelope filter). Cocok untuk funk.',
        param: [KN('peka', 'Kepekaan', 6), R('bawah', 'Dari', 150, 1000, 300, 10, ' Hz'), R('atas', 'Sampai', 800, 5000, 2500, 50, ' Hz'), KN('reso', 'Resonansi', 5),
            R('campur', 'Campur', 0, 100, 100, 1, '%'), PIL('arah', 'Arah', [['naik', 'Naik'], ['turun', 'Turun']], 'naik')],
        buat: function (ctx) {
            return blokWorklet(ctx, 'ayri-autowah', false, function (n, p) {
                setP(n, 'peka', p.peka / 10); setP(n, 'bawah', p.bawah); setP(n, 'atas', p.atas); setP(n, 'q', 1 + p.reso * 1.2);
                setP(n, 'campur', p.campur / 100); setP(n, 'arah', p.arah === 'turun' ? -1 : 1);
            });
        }
    };
    BLOK.chorus = {
        nama: 'Chorus', warna: 'biru-muda', catatan: 'Seperti beberapa gitar dimainkan bersamaan: tebal dan lebar (stereo).',
        param: [R('laju', 'Laju', 0.1, 5, 0.8, 0.05, ' Hz'), KN('dalam', 'Kedalaman', 5), R('campur', 'Campur', 0, 100, 50, 1, '%')],
        buat: function (ctx) {
            return blokWorklet(ctx, 'ayri-tunda', true, function (n, p) {
                setP(n, 'dasar', 14); setP(n, 'dalam', p.dalam * 0.5); setP(n, 'laju', p.laju); setP(n, 'umpan', 0);
                setP(n, 'basah', p.campur / 100); setP(n, 'kering', 1 - p.campur / 200); setP(n, 'lebar', 1);
            });
        }
    };
    BLOK.flanger = {
        nama: 'Flanger', warna: 'ungu-muda', catatan: 'Sapuan mendesing seperti jet lepas landas.',
        param: [R('laju', 'Laju', 0.05, 2, 0.25, 0.01, ' Hz'), KN('dalam', 'Kedalaman', 6), R('umpan', 'Regen', -90, 90, 55, 1, '%'), R('campur', 'Campur', 0, 100, 50, 1, '%')],
        buat: function (ctx) {
            return blokWorklet(ctx, 'ayri-tunda', true, function (n, p) {
                setP(n, 'dasar', 0.5); setP(n, 'dalam', 0.3 + p.dalam * 0.45); setP(n, 'laju', p.laju); setP(n, 'umpan', p.umpan / 100);
                setP(n, 'basah', p.campur / 100); setP(n, 'kering', 1 - p.campur / 200); setP(n, 'lebar', 0.3);
            });
        }
    };
    BLOK.phaser = {
        nama: 'Phaser', warna: 'jingga', catatan: 'Sapuan halus seperti suara angin; lebih lembut dari flanger.',
        param: [R('laju', 'Laju', 0.05, 5, 0.5, 0.05, ' Hz'), KN('dalam', 'Kedalaman', 7), R('umpan', 'Umpan balik', 0, 90, 40, 1, '%'),
            PIL('tahap', 'Tahap', [['4', '4 tahap'], ['6', '6 tahap'], ['8', '8 tahap']], '4'), R('campur', 'Campur', 0, 100, 100, 1, '%')],
        buat: function (ctx) {
            return blokWorklet(ctx, 'ayri-phaser', true, function (n, p) {
                setP(n, 'laju', p.laju); setP(n, 'dalam', p.dalam / 10); setP(n, 'umpan', p.umpan / 100); setP(n, 'campur', p.campur / 100); setP(n, 'tahap', +p.tahap);
            });
        }
    };
    BLOK.vibrato = {
        nama: 'Vibrato', warna: 'hijau-muda', catatan: 'Nada diayun naik-turun secara halus.',
        param: [R('laju', 'Laju', 0.5, 10, 5, 0.1, ' Hz'), KN('dalam', 'Kedalaman', 4)],
        buat: function (ctx) {
            return blokWorklet(ctx, 'ayri-tunda', true, function (n, p) {
                setP(n, 'dasar', 2); setP(n, 'dalam', p.dalam * 0.35); setP(n, 'laju', p.laju); setP(n, 'umpan', 0);
                setP(n, 'basah', 1); setP(n, 'kering', 0); setP(n, 'lebar', 0);
            });
        }
    };
    BLOK.tremolo = {
        nama: 'Tremolo', warna: 'emas', catatan: 'Volume diayun keras-pelan secara berkala.',
        param: [R('laju', 'Laju', 1, 12, 5, 0.1, ' Hz'), R('dalam', 'Kedalaman', 0, 100, 60, 1, '%'), PIL('bentuk', 'Bentuk', [['sine', 'Halus'], ['triangle', 'Segitiga'], ['square', 'Kotak']], 'sine')],
        buat: function (ctx) {
            var masuk = gn(ctx, 1), vca = gn(ctx, 1), osc = ctx.createOscillator(), lp = bq(ctx, 'lowpass', 200, 0.7), amp = gn(ctx, 0.3);
            rangkai([osc, lp, amp]); amp.connect(vca.gain); masuk.connect(vca); osc.start();
            return { masuk: masuk, keluar: vca, atur: function (p) {
                var d = p.dalam / 100; osc.type = p.bentuk; halus(ctx, osc.frequency, p.laju);
                /* gelombang kotak diperhalus supaya tidak berbunyi klik */
                halus(ctx, lp.frequency, p.bentuk === 'square' ? 40 : 200);
                halus(ctx, vca.gain, 1 - d / 2); halus(ctx, amp.gain, d / 2);
            } };
        }
    };
    BLOK.rotary = {
        nama: 'Rotary', warna: 'kayu', catatan: 'Speaker berputar ala organ (Leslie): lambat untuk chorale, cepat untuk tremolo.',
        param: [PIL('cepat', 'Kecepatan', [['0', 'Lambat'], ['1', 'Cepat']], '0'), KN('dalam', 'Kedalaman', 7), R('campur', 'Campur', 0, 100, 100, 1, '%')],
        buat: function (ctx) {
            return blokWorklet(ctx, 'ayri-rotary', true, function (n, p) { setP(n, 'cepat', +p.cepat); setP(n, 'dalam', p.dalam / 10); setP(n, 'campur', p.campur / 100); });
        }
    };
    var URUT = ['gate', 'komp', 'wah', 'autowah', 'boost', 'od', 'dist', 'fuzz', 'eq', 'amp', 'chorus', 'flanger', 'phaser', 'vibrato', 'tremolo', 'rotary', 'delay', 'reverb'];
    /* urutan lama (sebelum ada blok baru) dilengkapi: blok baru disisipkan sesudah blok sebelumnya menurut urutan bawaan */
    function lengkapiUrutan(u) {
        var hasil = (Array.isArray(u) ? u : []).filter(function (k, i, a) { return URUT.indexOf(k) > -1 && a.indexOf(k) === i; });
        URUT.forEach(function (k, i) {
            if (hasil.indexOf(k) > -1) return;
            var j2 = i - 1; while (j2 >= 0 && hasil.indexOf(URUT[j2]) < 0) j2--;
            hasil.splice(j2 < 0 ? 0 : hasil.indexOf(URUT[j2]) + 1, 0, k);
        });
        return hasil;
    }

    /* ================= graf audio =================
       input (mono) -> gain input -> [blok sesuai urutan, masing-masing bisa dimatikan] -> volume -> pembatas -> keluaran */
    function Graf(ctx, tujuan) {
        var g = { ctx: ctx, blok: {} };
        g.mono = ctx.createGain(); g.mono.channelCount = 1; g.mono.channelCountMode = 'explicit';
        g.inGain = gn(ctx, 1); g.mono.connect(g.inGain);
        g.inMeter = ctx.createAnalyser(); g.inMeter.fftSize = 1024;
        g.vol = gn(ctx, 1);
        g.batas = ctx.createDynamicsCompressor();
        g.batas.threshold.value = -4; g.batas.knee.value = 0; g.batas.ratio.value = 20; g.batas.attack.value = 0.002; g.batas.release.value = 0.12;
        g.outMeter = ctx.createAnalyser(); g.outMeter.fftSize = 1024;
        rangkai([g.vol, g.batas, g.outMeter]); g.batas.connect(tujuan || ctx.destination);
        URUT.forEach(function (k) {
            var inti = BLOK[k].buat(ctx), masuk = gn(ctx, 1), keluar = gn(ctx, 1), kering = gn(ctx, 0), basah = gn(ctx, 1);
            masuk.connect(kering); kering.connect(keluar); masuk.connect(inti.masuk); inti.keluar.connect(basah); basah.connect(keluar);
            g.blok[k] = { inti: inti, masuk: masuk, keluar: keluar, nyala: function (on) { halus(ctx, basah.gain, on ? 1 : 0); halus(ctx, kering.gain, on ? 0 : 1); } };
        });
        g.sambung = function (urutan) {
            g.inGain.disconnect(); urutan.forEach(function (k) { g.blok[k].keluar.disconnect(); });
            g.inGain.connect(g.inMeter);
            var prev = g.inGain;
            urutan.forEach(function (k) { prev.connect(g.blok[k].masuk); prev = g.blok[k].keluar; });
            prev.connect(g.vol);
        };
        g.terapkan = function (S, hanya, ubah) {
            (hanya ? [hanya] : URUT).forEach(function (k) { var b = S.blok[k]; g.blok[k].inti.atur(b.p, ubah); g.blok[k].nyala(b.on); });
            halus(ctx, g.inGain.gain, db(S.ing)); halus(ctx, g.vol.gain, db((S.vol - 7) * 3));
        };
        return g;
    }

    /* ================= gitar contoh (sintetis, Karplus-Strong) =================
       riff buatan sendiri: chord terbuka, power chord palm mute, lalu melodi pentatonik; sekitar 9,6 detik, berulang */
    function suaraContoh(ctx) {
        var sr = ctx.sampleRate, bpm = 100, ket = 60 / bpm, panjang = Math.round(sr * ket * 16), buf = new Float32Array(panjang), rnd = acak(42);
        function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
        function petik(t0, m, dur, o) {
            var f = hz(m), N = Math.max(2, Math.round(sr / f - 0.5)), awal = Math.round(t0 * sr), len = Math.min(panjang - awal, Math.round(dur * sr));
            if (len <= 0) return;
            var y = new Float32Array(N), pv = 0, i, terang = o.terang || 0.5, rata = 0;
            for (i = 0; i < N; i++) { pv += terang * ((rnd() * 2 - 1) - pv); y[i] = pv; rata += pv; }
            rata /= N; for (i = 0; i < N; i++) y[i] -= rata;
            var pick = Math.max(1, Math.round(N * 0.13)); for (i = N - 1; i >= pick; i--) y[i] -= y[i - pick] * 0.8;
            var p = 0, redam = o.redam || 0.996, kuat = o.kuat || 1, lepas = Math.min(len, Math.round(sr * 0.03));
            for (var n = 0; n < len; n++) {
                var cur = y[p]; y[p] = redam * 0.5 * (cur + y[(p + 1) % N]); p = (p + 1) % N;
                buf[awal + n] += cur * kuat * (n > len - lepas ? (len - n) / lepas : 1);
            }
        }
        function genjreng(t0, nada, dur, naik, o) {
            var urut = naik ? nada.slice().reverse() : nada;
            urut.forEach(function (m, i) { petik(t0 + i * 0.011, m, dur - i * 0.011, { kuat: (o && o.kuat || 0.7) * (naik ? 0.75 : 1), redam: o && o.redam, terang: o && o.terang }); });
        }
        var Em = [40, 47, 52, 55, 59, 64], C = [48, 52, 55, 60, 64], G = [43, 47, 50, 55, 59, 67], D = [50, 57, 62, 66], t = 0, k;
        /* birama 1-2: chord terbuka, pola turun-turun-naik-naik-turun */
        [[Em, C], [G, D]].forEach(function (pasangan) {
            pasangan.forEach(function (ch) {
                [[0, 0], [1, 0], [1.5, 1], [2.5, 1], [3, 0]].forEach(function (s, j) { genjreng(t + s[0] * ket * 0.5, ch, (j === 4 ? 1 : 0.5) * ket, s[1]); });
                t += 2 * ket;
            });
        });
        /* birama 3: power chord palm mute per 1/8 */
        var kuasa = [[40, 47], [40, 47], [40, 47], [40, 47], [43, 50], [43, 50], [45, 52], [45, 52]];
        for (k = 0; k < 8; k++) genjreng(t + k * ket / 2, kuasa[k], ket / 2, 0, { kuat: 0.9, redam: 0.94, terang: 0.25 });
        t += 4 * ket;
        /* birama 4: melodi pentatonik E minor */
        var lagu = [[64, 0.5], [62, 0.5], [59, 0.5], [57, 0.5], [55, 0.5], [57, 0.5], [59, 1]];
        lagu.forEach(function (n) { petik(t, n[0], n[1] * ket + 0.25, { kuat: 1, redam: 0.997, terang: 0.6 }); t += n[1] * ket; });
        var maks = 0; for (k = 0; k < panjang; k++) maks = Math.max(maks, Math.abs(buf[k]));
        var b = ctx.createBuffer(1, panjang, sr), d = b.getChannelData(0);
        for (k = 0; k < panjang; k++) d[k] = buf[k] / maks * 0.45;
        return b;
    }

    /* ================= preset ================= */
    function pr(nama, blok) { return { nama: nama, blok: blok }; }
    var PRESET = [
        pr('Clean jernih', { gate: { ambang: -70 }, amp: { model: 'bersih', gain: 3, treble: 6, kab: '2x12' }, reverb: { jenis: 'aula', campur: 22 } }),
        pr('Clean + echo', { gate: { ambang: -70 }, amp: { model: 'bersih', gain: 3.5, treble: 6, kab: '2x12' }, delay: { waktu: 420, umpan: 40, campur: 30 }, reverb: { jenis: 'aula', decay: 3.5, campur: 32 } }),
        pr('Blues crunch', { gate: {}, od: { drive: 3, tone: 5, level: 6 }, amp: { model: 'crunch', gain: 4, mid: 6 }, reverb: { jenis: 'ruang', decay: 1.2, campur: 20 } }),
        pr('Rock klasik', { gate: {}, boost: { level: 6 }, amp: { model: 'crunch', gain: 7, mid: 6, treble: 6, kab: '4x12' }, reverb: { jenis: 'ruang', decay: 1, campur: 15 } }),
        pr('Lead solo', { gate: {}, od: { drive: 2, tone: 6, level: 8 }, amp: { model: 'lead', gain: 6, mid: 6 }, delay: { waktu: 380, umpan: 30, campur: 25 }, reverb: { jenis: 'aula', campur: 20 } }),
        pr('Metal modern', { gate: { ambang: -55, lepas: 60 }, od: { drive: 1, tone: 6, level: 8 }, amp: { model: 'higain', gain: 7, bass: 6, mid: 4, treble: 6, presence: 6, kab: '4x12' } }),
        pr('Distorsi grunge', { gate: { ambang: -58 }, dist: { gain: 7, tone: 4, level: 5 }, amp: { model: 'crunch', gain: 3, kab: '4x12' }, reverb: { jenis: 'ruang', campur: 12 } }),
        pr('Fuzz 60-an', { gate: { ambang: -60 }, fuzz: { fuzz: 7, tone: 5 }, amp: { model: 'bersih', gain: 4, kab: '1x12' }, reverb: { jenis: 'pegas', decay: 2, campur: 22 } }),
        pr('Surf spring', { gate: { ambang: -70 }, amp: { model: 'bersih', gain: 4, treble: 7, kab: '1x12' }, reverb: { jenis: 'pegas', decay: 3, campur: 45 } }),
        pr('DI bersih (tanpa efek)', { amp: { model: 'bersih', gain: 0, kab: 'tanpa' } }),
        pr('Clean chorus 80-an', { gate: { ambang: -70 }, komp: { sustain: 4 }, amp: { model: 'bersih', gain: 3, treble: 6 }, chorus: { laju: 0.8, dalam: 6, campur: 55 }, delay: { waktu: 380, umpan: 25, campur: 20 }, reverb: { jenis: 'aula', campur: 25 } }),
        pr('Funk auto-wah', { gate: { ambang: -66 }, komp: { sustain: 6, level: -6 }, autowah: { peka: 6 }, amp: { model: 'bersih', gain: 3, master: 3 }, reverb: { jenis: 'ruang', decay: 1, campur: 12 } }),
        pr('Wah solo', { gate: {}, wah: { pedal: 6 }, od: { drive: 4, level: 6 }, amp: { model: 'lead', gain: 5 }, delay: { waktu: 380, umpan: 30, campur: 22 }, reverb: { jenis: 'aula', campur: 18 } }),
        pr('Psikedelik phaser', { gate: { ambang: -60 }, fuzz: { fuzz: 6, tone: 5 }, amp: { model: 'crunch', gain: 3, kab: '2x12' }, phaser: { laju: 0.4, dalam: 8, umpan: 50 }, reverb: { jenis: 'aula', campur: 25 } }),
        pr('Organ berputar', { gate: {}, amp: { model: 'crunch', gain: 3 }, rotary: { cepat: '0', dalam: 7 }, reverb: { jenis: 'ruang', campur: 15 } }),
        pr('Tremolo surf', { gate: { ambang: -70 }, amp: { model: 'bersih', gain: 4, treble: 7, kab: '1x12' }, tremolo: { laju: 6, dalam: 60 }, reverb: { jenis: 'pegas', decay: 2.5, campur: 40 } }),
        pr('Jet flanger', { gate: { ambang: -58 }, dist: { gain: 5 }, amp: { model: 'crunch', gain: 4, kab: '4x12' }, flanger: { laju: 0.2, dalam: 7, umpan: 60 } }),
        pr('Vibrato vintage', { gate: { ambang: -70 }, amp: { model: 'bersih', gain: 4 }, vibrato: { laju: 5.5, dalam: 4 }, reverb: { jenis: 'pegas', campur: 25 } })
    ];
    function paramAwal(k) { var p = {}; BLOK[k].param.forEach(function (x) { p[x.k] = x.def; }); return p; }
    function dariPreset(prs) {
        var blok = {};
        URUT.forEach(function (k) {
            var ub = prs.blok[k], p = paramAwal(k);
            if (ub) Object.keys(ub).forEach(function (n) { p[n] = ub[n]; });
            blok[k] = { on: !!ub, p: p };
        });
        return { urutan: lengkapiUrutan(prs.urutan || URUT), blok: blok };
    }

    /* ================= keadaan & penyimpanan ================= */
    var KUNCI = 'ayri-efek', KUNCI_PRESET = 'ayri-efek-preset', KUNCI_HP = 'ayri-efek-headphone';
    function baca(k, def) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? def : v; } catch (e) { return def; } }
    function tulis(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    /* lengkapi dari bawaan supaya preset & pengaturan lama tetap jalan bila blok/param bertambah */
    function lengkapi(src) {
        var blok = {};
        URUT.forEach(function (k) {
            var b = (src.blok && src.blok[k]) || { on: false, p: {} }, p = paramAwal(k);
            Object.keys(p).forEach(function (n) { if (b.p && b.p[n] !== undefined) p[n] = b.p[n]; });
            blok[k] = { on: !!b.on, p: p };
        });
        return { urutan: lengkapiUrutan(src.urutan), blok: blok };
    }
    var S = (function () {
        var awal = dariPreset(PRESET[2]), s = baca(KUNCI, null);
        awal.ing = 0; awal.vol = 7; awal.kanal = 'campur'; awal.perangkat = ''; awal.preset = 'b2';
        if (!s || !s.blok) return awal;
        var l = lengkapi(s); awal.blok = l.blok; awal.urutan = l.urutan;
        ['ing', 'vol', 'kanal', 'perangkat', 'preset'].forEach(function (k) { if (s[k] !== undefined) awal[k] = s[k]; });
        return awal;
    })();
    var milikku = baca(KUNCI_PRESET, []);
    var tSimpan = 0;
    function simpan() { clearTimeout(tSimpan); tSimpan = setTimeout(function () { tulis(KUNCI, S); }, 400); }

    /* ================= audio: mulai, input gitar, suara contoh ================= */
    var ctx = null, graf = null, siap = null, aliran = null, sumberGitar = null, pisah = null, kanal = [], sumberContoh = null, bufContoh = null;
    var sambungLagi = false, labelDefault = '', tSinyal = 0, sepi = false;
    var SEPI = 'Belum ada suara dari input. Cek: kabel tercolok ke colokan mikrofon (bukan headphone), input yang dipilih benar, volume gitar tidak nol, dan di Windows (Pengaturan > Sistem > Suara > Input) mikrofon tidak dibisukan dan levelnya cukup. Lihat Info, bagian "Tanpa audio interface".';
    function siapkan() {
        if (siap) return siap;
        try { ctx = new AC({ latencyHint: 0 }); } catch (e) { ctx = new AC({ latencyHint: 'interactive' }); }
        if (ctx.state === 'suspended') ctx.resume();
        var modul = ctx.audioWorklet && ctx.audioWorklet.addModule ? ctx.audioWorklet.addModule('efek-worklet.js').then(function () { ctx.ayriSiap = true; }, function () {}) : Promise.resolve();
        siap = modul.then(function () {
            graf = Graf(ctx);
            pisah = ctx.createChannelSplitter(2);
            kanal = [gn(ctx, 1), gn(ctx, 1)];
            pisah.connect(kanal[0], 0); pisah.connect(kanal[1], 1);
            kanal[0].connect(graf.mono); kanal[1].connect(graf.mono);
            aturKanal();
            graf.sambung(S.urutan); graf.terapkan(S);
            /* perekam di ujung rantai (sesudah pembatas), ditarik lewat gain nol supaya tetap diproses */
            var rn = wnode(ctx, 'ayri-rekam', true);
            if (rn) { var nol = gn(ctx, 0); graf.batas.connect(rn); rn.connect(nol); nol.connect(ctx.destination); rn.port.onmessage = function (e) { potongan.push(e.data); }; rekamNode = rn; }
            window.__efek.ctx = ctx; window.__efek.graf = graf;
            meter();
            return ctx;
        });
        return siap;
    }
    function aturKanal() {
        if (!kanal.length) return;
        halus(ctx, kanal[0].gain, S.kanal === 'kanan' ? 0 : 1);
        halus(ctx, kanal[1].gain, S.kanal === 'kiri' ? 0 : 1);
    }
    /* perkiraan jeda: buffer browser + keluaran + masukan (bila dilaporkan) */
    function tampilJeda() {
        if (!ctx) return;
        var tr = aliran && aliran.getAudioTracks()[0], st = tr && tr.getSettings ? tr.getSettings() : {};
        var ms = ((ctx.baseLatency || 0) + (ctx.outputLatency || 0) + (st.latency || 0)) * 1000;
        $('#ef-jeda').textContent = ms > 0 ? 'Perkiraan jeda suara: ' + Math.round(ms) + ' ms' + (ms > 30 ? ' (terasa telat; lihat Info untuk tips)' : '') : '';
    }
    function labelBawaan(ds) { var d = ds.filter(function (x) { return x.kind === 'audioinput' && x.deviceId === 'default'; })[0]; return d ? d.label : ''; }
    function isiPerangkat() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return Promise.resolve([]);
        return navigator.mediaDevices.enumerateDevices().then(function (ds) {
            var masuk = ds.filter(function (d) { return d.kind === 'audioinput'; }), sel = $('#ef-dev');
            sel.innerHTML = '<option value="">Input bawaan</option>' + masuk.filter(function (d) { return d.deviceId && d.deviceId !== 'default'; }).map(function (d, i) {
                return '<option value="' + d.deviceId.replace(/"/g, '') + '">' + (d.label || 'Input ' + (i + 1)).replace(/[<>&]/g, '') + '</option>';
            }).join('');
            sel.value = S.perangkat; if (sel.value !== S.perangkat) sel.value = '';
            return ds;
        });
    }
    function hentikanGitar() {
        if (aliran) aliran.getTracks().forEach(function (t) { t.stop(); });
        if (sumberGitar) sumberGitar.disconnect();
        aliran = null; sumberGitar = null;
        $('#ef-mulai').textContent = 'Nyalakan gitar'; $('#ef-mulai').classList.remove('on'); $('#ef-mulai').setAttribute('aria-pressed', 'false');
        $('#ef-jeda').textContent = '';
    }
    function mulaiGitar() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { kabar('Browser ini tidak memberi akses input audio. Buka lewat https dengan Chrome, Edge, Firefox, atau Safari.', true); return; }
        kabar('Meminta izin memakai input audio…');
        siapkan().then(function () {
            var c = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 }, latency: { ideal: 0 } };
            if (S.perangkat) c.deviceId = { exact: S.perangkat };
            return navigator.mediaDevices.getUserMedia({ audio: c });
        }).then(function (st) {
            hentikanGitar();
            aliran = st; sumberGitar = ctx.createMediaStreamSource(st); sumberGitar.connect(pisah);
            sambungLagi = false; tSinyal = performance.now(); sepi = false;
            /* kabel dicabut / perangkat dilepas: aliran berakhir; sambung lagi otomatis saat perangkat muncul */
            st.getAudioTracks().forEach(function (t) {
                t.addEventListener('ended', function () {
                    if (aliran !== st) return;
                    hentikanGitar(); sambungLagi = true;
                    kabar('Input audio terputus (kabel dicabut atau perangkat berganti). Colok lagi; halaman akan mencoba menyambung otomatis, atau tekan Nyalakan gitar.', true);
                });
            });
            if (ctx.state === 'suspended') ctx.resume();
            $('#ef-mulai').textContent = 'Matikan gitar'; $('#ef-mulai').classList.add('on'); $('#ef-mulai').setAttribute('aria-pressed', 'true');
            var tr = st.getAudioTracks()[0];
            kabar('Gitar menyala' + (tr && tr.label ? ' (' + tr.label + ')' : '') + '. Petik senar dan atur Gain input sampai meter masuk zona kuning.');
            isiPerangkat().then(function (ds) { labelDefault = labelBawaan(ds); }); tampilJeda(); setTimeout(tampilJeda, 1500);
        }).catch(function (e) {
            var n = e && e.name;
            kabar(n === 'NotAllowedError' ? 'Izin input audio ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser, lalu coba lagi.'
                : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'Input audio tidak ditemukan. Sambungkan audio interface (atau pilih input lain), lalu coba lagi.'
                : 'Input audio tidak bisa dibuka: ' + (e && e.message || e), true);
            if (n === 'OverconstrainedError') { S.perangkat = ''; simpan(); }
        });
    }
    function contoh(on) {
        siapkan().then(function () {
            if (sumberContoh) { try { sumberContoh.stop(); } catch (e) {} sumberContoh.disconnect(); sumberContoh = null; }
            if (on) {
                if (!bufContoh) bufContoh = suaraContoh(ctx);
                sumberContoh = ctx.createBufferSource(); sumberContoh.buffer = bufContoh; sumberContoh.loop = true;
                sumberContoh.connect(graf.mono); sumberContoh.start();
                if (ctx.state === 'suspended') ctx.resume();
            }
            $('#ef-contoh').setAttribute('aria-pressed', on);
            $('#ef-contoh').textContent = on ? '■ Hentikan contoh' : '▶ Contoh suara';
            if (on) kabar('Memutar gitar contoh (suara sintetis) lewat rantai efek. Coba ganti preset atau kenop.');
        });
    }

    /* ================= rekam (hasil olahan, sesudah pembatas) & unduh WAV ================= */
    var rekamNode = null, potongan = [], rekamMulai = 0, tRekam = 0, urlRekam = '', MAKS_REKAM = 600;
    function wav(kanal, sr) {
        var n = kanal[0].length, c = kanal.length, buf = new ArrayBuffer(44 + n * c * 2), v = new DataView(buf), o = 44, i, k2;
        function s(of, t) { for (var q = 0; q < t.length; q++) v.setUint8(of + q, t.charCodeAt(q)); }
        s(0, 'RIFF'); v.setUint32(4, 36 + n * c * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, c, true);
        v.setUint32(24, sr, true); v.setUint32(28, sr * c * 2, true); v.setUint16(32, c * 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * c * 2, true);
        for (i = 0; i < n; i++) for (k2 = 0; k2 < c; k2++) { var x = Math.max(-1, Math.min(1, kanal[k2][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); o += 2; }
        return new Blob([buf], { type: 'audio/wav' });
    }
    function jam(dtk) { dtk = Math.floor(dtk); return Math.floor(dtk / 60) + ':' + ('0' + dtk % 60).slice(-2); }
    function buangRekaman() {
        if (urlRekam) URL.revokeObjectURL(urlRekam); urlRekam = '';
        $('#ef-hasil').hidden = true; $('#ef-hasil').removeAttribute('src'); $('#ef-unduh').hidden = true; $('#ef-buang').hidden = true; $('#ef-waktu').textContent = '';
    }
    function mulaiRekam() {
        siapkan().then(function () {
            if (!rekamNode) { kabar('Browser ini belum bisa merekam dari halaman ini. Pakai Chrome, Edge, atau Firefox terbaru.', true); return; }
            buangRekaman(); potongan = []; rekamMulai = performance.now();
            rekamNode.port.postMessage({ rekam: true });
            $('#ef-rekam').setAttribute('aria-pressed', 'true'); $('#ef-rekam').lastChild.textContent = ' Stop';
            clearInterval(tRekam);
            tRekam = setInterval(function () {
                var d = (performance.now() - rekamMulai) / 1000; $('#ef-waktu').textContent = jam(d);
                if (d >= MAKS_REKAM) selesaiRekam();
            }, 250);
            if (!aliran && !sumberContoh) kabar('Merekam. Nyalakan gitar atau putar Contoh suara supaya ada yang terekam.');
        });
    }
    function selesaiRekam() {
        clearInterval(tRekam);
        if (!rekamNode) return;
        rekamNode.port.postMessage({ rekam: false });
        $('#ef-rekam').setAttribute('aria-pressed', 'false'); $('#ef-rekam').lastChild.textContent = ' Rekam';
        /* tunggu potongan terakhir dari jalur audio */
        setTimeout(function () {
            var n = potongan.reduce(function (a, p) { return a + p[0].length; }, 0);
            if (!n) { $('#ef-waktu').textContent = ''; return; }
            var kanal = [new Float32Array(n), new Float32Array(n)], o = 0;
            potongan.forEach(function (p) { kanal[0].set(p[0], o); kanal[1].set(p[1], o); o += p[0].length; });
            potongan = [];
            urlRekam = URL.createObjectURL(wav(kanal, ctx.sampleRate));
            var t = new Date(), nama = 'ayri-gitar-' + t.getFullYear() + ('0' + (t.getMonth() + 1)).slice(-2) + ('0' + t.getDate()).slice(-2) + '-' + ('0' + t.getHours()).slice(-2) + ('0' + t.getMinutes()).slice(-2) + '.wav';
            $('#ef-hasil').src = urlRekam; $('#ef-hasil').hidden = false;
            $('#ef-unduh').href = urlRekam; $('#ef-unduh').setAttribute('download', nama); $('#ef-unduh').hidden = false; $('#ef-buang').hidden = false;
            $('#ef-waktu').textContent = jam(n / ctx.sampleRate);
            window.__efek.rekaman = { detik: n / ctx.sampleRate, nama: nama };
        }, 300);
    }
    $('#ef-rekam').addEventListener('click', function () { if (this.getAttribute('aria-pressed') === 'true') selesaiRekam(); else mulaiRekam(); });
    $('#ef-buang').addEventListener('click', buangRekaman);

    /* meter level masuk & keluar */
    var tClip = 0;
    function puncak(an) { var d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); var m = 0; for (var i = 0; i < d.length; i++) { var v = Math.abs(d[i]); if (v > m) m = v; } return m; }
    function dbTeks(p) { return p > 0.00001 ? Math.round(20 * Math.log10(p)) + ' dB' : '\u2212\u221e'; }
    function lebarMeter(p) { return Math.max(0, Math.min(1, (20 * Math.log10(p + 1e-9) + 60) / 60)); }
    function meter() {
        if (!graf) return;
        var pi = puncak(graf.inMeter), po = puncak(graf.outMeter);
        $('#ef-in').style.transform = 'scaleX(' + (1 - lebarMeter(pi)) + ')';
        $('#ef-out').style.transform = 'scaleX(' + (1 - lebarMeter(po)) + ')';
        var kini = performance.now();
        if (pi >= 0.99) tClip = kini;
        $('#ef-clip').classList.toggle('on', kini - tClip < 1200);
        $('#ef-in-db').textContent = dbTeks(pi); $('#ef-out-db').textContent = dbTeks(po);
        if (aliran) {
            if (pi > 0.0008) { tSinyal = kini; if (sepi) { sepi = false; kabar('Sinyal gitar masuk. Atur Gain input sampai meter IN masuk zona kuning.'); } }
            else if (!sepi && kini - tSinyal > 5000) { sepi = true; kabar(SEPI, true); }
        }
        window.__efek.puncak = [pi, po];
        requestAnimationFrame(meter);
    }

    /* ================= tampilan ================= */
    var pilih = 'amp', papan = $('#ef-blok'), rantai = $('#ef-rantai');
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function fmt(p, v) { return angka(v, p.step >= 1 ? 0 : 1) + p.sat; }
    function htmlParam(k, p, v) {
        if (p.pilihan) return '<label class="ef-p ef-pil"><span>' + p.label + '</span><select class="sel" data-b="' + k + '" data-p="' + p.k + '">' +
            p.pilihan.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
        return '<label class="ef-p"><span>' + p.label + '</span><output>' + fmt(p, v) + '</output><input type="range" class="rg" data-b="' + k + '" data-p="' + p.k + '" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '" value="' + v + '" aria-label="' + esc(BLOK[k].nama + ' ' + p.label) + '"></label>';
    }
    function gambar() {
        papan.innerHTML = S.urutan.map(function (k, i) {
            var B = BLOK[k], b = S.blok[k];
            return '<article class="ef-kartu w-' + B.warna + (b.on ? ' on' : '') + (B.lebar ? ' lebar' : '') + (k === pilih ? ' aktif' : '') + '" data-blok="' + k + '">' +
                '<header class="ef-kk" draggable="true" title="Seret untuk mengubah urutan"><button type="button" class="ef-led" data-nyala="' + k + '" aria-pressed="' + b.on + '" title="Nyalakan / matikan" aria-label="' + (b.on ? 'Matikan ' : 'Nyalakan ') + B.nama + '"></button>' +
                '<b>' + B.nama + '</b><span class="ef-geser"><button type="button" data-geser="-1" aria-label="Pindah lebih awal"' + (i ? '' : ' disabled') + '>&lsaquo;</button><button type="button" data-geser="1" aria-label="Pindah lebih akhir"' + (i < S.urutan.length - 1 ? '' : ' disabled') + '>&rsaquo;</button></span></header>' +
                '<div class="ef-isi">' + B.param.map(function (p) { return htmlParam(k, p, b.p[p.k]); }).join('') + '</div>' +
                (B.catatan ? '<p class="ef-cat">' + B.catatan + '</p>' : '') + '</article>';
        }).join('');
        rantai.innerHTML = S.urutan.map(function (k) {
            var B = BLOK[k], b = S.blok[k];
            return '<span class="ef-c w-' + B.warna + (b.on ? ' on' : '') + '"><button type="button" class="ef-cl" data-nyala="' + k + '" aria-pressed="' + b.on + '" aria-label="' + (b.on ? 'Matikan ' : 'Nyalakan ') + B.nama + '"></button>' +
                '<button type="button" class="ef-cn" data-pilih="' + k + '" aria-pressed="' + (k === pilih) + '">' + (k === 'amp' ? AMP[b.p.model].nama.split(' ')[0] : B.nama.replace('Noise gate', 'Gate')) + '</button></span>';
        }).join('');
    }
    function tandaiPreset(diubah) {
        var sel = $('#ef-preset');
        if (diubah) { S.preset = ''; sel.value = ''; }
        $('#ef-hapus').disabled = !/^m/.test(S.preset);
    }
    function isiPreset() {
        $('#ef-preset').innerHTML = '<option value="">Pengaturan sendiri</option>' +
            '<optgroup label="Bawaan">' + PRESET.map(function (p, i) { return '<option value="b' + i + '">' + esc(p.nama) + '</option>'; }).join('') + '</optgroup>' +
            (milikku.length ? '<optgroup label="Punya saya">' + milikku.map(function (p, i) { return '<option value="m' + i + '">' + esc(p.nama) + '</option>'; }).join('') + '</optgroup>' : '');
        $('#ef-preset').value = S.preset || '';
        tandaiPreset(false);
    }
    function terapkanSemua() { if (graf) { graf.sambung(S.urutan); graf.terapkan(S); } }
    function pakaiPreset(v) {
        var src = v.charAt(0) === 'b' ? dariPreset(PRESET[+v.slice(1)]) : milikku[+v.slice(1)] && lengkapi(JSON.parse(JSON.stringify(milikku[+v.slice(1)].data)));
        if (!src) return;
        S.urutan = src.urutan; S.blok = src.blok; S.preset = v;
        if (!S.blok[pilih] || !S.blok[pilih].on) pilih = 'amp';
        gambar(); terapkanSemua(); simpan(); tandaiPreset(false);
    }
    /* urutan diubah: suara diredam sebentar supaya tidak "klik" saat kabel virtual dipindah */
    function pindah(k, ke) {
        var i = S.urutan.indexOf(k), j = ke; if (j < 0 || j >= S.urutan.length || i === j) return;
        S.urutan.splice(i, 1); S.urutan.splice(j, 0, k);
        if (graf) {
            halus(ctx, graf.vol.gain, 0);
            setTimeout(function () { graf.sambung(S.urutan); halus(ctx, graf.vol.gain, db((S.vol - 7) * 3)); }, 40);
        }
        gambar(); simpan(); tandaiPreset(true);
    }

    papan.addEventListener('input', function (e) {
        var el = e.target; if (!el.dataset.p) return;
        var k = el.dataset.b, p = BLOK[k].param.filter(function (x) { return x.k === el.dataset.p; })[0];
        var v = p.pilihan ? el.value : +el.value;
        S.blok[k].p[p.k] = v;
        if (!p.pilihan) el.previousElementSibling.textContent = fmt(p, v);
        if (graf) graf.terapkan(S, k, p.k);
        if (k === 'amp' && p.k === 'model') gambar();
        simpan(); tandaiPreset(true);
    });
    document.addEventListener('click', function (e) {
        var n = e.target.closest('[data-nyala]');
        if (n) {
            var k = n.dataset.nyala; S.blok[k].on = !S.blok[k].on;
            if (graf) graf.blok[k].nyala(S.blok[k].on);
            if (S.blok[k].on) pilih = k;
            gambar(); simpan(); tandaiPreset(true); return;
        }
        var c = e.target.closest('[data-pilih]');
        if (c) {
            pilih = c.dataset.pilih; gambar();
            /* layar lebar: semua kartu tampil, jadi chip berfungsi sebagai navigasi ke kartunya */
            if (window.matchMedia('(min-width: 900px) and (min-height: 520px)').matches) {
                var kt = papan.querySelector('[data-blok="' + pilih + '"]');
                if (kt) { kt.scrollIntoView({ block: 'center', behavior: 'smooth' }); kt.classList.add('sorot'); setTimeout(function () { kt.classList.remove('sorot'); }, 1200); }
            }
            return;
        }
        var g = e.target.closest('[data-geser]');
        if (g) { var kartu = g.closest('[data-blok]'), kb = kartu.dataset.blok; pilih = kb; pindah(kb, S.urutan.indexOf(kb) + +g.dataset.geser); }
    });
    /* seret kartu untuk mengubah urutan (komputer) */
    var diseret = null;
    papan.addEventListener('dragstart', function (e) {
        var k = e.target.closest && e.target.closest('[data-blok]'); if (!k) return;
        diseret = k.dataset.blok; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', diseret); } catch (er) {}
        k.classList.add('seret');
    });
    papan.addEventListener('dragover', function (e) { if (diseret) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
    papan.addEventListener('drop', function (e) {
        var t = e.target.closest('[data-blok]'); if (!diseret || !t) return;
        e.preventDefault();
        var r = t.getBoundingClientRect(), ke = S.urutan.indexOf(t.dataset.blok) + (e.clientX > r.left + r.width / 2 ? 1 : 0), dari = S.urutan.indexOf(diseret);
        if (dari < ke) ke--;
        pindah(diseret, ke);
    });
    papan.addEventListener('dragend', function () { diseret = null; $$('.ef-kartu.seret').forEach(function (x) { x.classList.remove('seret'); }); });

    $('#ef-preset').addEventListener('change', function () { if (this.value) pakaiPreset(this.value); this.blur(); });
    $('#ef-simpan').addEventListener('click', function () {
        var nama = (window.prompt('Nama preset:', '') || '').trim().slice(0, 40); if (!nama) return;
        var data = JSON.parse(JSON.stringify({ urutan: S.urutan, blok: S.blok })), ada = milikku.map(function (p) { return p.nama; }).indexOf(nama);
        if (ada > -1) milikku[ada].data = data; else milikku.push({ nama: nama, data: data });
        tulis(KUNCI_PRESET, milikku);
        S.preset = 'm' + (ada > -1 ? ada : milikku.length - 1); simpan(); isiPreset();
        kabar('Preset "' + nama + '" disimpan di perangkat ini.');
    });
    $('#ef-hapus').addEventListener('click', function () {
        if (!/^m/.test(S.preset)) return;
        var i = +S.preset.slice(1), p = milikku[i]; if (!p || !window.confirm('Hapus preset "' + p.nama + '"?')) return;
        milikku.splice(i, 1); tulis(KUNCI_PRESET, milikku); S.preset = ''; simpan(); isiPreset();
    });

    /* input, gain, volume */
    function aturSlider(id, k, fmtv) {
        var el = $(id), out = $(id + '-v');
        el.value = S[k]; out.textContent = fmtv(S[k]);
        el.addEventListener('input', function () {
            S[k] = +this.value; out.textContent = fmtv(S[k]); simpan();
            if (graf) { halus(ctx, graf.inGain.gain, db(S.ing)); halus(ctx, graf.vol.gain, db((S.vol - 7) * 3)); }
        });
    }
    aturSlider('#ef-ing', 'ing', function (v) { return (v > 0 ? '+' : '') + angka(v, 1) + ' dB'; });
    aturSlider('#ef-vol', 'vol', function (v) { return angka(v, 1); });
    $('#ef-kanal').value = S.kanal;
    $('#ef-kanal').addEventListener('change', function () { S.kanal = this.value; aturKanal(); simpan(); });
    $('#ef-dev').addEventListener('change', function () { S.perangkat = this.value; simpan(); if (aliran) mulaiGitar(); });

    /* sebelum gitar dinyalakan pertama kali: wajib headphone (speaker + mikrofon bisa berdengung keras) */
    $('#ef-mulai').addEventListener('click', function () {
        if (aliran) { hentikanGitar(); kabar('Gitar dimatikan.'); return; }
        if (!baca(KUNCI_HP, false)) { $('#dr-hp').hidden = false; return; }
        mulaiGitar();
    });
    $('#ef-hp-ok').addEventListener('click', function () { tulis(KUNCI_HP, true); $('#dr-hp').hidden = true; mulaiGitar(); });
    $('#ef-contoh').addEventListener('click', function () { contoh(this.getAttribute('aria-pressed') !== 'true'); });
    /* perangkat dicolok/dicabut: perbarui daftar; sambung lagi bila input tadi terputus atau input bawaan sistem berganti */
    var tPerangkat = 0;
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', function () {
        clearTimeout(tPerangkat);
        tPerangkat = setTimeout(function () {
            isiPerangkat().then(function (ds) {
                var ganti = aliran && !S.perangkat && labelDefault && labelBawaan(ds) !== labelDefault;
                if (sambungLagi || ganti) { kabar('Perangkat audio berubah, input dibuka ulang\u2026'); mulaiGitar(); }
            });
        }, 900);
    });

    window.__efek = { S: S, BLOK: BLOK, PRESET: PRESET, Graf: Graf, suaraContoh: suaraContoh, dariPreset: dariPreset, URUT: URUT, lengkapi: lengkapi };
    isiPreset(); gambar();
})();
