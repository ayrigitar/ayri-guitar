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
    { k: '9', s: '9', n: 'Dominan 9', iv: [0, 4, 7, 10, 2] }
];
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
INSTS.uke.open = [];
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
    out.sort(function (a, b) { return minF(a) - minF(b); });
    return out.slice(0, 6);
}
function voicings(root, ti, inst) {
    inst = inst || I;
    return inst.base ? genV(INSTS[inst.base], ((root - inst.shift) % 12 + 12) % 12, ti) : genV(inst, root, ti);
}
function minF(v) { var m = 99; v.f.forEach(function (x) { if (x > 0 && x < m) m = x; }); return m === 99 ? 0 : m; }
function diagram(v, o) {
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
