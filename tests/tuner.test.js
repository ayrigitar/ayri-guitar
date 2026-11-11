'use strict';
/* Mesin deteksi nada tuner (bagian ENGINE di tuner.html): akurasi dan kecepatan reaksi pada petikan senar buatan. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'tuner.html'), 'utf8');
const kode = html.slice(html.indexOf('/* ENGINE-START */'), html.indexOf('/* ENGINE-END */'));
const mesin = new Function(kode + '; return { pitch: pitch, makeFilter: makeFilter, deteksi: deteksi, TICK_MS: TICK_MS, cekHarmoni: cekHarmoni, HC: HC, makeLacak: makeLacak, makeBaca: makeBaca, makeGerbang: makeGerbang, JELAS_MIN: JELAS_MIN };')();

const SR = 48000;
/* petikan senar: diam 0,5 detik (penyangga 16384 sampel sudah penuh seperti di halaman), lalu nada berharmoni yang meluruh + derau serangan 15 ms */
function petik(hz, detik) {
    const n = Math.round(SR * detik), x = new Float32Array(n), mulai = Math.round(SR * 0.5);
    let acak = 12345;
    for (let i = mulai; i < n; i++) {
        const t = (i - mulai) / SR;
        let v = 0;
        for (let k = 1; k <= 8; k++) v += Math.sin(2 * Math.PI * hz * k * t + k) / k * Math.exp(-t * (1.5 + k * 0.6));
        if (t < 0.015) { acak = (acak * 1103515245 + 12345) & 0x7fffffff; v += (acak / 0x7fffffff - 0.5) * 0.8 * (1 - t / 0.015); }
        x[i] = v * 0.3;
    }
    return { x, mulai };
}
/* jalankan seperti di halaman: tiap TICK_MS ambil 16384 sampel terakhir, deteksi, saring */
function jalankan(hz) {
    const { x, mulai } = petik(hz, 1.9), filt = mesin.makeFilter();
    let pertama = null, akhir = null;
    for (let ms = 0; ms * SR / 1000 < x.length; ms += mesin.TICK_MS) {
        const ujung = Math.round(ms * SR / 1000);
        if (ujung < 16384) continue;
        const r = mesin.deteksi(x.subarray(ujung - 16384, ujung), SR, 0.002, null);
        const sm = filt.feed(r[0] > 0 && r[1] >= 0.6 ? r[0] : -1, ms);
        if (sm !== null) { akhir = sm; if (pertama === null) pertama = ms - mulai * 1000 / SR; }
    }
    return { pertama, sen: akhir === null ? null : akhir - 1200 * Math.log2(hz / 440) };
}

const SENAR = { E2: 82.41, A2: 110, D3: 146.83, G3: 196, B3: 246.94, E4: 329.63 };
for (const [nama, hz] of Object.entries(SENAR)) {
    test('tuner gitar ' + nama + ' (+13 sen): meleset < 1 sen dan jarum muncul < 200 ms setelah dipetik', () => {
        const h = jalankan(hz * Math.pow(2, 13 / 1200));
        assert.ok(h.sen !== null, 'nada tidak terdeteksi');
        assert.ok(Math.abs(h.sen) < 1, 'meleset ' + h.sen.toFixed(2) + ' sen');
        assert.ok(h.pertama < 200, 'jarum baru muncul ' + h.pertama + ' ms');
    });
}

test('nada bass rendah (E1 41 Hz) tetap akurat dengan jendela panjang', () => {
    const h = jalankan(41.2 * Math.pow(2, -8 / 1200));
    assert.ok(h.sen !== null && Math.abs(h.sen) < 1, 'meleset ' + h.sen);
});

