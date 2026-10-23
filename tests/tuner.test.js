'use strict';
/* Mesin deteksi nada tuner (bagian ENGINE di tuner.html): akurasi dan kecepatan reaksi pada petikan senar buatan. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'tuner.html'), 'utf8');
const kode = html.slice(html.indexOf('/* ENGINE-START */'), html.indexOf('/* ENGINE-END */'));
const mesin = new Function(kode + '; return { pitch: pitch, makeFilter: makeFilter, deteksi: deteksi, TICK_MS: TICK_MS };')();

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
