/* Mesin chord bersama (chords.html & transkrip.html): data bentuk jari, pembuat voicing, penggambar diagram. */
var NM = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
var RB = ['C', 'C#/Db', 'D', 'Eb/D#', 'E', 'F', 'F#/Gb', 'G', 'Ab/G#', 'A', 'Bb/A#', 'B'];
var INSTS = {
    gtr: { key: 'gtr', name: 'Gitar', n: 6, pc: [4, 9, 2, 7, 11, 4], md: [40, 45, 50, 55, 59, 64], sn: ['E', 'A', 'D', 'G', 'B', 'E'], max: 15, info: 'Gitar standar: E A D G B E (senar 6 sampai 1).' },
    uke: { key: 'uke', name: 'Ukulele', n: 4, pc: [7, 0, 4, 9], md: [67, 60, 64, 69], sn: ['G', 'C', 'E', 'A'], max: 12, info: 'Ukulele standar: G C E A (senar 4 sampai 1, G-nya nada tinggi).' },
    gll: { key: 'gll', name: 'Guitalele', n: 6, pc: [9, 2, 7, 0, 4, 9], md: [45, 50, 55, 60, 64, 69], sn: ['A', 'D', 'G', 'C', 'E', 'A'], max: 15, base: 'gtr', shift: 5, info: 'Guitalele: A D G C E A, empat tingkat di atas gitar. Bentuk jarinya sama dengan gitar, hanya namanya bergeser.' }
}, I = INSTS.gtr;
function disp(s) { return s.replace(/#/g, '\u266F').replace(/b/g, '\u266D'); }
var TYPES = [
    { k: 'maj', s: '', n: 'Mayor', iv: [0, 4, 7] }, { k: 'm', s: 'm', n: 'Minor', iv: [0, 3, 7] },
    { k: '7', s: '7', n: 'Dominan 7', iv: [0, 4, 7, 10] }, { k: 'maj7', s: 'maj7', n: 'Mayor 7', iv: [0, 4, 7, 11] },
    { k: 'm7', s: 'm7', n: 'Minor 7', iv: [0, 3, 7, 10] }, { k: 'sus2', s: 'sus2', n: 'Sus 2', iv: [0, 2, 7] },
    { k: 'sus4', s: 'sus4', n: 'Sus 4', iv: [0, 5, 7] }, { k: '5', s: '5', n: 'Power chord', iv: [0, 7] },
    { k: '6', s: '6', n: 'Mayor 6', iv: [0, 4, 7, 9] }, { k: 'add9', s: 'add9', n: 'Add 9', iv: [0, 4, 7, 2] },
    { k: 'dim', s: 'dim', n: 'Diminished', iv: [0, 3, 6] }, { k: 'aug', s: 'aug', n: 'Augmented', iv: [0, 4, 8] },
    { k: '9', s: '9', n: 'Dominan 9', iv: [0, 4, 7, 10, 2] },
    // jenis lanjutan (ditambah di akhir supaya nomor jenis lama tidak bergeser)
    { k: 'dim7', s: 'dim7', n: 'Diminished 7', iv: [0, 3, 6, 9] }, { k: 'm7b5', s: 'm7b5', n: 'Half-diminished', iv: [0, 3, 6, 10] },
    { k: '7sus4', s: '7sus4', n: 'Dominan 7 sus4', iv: [0, 5, 7, 10] }, { k: '9sus4', s: '9sus4', n: 'Dominan 9 sus4', iv: [0, 5, 7, 10, 2] },
    { k: 'maj9', s: 'maj9', n: 'Mayor 9', iv: [0, 4, 7, 11, 2] }, { k: 'm9', s: 'm9', n: 'Minor 9', iv: [0, 3, 7, 10, 2] },
    { k: 'm6', s: 'm6', n: 'Minor 6', iv: [0, 3, 7, 9] }, { k: '69', s: '6/9', n: '6/9', iv: [0, 4, 7, 9, 2] },
    { k: 'madd9', s: 'madd9', n: 'Minor add 9', iv: [0, 3, 7, 2] }, { k: 'mmaj7', s: 'mMaj7', n: 'Minor-mayor 7', iv: [0, 3, 7, 11] },
    { k: '7b9', s: '7b9', n: 'Dominan 7 b9', iv: [0, 4, 7, 10, 1] }, { k: '7#9', s: '7#9', n: 'Dominan 7 #9', iv: [0, 4, 7, 10, 3] },
    { k: '7b5', s: '7b5', n: 'Dominan 7 b5', iv: [0, 4, 6, 10] }, { k: '7#5', s: '7#5', n: 'Dominan 7 #5', iv: [0, 4, 8, 10] },
    { k: '11', s: '11', n: 'Dominan 11', iv: [0, 7, 10, 2, 5] }, { k: '13', s: '13', n: 'Dominan 13', iv: [0, 4, 7, 10, 2, 9] }
];
var NBASE = 13; // jenis dasar (tampil langsung); sisanya jenis lanjutan
/* tulisan akhiran chord -> jenis (dipakai pencarian chord & pembaca chart) */
var SUFK = { '': 'maj', maj: 'maj', M: 'maj', m: 'm', min: 'm', '-': 'm', '7': '7', dom7: '7', maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', m7: 'm7', min7: 'm7', '-7': 'm7',
    sus2: 'sus2', sus4: 'sus4', sus: 'sus4', '5': '5', '6': '6', maj6: '6', M6: '6', add9: 'add9', add2: 'add9', '2': 'add9', dim: 'dim', '°': 'dim', o: 'dim', aug: 'aug', '+': 'aug', '9': '9',
    dim7: 'dim7', '°7': 'dim7', o7: 'dim7', m7b5: 'm7b5', 'm7-5': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', '7sus4': '7sus4', '7sus': '7sus4', '9sus4': '9sus4', '9sus': '9sus4',
    maj9: 'maj9', M9: 'maj9', 'Δ9': 'maj9', m9: 'm9', min9: 'm9', '-9': 'm9', m6: 'm6', min6: 'm6', '69': '69', '6/9': '69', '6add9': '69', madd9: 'madd9', 'm(add9)': 'madd9', madd2: 'madd9',
    mmaj7: 'mmaj7', mMaj7: 'mmaj7', mM7: 'mmaj7', 'm(maj7)': 'mmaj7', '7b9': '7b9', '7(b9)': '7b9', '7#9': '7#9', '7(#9)': '7#9', '7b5': '7b5', '7-5': '7b5', '7(b5)': '7b5',
    '7#5': '7#5', '7+5': '7#5', '7(#5)': '7#5', aug7: '7#5', '+7': '7#5', '11': '11', '9sus4add11': '11', '13': '13' };
// bentuk bergeser: r = senar akar (6/5/4), f = fret relatif (-1 = mati), g = jari
var TPL = {
    maj: [{ r: 6, f: [0, 2, 2, 1, 0, 0], g: [1, 3, 4, 2, 1, 1] }, { r: 5, f: [-9, 0, 2, 2, 2, 0], g: [0, 1, 2, 3, 4, 1] }, { r: 4, f: [-9, -9, 0, 2, 3, 2], g: [0, 0, 1, 3, 4, 2] }],
    m: [{ r: 6, f: [0, 2, 2, 0, 0, 0], g: [1, 3, 4, 1, 1, 1] }, { r: 5, f: [-9, 0, 2, 2, 1, 0], g: [0, 1, 3, 4, 2, 1] }, { r: 4, f: [-9, -9, 0, 2, 3, 1], g: [0, 0, 1, 3, 4, 2] }],
    '7': [{ r: 6, f: [0, 2, 0, 1, 0, 0], g: [1, 3, 1, 2, 1, 1] }, { r: 5, f: [-9, 0, 2, 0, 2, 0], g: [0, 1, 3, 1, 4, 1] }, { r: 4, f: [-9, -9, 0, 2, 1, 2], g: [0, 0, 1, 3, 2, 4] }],
    maj7: [{ r: 6, f: [0, 2, 1, 1, 0, 0], g: [1, 4, 2, 3, 1, 1] }, { r: 5, f: [-9, 0, 2, 1, 2, 0], g: [0, 1, 3, 2, 4, 1] }, { r: 4, f: [-9, -9, 0, 2, 2, 2], g: [0, 0, 1, 3, 3, 3] }],
    m7: [{ r: 6, f: [0, 2, 0, 0, 0, 0], g: [1, 3, 1, 1, 1, 1] }, { r: 5, f: [-9, 0, 2, 0, 1, 0], g: [0, 1, 3, 1, 2, 1] }],
    sus2: [{ r: 5, f: [-9, 0, 2, 2, 0, 0], g: [0, 1, 3, 4, 1, 1] }, { r: 4, f: [-9, -9, 0, 2, 3, 0], g: [0, 0, 1, 3, 4, 1] }],
    sus4: [{ r: 6, f: [0, 2, 2, 2, 0, 0], g: [1, 2, 3, 4, 1, 1] }, { r: 5, f: [-9, 0, 2, 2, 3, 0], g: [0, 1, 2, 3, 4, 1] }, { r: 4, f: [-9, -9, 0, 2, 3, 3], g: [0, 0, 1, 2, 3, 4] }],
    '5': [{ r: 6, f: [0, 2, 2, -9, -9, -9], g: [1, 3, 4, 0, 0, 0] }, { r: 5, f: [-9, 0, 2, 2, -9, -9], g: [0, 1, 3, 4, 0, 0] }],
    '6': [{ r: 5, f: [-9, 0, 2, 2, 2, 2], g: [0, 1, 3, 3, 3, 3] }, { r: 4, f: [-9, -9, 0, 2, 0, 2], g: [0, 0, 1, 3, 1, 4] }],
    add9: [{ r: 5, f: [-9, 0, 2, 4, 2, 0], g: [0, 1, 2, 4, 3, 1] }],
    dim: [{ r: 5, f: [-9, 0, 1, 2, 1, -9], g: [0, 1, 2, 4, 3, 0] }],
    aug: [{ r: 6, f: [0, 3, 2, 1, 1, 0], g: [1, 4, 3, 2, 2, 1] }, { r: 5, f: [-9, 0, 3, 2, 2, 1], g: [0, 1, 4, 2, 3, 1] }],
    '9': [{ r: 5, f: [-9, 0, -1, 0, 0, 0], g: [0, 2, 1, 3, 4, 4] }]
};
var OPEN = [['C', 'maj', 'x32010', '032010'], ['C', '7', 'x32310', '032410'], ['C', 'maj7', 'x32000', '032000'], ['C', 'add9', 'x32030', '032040'],
    ['D', 'maj', 'xx0232', '000132'], ['D', 'm', 'xx0231', '000231'], ['D', '7', 'xx0212', '000213'], ['D', 'maj7', 'xx0222', '000111'], ['D', 'sus2', 'xx0230', '000230'], ['D', 'sus4', 'xx0233', '000134'], ['D', 'm7', 'xx0211', '000211'], ['D', '6', 'xx0202', '000102'],
    ['E', 'maj', '022100', '023100'], ['E', 'm', '022000', '023000'], ['E', '7', '020100', '020100'], ['E', 'm7', '020000', '020000'], ['E', 'maj7', '021100', '032100'], ['E', 'sus4', '022200', '023400'], ['E', '5', '022xxx', '023000'],
    ['A', 'maj', 'x02220', '001230'], ['A', 'm', 'x02210', '002310'], ['A', '7', 'x02020', '002030'], ['A', 'm7', 'x02010', '002010'], ['A', 'maj7', 'x02120', '003120'], ['A', 'sus2', 'x02200', '001200'], ['A', 'sus4', 'x02230', '001240'], ['A', '5', 'x022xx', '001200'],
    ['G', 'maj', '320003', '210003'], ['G', '7', '320001', '320001'], ['G', 'maj7', '320002', '210003'], ['G', '6', '320000', '210000'], ['G', 'sus4', '330013', '230014'],
    ['F', 'maj7', 'xx3210', '003210'], ['B', '7', 'x21202', '021304'], ['A', '9', 'x02423', '001423']];
INSTS.gtr.tpl = TPL; INSTS.gtr.open = OPEN;
INSTS.bas = { key: 'bas', name: 'Bass', n: 4, pc: [4, 9, 2, 7], md: [28, 33, 38, 43], sn: ['E', 'A', 'D', 'G'], max: 12, loose: true, tpl: {}, open: [],
    tplAll: [{ ri: 0, f: [0, -9, -9, -9] }, { ri: 1, f: [-9, 0, -9, -9] }, { ri: 2, f: [-9, -9, 0, -9] }, { ri: 0, f: [0, 2, 2, -9] }, { ri: 1, f: [-9, 0, 2, 2] }, { ri: 0, f: [0, -9, 2, -9] }],
    info: 'Bass 4 senar: E A D G. Menampilkan nada akar chord, plus pola akar-kelima-oktaf bila cocok.' };
INSTS.uke.tpl = {
    maj: [{ ri: 1, f: [0, 0, 0, 3] }, { ri: 0, f: [0, 2, 3, 2] }, { ri: 3, f: [2, 1, 0, 0] }, { ri: 2, f: [1, -1, 0, -1] }, { ri: 1, f: [0, 0, 0, -2] }],
    m: [{ ri: 1, f: [0, 3, 3, 3] }, { ri: 0, f: [0, 2, 3, 1] }, { ri: 3, f: [2, 0, 0, 0] }, { ri: 1, f: [0, 0, -1, -2] }, { ri: 1, f: [-4, 0, -1, -2] }],
    '7': [{ ri: 1, f: [0, 0, 0, 1] }, { ri: 0, f: [0, 2, 1, 2] }, { ri: 3, f: [0, 1, 0, 0] }, { ri: 2, f: [1, 2, 0, 2] }, { ri: 1, f: [0, -2, 0, -2] }],
    maj7: [{ ri: 1, f: [0, 0, 0, 2] }, { ri: 0, f: [0, 2, 2, 2] }, { ri: 3, f: [1, 1, 0, 0] }],
    m7: [{ ri: 3, f: [0, 0, 0, 0] }, { ri: 0, f: [0, 2, 1, 1] }, { ri: 2, f: [0, 2, 0, 2] }],
    sus4: [{ ri: 1, f: [0, 0, 1, 3] }, { ri: 0, f: [0, 2, 3, 3] }, { ri: 3, f: [2, 2, 0, 0] }],
    sus2: [{ ri: 1, f: [0, 2, 3, 3] }, { ri: 1, f: [0, 0, -2, -2] }],
    '5': [{ ri: 1, f: [0, 0, -9, -9] }],
    '6': [{ ri: 1, f: [0, 0, 0, 0] }, { ri: 0, f: [0, 2, 0, 2] }],
    add9: [{ ri: 1, f: [0, 2, 0, 3] }],
    dim: [{ ri: 3, f: [-9, 0, -1, 0] }],
    aug: [{ ri: 1, f: [1, 0, 0, 3] }, { ri: 0, f: [0, 3, 3, 2] }]
};
INSTS.uke.open = []; INSTS.uke.reentrant = true; // senar G tinggi: bass tidak harus nada dasar
function autoF(f, barre) {
    var idx = [], g = f.map(function () { return 0; }), n = 0;
    f.forEach(function (x, i) { if (x > 0) idx.push(i); });
    if (!idx.length) return g;
    idx.sort(function (a, b) { return f[a] - f[b] || a - b; });
    var mn = f[idx[0]], bar = barre && idx.filter(function (i) { return f[i] === mn; }).length >= 2;
    idx.forEach(function (i) { if (bar && f[i] === mn) g[i] = 1; else g[i] = Math.min(4, ++n + (bar ? 1 : 0)); });
    return g;
}
var PROGS = [
    { n: 'I\u2013V\u2013vi\u2013IV (Pop)', c: [[0, 'maj'], [7, 'maj'], [9, 'm'], [5, 'maj']] },
    { n: 'I\u2013IV\u2013V (Rock/Blues)', c: [[0, 'maj'], [5, 'maj'], [7, 'maj']] },
    { n: 'vi\u2013IV\u2013I\u2013V', c: [[9, 'm'], [5, 'maj'], [0, 'maj'], [7, 'maj']] },
    { n: 'I\u2013vi\u2013IV\u2013V (Klasik 50an)', c: [[0, 'maj'], [9, 'm'], [5, 'maj'], [7, 'maj']] },
    { n: 'ii\u2013V\u2013I (Jazz)', c: [[2, 'm7'], [7, '7'], [0, 'maj7']] },
    { n: 'Canon', c: [[0, 'maj'], [7, 'maj'], [9, 'm'], [4, 'm'], [5, 'maj'], [0, 'maj'], [5, 'maj'], [7, 'maj']] }
];
function tIdx(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].k === k) return i; return 0; }
function pcs(v, pc) { var r = []; for (var i = 0; i < v.f.length; i++) if (v.f[i] >= 0) r.push((pc[i] + v.f[i]) % 12); return r; }
function valid(v, root, t, pc, loose) {
    var set = t.iv.map(function (x) { return (root + x) % 12; }), p = pcs(v, pc), i;
    if (p.indexOf(root) < 0) return false;
    for (i = 0; i < p.length; i++) if (set.indexOf(p[i]) < 0) return false;
    if (loose) return true;
    for (i = 0; i < set.length; i++) { if (t.iv[i] === 7 && t.iv.length > 3) continue; if (p.indexOf(set[i]) < 0) return false; }
    return true;
}
function parseOpen(a) { var f = [], g = [], i; for (i = 0; i < 6; i++) { f.push(a[2][i] === 'x' ? -1 : +a[2][i]); g.push(+a[3][i]); } return { f: f, g: g, open: true }; }
function genV(inst, root, ti) {
    var t = TYPES[ti], out = [], seen = {}, hasOpen = false;
    function add(v) { var k = v.f.join(','); if (seen[k] || !valid(v, root, t, inst.pc, inst.loose)) return; seen[k] = 1; out.push(v); }
    (inst.open || []).forEach(function (a) { if (NM.indexOf(a[0]) === root && a[1] === t.k) { add(parseOpen(a)); hasOpen = true; } });
    (inst.tpl[t.k] || inst.tplAll || []).forEach(function (tp) {
        var si = tp.ri !== undefined ? tp.ri : 6 - tp.r, base = ((root - inst.pc[si]) % 12 + 12) % 12, f = [], g = tp.g ? tp.g.slice() : null, ok = true;
        if (base === 0 && hasOpen) return;
        tp.f.forEach(function (x) { if (x === -9) f.push(-1); else { var a = x + base; if (a < 0) ok = false; f.push(a); } });
        if (!ok || Math.max.apply(null, f) > inst.max) return;
        if (base === 0 || !g) g = autoF(f, base > 0);
        else g = g.map(function (x, i) { return f[i] <= 0 ? 0 : x; });
        add({ f: f, g: g, open: base === 0 });
    });
    /* lengkapi dengan bentuk hasil generator (beda posisi / beda senar bass) sampai VMAX bentuk */
    if (inst.n && !inst.loose) genAuto(inst, root, t, VMAX - out.length, out).forEach(function (v) { var k = v.f.join(','); if (seen[k]) return; seen[k] = 1; out.push({ f: v.f, g: autoF(v.f, true), open: v.f.indexOf(0) >= 0 && minF(v) <= 3, gen: true }); });
    /* urutan: posisi terendah dulu, tetapi senar mati di tengah (dan di ukulele, senar mati mana pun) dianggap
       sulit, jadi C ukulele 0003 tampil sebelum 000x dan Em7 gitar 020000 sebelum 0x0000; bila seri, fret
       tertinggi lebih rendah lalu senar terbuka lebih banyak */
    out.sort(function (a, b) { return susah(a, inst) - susah(b, inst) || maxF(a) - maxF(b) || terbuka(b) - terbuka(a); });
    return out.slice(0, VMAX);
}
function maxF(v) { return Math.max.apply(null, v.f.concat([0])); }
function terbuka(v) { return v.f.filter(function (x) { return x === 0; }).length; }
function susah(v, inst) {
    var f = v.f, first = -1, last = -1, mati = 0, dalam = 0, i;
    for (i = 0; i < f.length; i++) { if (f[i] >= 0) { if (first < 0) first = i; last = i; } else mati++; }
    for (i = first; i <= last; i++) if (f[i] < 0) dalam++;
    return minF(v) + dalam * 4 + (inst.reentrant ? mati * 4 : 0);
}
var VMAX = 8;
/* Generator bentuk jari: telusuri jendela 4 fret di sepanjang leher, pilih kombinasi senar yang memuat nada wajib chord,
   bass = nada dasar (kecuali ukulele), maks. 4 jari (atau barre), lalu ambil yang paling enak dimainkan dan beragam posisinya.
   Nada wajib: semua nada chord, kecuali kuin murni (dan 9 pada chord 11/13) boleh dibuang bila chord punya >= 4 nada. */