/* ---- cek harmoni: bacaan satu oktaf / 3x terlalu rendah, atau satu oktaf terlalu tinggi, dibetulkan dari spektrumnya ---- */
function nada(hz, harmoni) {
    const x = new Float32Array(8192);
    for (let i = 0; i < x.length; i++) for (const k of harmoni) x[i] += Math.sin(2 * Math.PI * hz * k * i / SR + k) / k * 0.2;
    return x;
}
test('cek harmoni: bacaan 110 Hz untuk nada 220 Hz (tanpa harmoni ganjil) jadi 220 Hz', () => {
    const hz = mesin.cekHarmoni(nada(220, [1, 2, 3, 4]), SR, 110, 25, 1400, mesin.HC);
    assert.ok(Math.abs(hz - 220) < 0.01, 'hasil ' + hz);
});
test('cek harmoni: bacaan 110 Hz untuk senar 1 (E4 330 Hz) jadi 330 Hz', () => {
    const hz = mesin.cekHarmoni(nada(330, [1, 2, 3]), SR, 110, 25, 1400, mesin.HC);
    assert.ok(Math.abs(hz - 330) < 0.01, 'hasil ' + hz);
});
test('cek harmoni: bacaan 220 Hz untuk nada 110 Hz jadi 110 Hz, bacaan yang benar tidak diubah', () => {
    const x = nada(110, [1, 2, 3, 4, 5]);
    assert.ok(Math.abs(mesin.cekHarmoni(x, SR, 220, 25, 1400, mesin.HC) - 110) < 0.01);
    assert.equal(mesin.cekHarmoni(x, SR, 110, 25, 1400, mesin.HC), 110);
});
test('mengikuti nada: patokan baru ada setelah nada bertahan 90 ms, dan hilang 100 ms setelah tak terdengar', () => {
    const l = mesin.makeLacak();
    l.feed(330, 0); l.feed(331, 25); l.feed(330, 50);
    assert.equal(l.trk(50), null);
    l.feed(330, 100);
    assert.equal(l.trk(125).hz, 330);
    assert.equal(l.trk(201), null);
});

/* ---- pemilih senar (gitar standar, mode otomatis), satu bacaan tiap 25 ms ---- */
const GITAR = [40, 45, 50, 55, 59, 64];
const midiHz = (m, sen = 0) => 440 * Math.pow(2, (m - 69) / 12 + sen / 1200);
function pemilih() {
    const b = mesin.makeBaca();
    let t = 10000, h = null;
    return {
        dengar(hz, rms = 0, kali = 1) { for (let i = 0; i < kali; i++) { t += 25; if (rms) b.level(rms, t); const r = b.baca(hz, t, GITAR, null, 440); if (r) h = r; } },
        get senar() { return h ? h.idx : -1; },
        get sen() { return h ? h.cs : null; },
        geser(m, dari, ke) {   // pasak diputar: 10 sen per bacaan
            const tampil = [], step = ke > dari ? 10 : -10;
            for (let c = dari; step > 0 ? c <= ke : c >= ke; c += step) { this.dengar(midiHz(m, c)); tampil.push([c, this.senar]); }
            return tampil;
        }
    };
}
test('senar 1 yang meluruh lalu terbaca sebagai senar A (1/3 nadanya) tetap senar 1', () => {
    const p = pemilih();
    p.dengar(midiHz(64, -8), 0, 16);          // terdengar sendiri 0,4 detik
    p.dengar(midiHz(64, -8) / 3, 0, 120);     // 3 detik senar A ikut berdengung
    assert.equal(p.senar, 5);
    assert.ok(Math.abs(p.sen + 8) < 1, 'sen ' + p.sen);
});
test('senar A dipetik setelah senar 1: senar A yang tampil', () => {
    const p = pemilih();
    p.dengar(midiHz(64), 0.05, 6);
    p.dengar(midiHz(64), 0.01, 12);           // senar 1 meluruh
    p.dengar(midiHz(45, 2), 0.06, 18);        // senar A dipetik: mendadak lebih keras
    assert.equal(p.senar, 1);
});
test('senar 1 dipetik saat senar A masih berbunyi: senar 1 yang tampil', () => {
    const p = pemilih();
    p.dengar(midiHz(45), 0.01, 6);
    p.dengar(midiHz(45), 0.05, 2);
    p.dengar(midiHz(64), 0.05, 24);
    assert.equal(p.senar, 5);
});
test('menyetel senar A naik dari nada E rendah: E rendah tetap tampil sampai 100 sen dari A', () => {
    const p = pemilih();
    p.dengar(midiHz(40), 0, 4);
    const tampil = p.geser(45, -500, -20);
    assert.ok(tampil.filter(x => x[0] <= -120).every(x => x[1] === 0), JSON.stringify(tampil));
    const pertama = tampil.find(x => x[1] === 1)[0];
    assert.ok(pertama >= -100 && pertama <= -30, 'A tampil mulai ' + pertama + ' sen');
});
test('satu bacaan nyasar tidak menggeser jarum', () => {
    const p = pemilih();
    p.dengar(midiHz(45, -10), 0, 8);
    p.dengar(midiHz(45, 30));
    assert.ok(Math.abs(p.sen + 10) < 1e-6, 'sen ' + p.sen);
});

