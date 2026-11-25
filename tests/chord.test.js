'use strict';
/* Mesin chord (chord-engine.js, dipakai halaman Chord/Partitur/Transkrip) dan pembaca chart teks di transkrip.html. */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const { baca } = require('./helper');

function mesin() {
    const sb = { console }; vm.createContext(sb);
    vm.runInContext(baca('chord-engine.js') + '\nthis.__ex = { voicings, INSTS, TYPES, NM };', sb, { filename: 'chord-engine.js' });
    return sb.__ex;
}
function pembacaChart() {
    const html = baca('transkrip.html').replace(/\r\n/g, '\n'), a = html.indexOf('var CH_MARK'), b = html.indexOf('/* judul lagu untuk pencarian chart');
    assert.ok(a > 0 && b > a, 'penanda kode pembaca chart di transkrip.html tidak ditemukan; perbarui uji ini bila bagian itu dipindah');
    const sb = { console }; vm.createContext(sb);
    vm.runInContext(baca('chord-engine.js') + '\n' + html.slice(a, b) + '\nthis.__ex = { chordFromToken, parseChart, NM, TYPES };', sb, { filename: 'transkrip.html' });
    return sb.__ex;
}

test('mesin chord: setiap chord punya bentuk jari di gitar, gitar 12 senar, dan bass; ukulele hanya dua pengecualian', () => {
    const { voicings, INSTS, TYPES, NM } = mesin(), kosong = [];
    for (const k of ['gtr', 'uke', 'gll', 'bas']) for (let r = 0; r < 12; r++) for (let ti = 0; ti < TYPES.length; ti++) if (!voicings(r, ti, INSTS[k]).length) kosong.push(k + ':' + NM[r] + ':' + TYPES[ti].k);
    assert.deepEqual(kosong.filter((x) => !x.startsWith('uke:')), []);
    assert.ok(kosong.length <= 4, 'chord tanpa bentuk: ' + kosong.join(' '));
});

test('mesin chord: mencari bentuk jari cepat (tidak membuat halaman macet)', () => {
    const { voicings, INSTS, TYPES } = mesin();
    let terlama = 0;
    for (let r = 0; r < 12; r++) for (let ti = 0; ti < TYPES.length; ti++) {
        const t0 = process.hrtime.bigint(); voicings(r, ti, INSTS.gtr); terlama = Math.max(terlama, Number(process.hrtime.bigint() - t0) / 1e6);
    }
    assert.ok(terlama < 150, 'chord terlama ' + terlama.toFixed(1) + ' ms');
});

test('pembaca chart: nama chord umum dibaca benar, bukan-chord ditolak', () => {
    const { chordFromToken, NM, TYPES } = pembacaChart();
    const nama = (c) => (c ? NM[c.r] + ':' + TYPES[c.ti].k + (c.bass >= 0 ? '/' + NM[c.bass] : '') : null);
    const kasus = [['C', 'C:maj'], ['Cm', 'C:m'], ['Bb', 'Bb:maj'], ['Bbm7', 'Bb:m7'], ['F#m', 'F#:m'], ['F♯m', 'F#:m'], ['E♭', 'Eb:maj'], ['G/B', 'G:maj/B'], ['Dsus4', 'D:sus4'],
        ['A7', 'A:7'], ['Cmaj7', 'C:maj7'], ['Cadd9', 'C:add9'], ['Am7/G', 'A:m7/G'], ['Bdim', 'B:dim'], ['Bm7b5', 'B:m7b5'], ['E7#9', 'E:7#9'], ['Gaug', 'G:aug'],
        ['Em7', 'E:m7'], ['Asus', 'A:sus4'], ['B', 'B:maj'], ['Fm6', 'F:m6'], ['C69', 'C:69'], ['Am(add9)', 'A:madd9'], ['Dsus2', 'D:sus2'], ['E7sus4', 'E:7sus4'], ['Bm7(11)', 'B:m11'], ['Bm11', 'B:m11'], ['Am7add11', 'A:m11'], ['B7(-13)', 'B:7b13'], ['B7(b13)', 'B:7b13'], ['B7b13', 'B:7b13'],
        ['Cmaj7#11', 'C:maj7#11'], ['G7#11', 'G:7#11'], ['Dmaj13', 'D:maj13'], ['Am13', 'A:m13'], ['C13sus4', 'C:13sus4'], ['Cmaj7#5', 'C:maj7#5'], ['Bm9b5', 'B:m9b5'], ['Am69', 'A:m69'], ['Cadd11', 'C:add11'], ['Cadd4', 'C:add11']];
    for (const [tok, harap] of kasus) assert.equal(nama(chordFromToken(tok)), harap, tok);
    for (const bukan of ['H', 'Hello', 'Bus', 'Gss', 'Cuu', 'Asus44x']) assert.equal(chordFromToken(bukan), null, '"' + bukan + '" bukan chord');
});