function genAuto(inst, root, t, limit, pre) {
    if (limit <= 0) return [];
    var n = inst.n, pcs = {}, req = [], opt = [], big = t.iv.length >= 4, found = [], seen = {}, b, s;
    t.iv.forEach(function (x) { var p = (root + x) % 12; pcs[p] = 1; if ((x === 7 && big) || (x === 2 && (t.k === '13' || t.k === '11'))) opt.push(p); else req.push(p); });
    var minS = n >= 6 ? 4 : 3, cand = [], cur = [];
    function test(b0) {
        var f = cur, i, first = -1, last = -1, inner = 0, ns = 0, have = {}, fr = [];
        for (i = 0; i < n; i++) if (f[i] >= 0) { if (first < 0) first = i; last = i; ns++; have[(inst.pc[i] + f[i]) % 12] = 1; if (f[i] > 0) fr.push(f[i]); }
        if (ns < minS) return;
        for (i = first; i <= last; i++) if (f[i] < 0) inner++;
        if (inner > (big ? 1 : 0)) return;
        if (!inst.reentrant && (inst.pc[first] + f[first]) % 12 !== root) return;
        for (i = 0; i < req.length; i++) if (!have[req[i]]) return;
        var mn = fr.length ? Math.min.apply(null, fr) : 0, mx = fr.length ? Math.max.apply(null, fr) : 0;
        if (mx - mn > 3 || (fr.length && mn !== Math.max(1, b0) && b0 > 0)) return; // satu jendela = satu posisi (hindari duplikat)
        var atMin = fr.filter(function (x) { return x === mn; }).length, fingers = fr.length;
        if (fingers > 4) {
            if (atMin < 2) return;
            fingers = fr.length - atMin + 1; if (fingers > 4) return;
            var bs = f.indexOf(mn); for (i = bs; i < n; i++) if (f[i] === 0) return; // senar terbuka di bawah barre tidak bisa
        }
        var k = f.join(','); if (seen[k]) return; seen[k] = 1;
        var opens = 0; for (i = 0; i < n; i++) if (f[i] === 0) opens++;
        var sc = ns * 4 - inner * 6 - fingers * 1.5 - mn * 0.25 + (mn <= 3 ? opens * 1.5 : 0);
        opt.forEach(function (p) { if (have[p]) sc += 1; });
        found.push({ f: f.slice(), sc: sc, mn: mn, bs: first });
    }
    function rec(i, b0) { if (i === n) { test(b0); return; } for (var j = 0; j < cand[i].length; j++) { cur[i] = cand[i][j]; rec(i + 1, b0); } }
    for (b = 0; b <= inst.max - 3; b++) {
        cand = [];
        for (s = 0; s < n; s++) { var o = [-1], f0; if (pcs[inst.pc[s]] && b <= 3) o.push(0); for (f0 = Math.max(1, b); f0 <= b + 3; f0++) if (pcs[(inst.pc[s] + f0) % 12]) o.push(f0); cand.push(o); }
        rec(0, b);
    }
    found.sort(function (a, c) { return c.sc - a.sc; });
    /* beragam: lewati bentuk yang posisinya (fret terendah +-1) dan senar bass-nya sama dengan yang sudah dipilih */
    var picked = (pre || []).map(function (v) { var fs = -1; for (var i = 0; i < n; i++) if (v.f[i] >= 0) { fs = i; break; } return { mn: minF(v), bs: fs }; }), out = [];
    found.forEach(function (v) { if (out.length >= limit) return; if (picked.some(function (p) { return Math.abs(p.mn - v.mn) <= 1 && p.bs === v.bs; })) return; picked.push(v); out.push(v); });
    return out;
}
var VCACHE = {};
function voicings(root, ti, inst) {
    inst = inst || I;
    if (inst.kb) return pianoVoicings(root, ti);
    var key = inst.key + '|' + root + '|' + ti;
    if (!VCACHE[key]) VCACHE[key] = inst.base ? genV(INSTS[inst.base], ((root - inst.shift) % 12 + 12) % 12, ti) : genV(inst, root, ti);
    return VCACHE[key];
}
function minF(v) { var m = 99; v.f.forEach(function (x) { if (x > 0 && x < m) m = x; }); return m === 99 ? 0 : m; }
function diagram(v, o) {
    if (v.kb) return pianoDiagram(v, o || {});
    o = o || {};
    var n = v.f.length, x0 = 40, sx = 120 / (n - 1), y0 = 58, fh = 34, nF = 5, fr = v.f.filter(function (x) { return x > 0; });
    var mx = fr.length ? Math.max.apply(null, fr) : 0, mn = fr.length ? Math.min.apply(null, fr) : 1, base = mx <= 5 ? 1 : mn, i, s;
    function X(k) { return o.left ? x0 + (n - 1 - k) * sx : x0 + k * sx; }
    s = '<svg viewBox="0 0 200 ' + (o.mini ? 230 : 266) + '" class="cd" role="img" aria-label="' + (o.alt || 'Diagram chord') + '">';
    for (i = 0; i <= nF; i++) s += '<line x1="' + x0 + '" x2="' + (x0 + 120) + '" y1="' + (y0 + i * fh) + '" y2="' + (y0 + i * fh) + '" class="' + (i === 0 && base === 1 ? 'cd-nut' : 'cd-f') + '"/>';
    for (i = 0; i < n; i++) s += '<line x1="' + X(i) + '" x2="' + X(i) + '" y1="' + y0 + '" y2="' + (y0 + nF * fh) + '" class="cd-s" stroke-width="' + (1 + (n - 1 - i) * 0.35).toFixed(2) + '"/>';
    if (base > 1) s += '<text x="' + (o.left ? 192 : 8) + '" y="' + (y0 + fh / 2 + 5) + '" class="cd-fr"' + (o.left ? ' text-anchor="end"' : '') + '>' + base + 'fr</text>';
    for (i = 0; i < n; i++) {
        if (v.f[i] < 0) s += '<path d="M' + (X(i) - 6) + ' ' + (y0 - 20) + 'l12 12m0-12l-12 12" class="cd-x"/>';
        else if (v.f[i] === 0) s += '<circle cx="' + X(i) + '" cy="' + (y0 - 14) + '" r="6" class="cd-o"/>';
    }
    var bf = 0, bi = [];
    for (i = 0; i < n; i++) if (v.f[i] > 0 && v.g[i] === 1) { if (!bf) bf = v.f[i]; if (v.f[i] === bf) bi.push(i); }
    var barre = bi.length >= 2;
    if (barre) { var xa = Math.min(X(bi[0]), X(bi[bi.length - 1])), xb = Math.max(X(bi[0]), X(bi[bi.length - 1]));
        s += '<rect x="' + (xa - 11) + '" y="' + (y0 + (bf - base) * fh + fh / 2 - 10) + '" width="' + (xb - xa + 22) + '" height="20" rx="10" class="cd-barre"/>';
        if (!o.mini) s += '<text x="' + X(bi[0]) + '" y="' + (y0 + (bf - base) * fh + fh / 2 + 5) + '" class="cd-dt">1</text>'; }
    for (i = 0; i < n; i++) {
        if (v.f[i] <= 0 || (barre && v.f[i] === bf && v.g[i] === 1)) continue;
        var cy = y0 + (v.f[i] - base) * fh + fh / 2;
        s += '<circle cx="' + X(i) + '" cy="' + cy + '" r="11" class="cd-dot"/>';
        if (!o.mini) s += '<text x="' + X(i) + '" y="' + (cy + 5) + '" class="cd-dt">' + (o.note ? disp(NM[(I.pc[i] + v.f[i]) % 12]) : (v.g[i] || '')) + '</text>';
    }
    if (!o.mini) for (i = 0; i < n; i++) {
        s += '<text x="' + X(i) + '" y="' + (y0 + nF * fh + 26) + '" class="cd-nm">' + I.sn[i] + '</text>';
        s += '<rect class="cd-hit" data-s="' + i + '" x="' + (X(i) - 12) + '" y="' + (y0 - 28) + '" width="24" height="' + (nF * fh + 56) + '"/>';
    }
    return s + '</svg>';
}

