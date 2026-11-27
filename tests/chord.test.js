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

/* Transkrip (web): tampilan dikunci (tanpa tombol daftar chord) dan penulisan nada Kres / Mol / Otomatis seperti di aplikasi. */
function ejaan(st, akey, capo) {
    const html = baca('transkrip.html').replace(/\r\n/g, '\n'), a = html.indexOf('var NSH'), b = html.indexOf('    function cname(s, bunyi) {');
    assert.ok(a > 0 && b > a, 'blok ejaan tidak ditemukan');
    const sb = { st, akey, capoOn: () => capo !== 0 }; sb.st.capo = capo; vm.createContext(sb);
    vm.runInContext(html.slice(a, b) + '\nthis.__ex = { nm, pakaiMol };', sb);
    return sb.__ex;
}
test('transkrip: Kres menulis D#, Mol menulis Eb, tanpa campuran', () => {
    const k = ejaan({ eja: 'kres' }, null, 0), m = ejaan({ eja: 'mol' }, null, 0);
    assert.deepEqual([1, 3, 6, 8, 10].map((i) => k.nm(i)), ['C#', 'D#', 'F#', 'G#', 'A#']);
    assert.deepEqual([1, 3, 6, 8, 10].map((i) => m.nm(i)), ['Db', 'Eb', 'Gb', 'Ab', 'Bb']);
});
test('transkrip: Otomatis mengikuti kunci lagu setelah kapo (F, Bb, Eb, Ab, Db mayor dan relatif minornya mol; C dan F# kres)', () => {
    const mol = (tonic, minor, capo = 0) => ejaan({ eja: 'auto' }, { tonic, minor }, capo).pakaiMol(false);
    assert.equal(mol(5, false), true); assert.equal(mol(10, false), true); assert.equal(mol(3, false), true);
    assert.equal(mol(2, true), true, 'D minor = relatif F mayor');
    assert.equal(mol(0, false), false); assert.equal(mol(2, false), false); assert.equal(mol(6, false), false); assert.equal(mol(4, true), false);
    assert.equal(mol(4, false, 3), true, 'kunci E dengan kapo 3: bentuk jari dalam kunci C#/Db, jadi mol');
    assert.equal(ejaan({ eja: 'auto' }, { tonic: 4, minor: false }, 3).pakaiMol(true), false, 'nama bunyi lagu (E) tidak digeser kapo');
    assert.equal(ejaan({ eja: 'auto' }, null, 0).pakaiMol(false), false, 'kunci belum diketahui: kres');
});
test('transkrip: tidak ada tombol pilihan tampilan di layar lebar; daftar chord selalu terbuka; pilihan Nada ada di panel pengaturan', () => {
    const html = baca('transkrip.html'), css = baca('tools.css');
    assert.doesNotMatch(html, /id="lstbtn"/); assert.doesNotMatch(css, /lstbtn/); assert.doesNotMatch(css, /data-daftar="tutup"/);
    assert.match(html, /app\.setAttribute\('data-daftar', 'buka'\)/);
    assert.match(html, /id="ejas"/); assert.match(html, /'ayri-trans'[^]*eja: st\.eja/);
    assert.doesNotMatch(html, /NM\[/, 'nama nada di halaman ini lewat nm(), bukan daftar campuran NM');
});

test('transkrip: daftar chord berbentuk kisi 3 kolom seperti di aplikasi (nama, waktu, diagram; yang berbunyi di baris tengah, yang lewat redup)', () => {
    const html = baca('transkrip.html').replace(/\r\n/g, '\n'), css = baca('tools.css').replace(/\r\n/g, '\n');
    assert.match(html, /<span class="sc-h"><b>' \+ cname\(s\) \+ '<\/b><small>[^]*<span class="sc-d">' \+ \(v \? diagram\(v, \{ mini: true/, 'tiap sel: nama, waktu, diagram');
    assert.match(html, /k === i \? ' on' : k < i \? ' past' : ''/, 'chord yang sudah lewat diberi tanda');
    assert.match(html, /a = ch\[Math\.floor\(i \/ 3\) \* 3\][^]*sh\.scrollTop = a\.offsetTop - \(sh\.clientHeight - a\.offsetHeight\) \/ 2/, 'baris chord yang berbunyi di tengah, bergulir per baris');
    assert.match(css, /\.tr-lagu \.sheet \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.tr-lagu \.sc\.on \{ border: 2px solid var\(--accent\)/);
    assert.match(css, /#pa \.sc-d \{ display: none; \}/, 'cetak tetap berupa daftar nama dan waktu');
});

/* Transkrip (web): pilihan bentuk jari per chord di laci Edit chord, disimpan seperti di aplikasi ("gtr:x-3-2-0-1-0;uke:0-0-0-3"). */
test('bentuk pilihan: kode berupa fret, satu pilihan per instrumen, sama dengan aplikasi', () => {
    const sb = { console }; vm.createContext(sb);
    vm.runInContext(baca('chord-engine.js') + '\nthis.__ex = { kodeBentuk, kodeUntuk, kodeDengan, voicings, INSTS, tIdx, rencanaBentuk };', sb, { filename: 'chord-engine.js' });
    const { kodeBentuk, kodeUntuk, kodeDengan, voicings, INSTS, tIdx, rencanaBentuk } = sb.__ex;
    assert.equal(kodeBentuk({ f: [-1, 3, 2, 0, 1, 0] }), 'x-3-2-0-1-0');
    assert.equal(kodeDengan(null, 'gtr', 'x-3-2-0-1-0'), 'gtr:x-3-2-0-1-0');
    const dua = kodeDengan('gtr:x-3-2-0-1-0', 'uke', '0-0-0-3');
    assert.equal(kodeUntuk(dua, 'gtr'), 'x-3-2-0-1-0'); assert.equal(kodeUntuk(dua, 'uke'), '0-0-0-3'); assert.equal(kodeUntuk(dua, 'bas'), null);
    assert.equal(kodeDengan(dua, 'uke', null), 'gtr:x-3-2-0-1-0'); assert.equal(kodeDengan('gtr:1-1-1-1-1-1', 'gtr', null), '');
    assert.equal(kodeUntuk('gtr:', 'gtr'), null);
    const maj = tIdx('maj'), rc = rencanaBentuk([{ r: 0, ti: maj }], INSTS.gtr);
    assert.ok(rc.easy(0, maj) >= 1 && rc.easy(0, maj) <= rc.of(0, maj).length);
    assert.equal(rencanaBentuk([{ r: 0, ti: maj }], INSTS.uke).easy(0, maj), voicings(0, maj, INSTS.uke).length);
});
test('bentuk pilihan: tersimpan bersama chord (riwayat urung/ulang dan edit tersimpan), hilang bila chord diganti, dipakai di semua tampilan', () => {
    const html = baca('transkrip.html').replace(/\r\n/g, '\n');
    assert.match(html, /s\.src \|\| '', s\.shape \|\| ''\]/, 'snap menyimpan bentuk');
    assert.match(html, /if \(a\[7\]\) g\.shape = a\[7\];/, 'restore memulihkan bentuk');
    assert.equal((html.match(/delete s\.bass; delete s\.shape;/g) || []).length, 2, 'Ganti chord (dua tempat) menghapus bentuk pilihan');
    assert.match(html, /kodeUntuk\(s\.shape, I\.key\)/);
    for (const id of ['xbp', 'xbpd', 'xbpp', 'xbpb', 'xbpa', 'xbpall']) assert.match(html, new RegExp('id="' + id + '"'), id);
    assert.match(html, /xBentuk\(\); \$\('dr-edit'\)\.hidden = false;/, 'panel bentuk diisi saat laci Edit chord dibuka');
    assert.match(html, /if \(!\$\('dr-edit'\)\.hidden\) xBentuk\(\);/, 'urung/ulang saat laci terbuka memperbarui panel');
});

test('transkrip: mengetuk chord di daftar hanya memutar lagu dari chord itu (tidak membuka menu edit)', () => {
    const html = baca('transkrip.html').replace(/\r\n/g, '\n'), a = html.indexOf("$('sheet').addEventListener('click'"), blok = html.slice(a, html.indexOf('});', a) + 3);
    assert.match(blok, /au\.currentTime = s\.t0; mark\(s\.t0, true\);/);
    assert.match(blok, /if \(au\.paused && !counting\) play\(\);/);
    assert.doesNotMatch(blok, /\$\('edit'\)|st\.sel|dr-edit/, 'tidak membuka panel edit');
});