test('pembaca chart: baris chord + lirik, kapo, dan pengulangan', () => {
    const { parseChart, NM, TYPES } = pembacaChart();
    const nama = (c) => NM[c.r] + ':' + TYPES[c.ti].k;
    const it = parseChart('Intro: D Bm G A 4x\n  F#m   G   Bm   C\nDi dalam hari-harimu bersama lagi\n[Reff]\nD  A/C#  Bm  G\nCapo 2\nN.C.  x2');
    assert.equal(it.capo, 2);
    assert.deepEqual(Array.from(it.slice(0, 6), nama), ['D:maj', 'B:m', 'G:maj', 'A:maj', 'D:maj', 'B:m']);
    assert.equal(it.length, 24, '4x pada intro diurai menjadi 4 putaran');
    assert.equal(parseChart('Do Re Mi').length, 0, 'baris lirik biasa tidak dianggap chord');
    assert.equal(parseChart('Am I Am').length, 0);
});

/* Bentuk jari di Transkrip: sama dengan aplikasi Studio Tools (VoicingPicker). Gm/Gm7 barre; Bb memilih bentuk A atau E menurut chord tetangga. */
function pemilih() {
    const sb = { console }; vm.createContext(sb);
    vm.runInContext(baca('chord-engine.js') + '\nthis.__ex = { rencanaBentuk, voicings, INSTS, tIdx };', sb, { filename: 'chord-engine.js' });
    return sb.__ex;
}
test('transkrip: Gm, Gm7, Fm, F#m memakai bentuk barre; Em, Am, Dm tetap terbuka', () => {
    const { rencanaBentuk, INSTS, tIdx } = pemilih(), m = tIdx('m'), m7 = tIdx('m7');
    const f = (r, t) => [...rencanaBentuk([{ r, ti: t }], INSTS.gtr).of(r, t)[0].f].join(',');
    assert.equal(f(7, m), '3,5,5,3,3,3'); assert.equal(f(7, m7), '3,5,3,3,3,3');
    assert.equal(f(5, m), '1,3,3,1,1,1'); assert.equal(f(6, m), '2,4,4,2,2,2');
    assert.equal(f(4, m), '0,2,2,0,0,0'); assert.equal(f(9, m), '-1,0,2,2,1,0'); assert.equal(f(2, m), '-1,-1,0,2,3,1');
});
test('transkrip: Bb memilih bentuk A (fret 1) atau bentuk E (fret 6) menurut chord sebelum dan sesudahnya; keduanya tetap ada di daftar', () => {
    const { rencanaBentuk, INSTS, tIdx } = pemilih(), maj = tIdx('maj'), m = tIdx('m');
    const f = (lagu) => [...rencanaBentuk(lagu, INSTS.gtr).of(10, maj)[0].f].join(',');
    assert.equal(f([{ r: 10, ti: maj }]), '-1,1,3,3,3,1');
    assert.equal(f([{ r: 0, ti: maj }, { r: 10, ti: maj }, { r: 5, ti: maj }, { r: 0, ti: maj }]), '-1,1,3,3,3,1');
    assert.equal(f([{ r: 7, ti: m }, { r: 10, ti: maj }, { r: 3, ti: maj }, { r: 7, ti: m }]), '6,8,8,7,6,6');
    const semua = rencanaBentuk([{ r: 10, ti: maj }], INSTS.gtr).of(10, maj).map((v) => v.f.join(','));
    assert.ok(semua.includes('-1,1,3,3,3,1') && semua.includes('6,8,8,7,6,6'));
});
test('transkrip: ukulele, bass, dan piano tetap memakai urutan mesin; halaman memakai rencanaBentuk', () => {
    const { rencanaBentuk, voicings, INSTS, tIdx } = pemilih(), maj = tIdx('maj');
    for (const k of ['uke', 'bas']) assert.deepEqual(JSON.stringify(rencanaBentuk([{ r: 0, ti: maj }], INSTS[k]).of(0, maj)), JSON.stringify(voicings(0, maj, INSTS[k])));
    assert.equal(rencanaBentuk([{ r: 0, ti: maj }], INSTS.pno).of(0, maj).length, 1);
    assert.match(baca('transkrip.html'), /rencanaBentuk\(segs\.map/);
});