/* ===== Piano ===== */
INSTS.pno = { key: 'pno', name: 'Piano', kb: true, n: 0, info: 'Piano: tangan kanan memainkan akor dalam posisi dasar dan inversi. Bentuk "Bass + akor" menambah nada akar di tangan kiri.' };
function pianoVoicings(root, ti) {
    var iv = TYPES[ti].iv, base = 48 + root, asc = iv.map(function (x) { return base + ((x === 2 && iv.length > 3) ? 14 : x); }).sort(function (a, b) { return a - b; }), out = [], i, j, c;
    for (i = 0; i < asc.length; i++) { c = asc.slice(); for (j = 0; j < i; j++) c.push(c.shift() + 12); out.push({ kb: true, notes: c, label: i ? 'Inversi ' + i : 'Posisi dasar', f: null }); }
    out.push({ kb: true, notes: [base - 12].concat(asc), label: 'Bass + akor', bass: true, f: null });
    return out.slice(0, 6);
}
function pianoDiagram(v, o) {
    var ns = v.notes, lo = Math.floor(Math.min.apply(null, ns) / 12) * 12, hi = (Math.floor(Math.max.apply(null, ns) / 12) + 1) * 12 - 1;
    if (hi - lo < 23) hi = lo + 23;
    var WK = [0, 2, 4, 5, 7, 9, 11], BK = [1, 3, 6, 8, 10], kw = 26, bw = 16, h = 120, bh = 72, wx = {}, x = 0, m, s, on = {}, fing = {};
    for (m = lo; m <= hi; m++) if (WK.indexOf(m % 12) > -1) { wx[m] = x; x += kw; }
    var asc = ns.slice().sort(function (a, b) { return a - b; }), body = v.bass ? asc.slice(1) : asc, FN = { 1: [1], 2: [1, 5], 3: [1, 3, 5], 4: [1, 2, 3, 5], 5: [1, 2, 3, 4, 5] };
    asc.forEach(function (n) { on[n] = 1; });
    body.forEach(function (n, i) { fing[n] = (FN[body.length] || [1, 2, 3, 4, 5])[i]; }); if (v.bass) fing[asc[0]] = 'L';
    s = '<svg viewBox="0 0 ' + x + ' ' + (o.mini ? h : h + 16) + '" class="cd pk" role="img" aria-label="' + (o.alt || 'Diagram piano') + '">';
    for (m = lo; m <= hi; m++) if (wx[m] !== undefined) {
        s += '<rect class="pk-w' + (on[m] ? ' on' : '') + '" x="' + wx[m] + '" y="0" width="' + kw + '" height="' + h + '" rx="3"/>';
        if (!o.mini && m % 12 === 0) s += '<text class="pk-o" x="' + (wx[m] + kw / 2) + '" y="' + (h + 12) + '">C' + (Math.floor(m / 12) - 1) + '</text>';
    }
    for (m = lo; m <= hi; m++) if (BK.indexOf(m % 12) > -1 && wx[m - 1] !== undefined) s += '<rect class="pk-b' + (on[m] ? ' on' : '') + '" x="' + (wx[m - 1] + kw - bw / 2) + '" y="0" width="' + bw + '" height="' + bh + '" rx="2"/>';
    if (!o.mini) asc.forEach(function (n) {
        var blk = BK.indexOf(n % 12) > -1, cx = blk ? wx[n - 1] + kw : wx[n] + kw / 2, cy = blk ? bh - 12 : h - 14, txt = o.note ? disp(NM[n % 12]) : fing[n];
        s += '<text class="pk-t' + (blk ? ' pk-tb' : '') + '" x="' + cx + '" y="' + (cy + 4) + '">' + txt + '</text>';
    });
    if (!o.mini) for (m = lo; m <= hi; m++) { if (wx[m] !== undefined) s += '<rect class="cd-hit" data-m="' + m + '" x="' + wx[m] + '" y="' + bh + '" width="' + kw + '" height="' + (h - bh) + '"/>'; else if (wx[m - 1] !== undefined) s += '<rect class="cd-hit" data-m="' + m + '" x="' + (wx[m - 1] + kw - bw / 2) + '" y="0" width="' + bw + '" height="' + bh + '"/>'; }
    return s + '</svg>';
}