test('gerbang stabil: jarum menunggu beberapa bacaan yang sepakat, bacaan meleset menahannya, lalu lanjut lagi', () => {
    const g = mesin.makeGerbang(), hz = 110, sen = (c) => hz * Math.pow(2, c / 1200);
    assert.equal(mesin.JELAS_MIN, 0.8);
    const hasil = [0, 3, -2, 4, 1].map((c) => g.feed(sen(c), 25));
    assert.deepEqual(hasil, [false, false, false, false, true], 'lima bacaan (125 ms) dalam 20 sen');
    assert.equal(g.feed(sen(30), 25), false, 'satu bacaan 30 sen jauhnya: belum mantap');
    for (let i = 0; i < 4; i++) g.feed(sen(30), 25);
    assert.equal(g.feed(sen(31), 25), true, 'nada baru yang sudah stabil');
    assert.equal(g.feed(-1, 25), false, 'tanpa bacaan: mulai dari awal');
    assert.equal(g.feed(sen(0), 100), false);
    assert.equal(g.feed(sen(1), 100), true, 'HP lambat (tick 100 ms): cukup dua bacaan');
});

/* ---- suara acuan: dihitung sendiri, nadanya harus tepat (diukur dengan mesin deteksi yang sama) ---- */
const kodeSuara = html.slice(html.indexOf('/* SOUND-START */'), html.indexOf('/* SOUND-END */'));
const suara = new Function(kode + '\n' + kodeSuara + '; return { pitch: pitch, bufSuara: bufSuara };')();
for (const [jenis, hz] of [['ak', 82.41], ['ak', 220], ['g12', 392], ['g12', 164.81], ['uk', 440], ['gl', 110], ['b4', 41.2], ['md', 659.26], ['ce', 65.41], ['vl', 659.26], ['pn', 110], ['pn', 261.63]]) {
    for (const sr of [44100, 48000]) {
        test('suara acuan ' + jenis + ' ' + hz + ' Hz (' + sr + '): nadanya tepat dalam 3 sen', () => {
            const x = suara.bufSuara(jenis, hz, sr), mulai = Math.round(sr * 0.25), w = x.subarray(mulai, mulai + 16384);
            assert.ok(Math.max(...x.subarray(0, 4000).map(Math.abs)) > 0.01, 'tidak ada suara');
            const r = suara.pitch(w, sr, 0.002, null);
            assert.ok(r[0] > 0, 'nada tidak terbaca');
            const sen = 1200 * Math.log2(r[0] / hz);
            assert.ok(Math.abs(sen) < 3, 'meleset ' + sen.toFixed(2) + ' sen');
        });
    }
}

/* ---- gitar 12 senar: senar utama dan senar oktaf sama-sama jadi sasaran ---- */
const G12 = [40, 52, 45, 57, 50, 62, 55, 67, 59, 64];
function pemilih12() {
    const b = mesin.makeBaca();
    let t = 10000, h = null;
    return {
        dengar(hz, rms = 0, kali = 1) { for (let i = 0; i < kali; i++) { t += 25; if (rms) b.level(rms, t); const r = b.baca(hz, t, G12, null, 440); if (r) h = r; } },
        get midi() { return h ? G12[h.idx] : -1; },
        get sen() { return h ? h.cs : null; }
    };
}
test('gitar 12 senar: senar oktaf (A3) dipetik setelah senar utama (A2): senar oktaf yang tampil', () => {
    const p = pemilih12();
    p.dengar(midiHz(45), 0.05, 6);
    p.dengar(midiHz(45), 0.01, 12);
    p.dengar(midiHz(57, 3), 0.06, 20);
    assert.equal(p.midi, 57);
    assert.ok(Math.abs(p.sen - 3) < 1.5, 'sen ' + p.sen);
});
test('gitar 12 senar: senar utama (A2) dipetik setelah senar oktaf (A3): senar utama yang tampil', () => {
    const p = pemilih12();
    p.dengar(midiHz(57), 0.05, 6);
    p.dengar(midiHz(57), 0.01, 12);
    p.dengar(midiHz(45, -3), 0.06, 20);
    assert.equal(p.midi, 45);
});
test('gitar 12 senar: senar A2 disetel sementara oktafnya ikut berdengung: tetap senar A2', () => {
    const p = pemilih12();
    p.dengar(midiHz(45, -8), 0, 16);
    p.dengar(midiHz(45, -8) * 2, 0, 60);
    assert.equal(p.midi, 45);
    assert.ok(Math.abs(p.sen + 8) < 1.5, 'sen ' + p.sen);
});
test('gitar 12 senar: dua senar kembar (B3, E4) dan sepuluh sasaran sudah terdaftar di halaman', () => {
    assert.ok(/g12:\['Gitar 12 senar'/.test(html));
    assert.ok(html.includes('[40,52,45,57,50,62,55,67,59,64]'));
});
