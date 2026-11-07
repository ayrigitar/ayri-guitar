'use strict';
/* Deteksi chord AI (transkrip-ai/): CQT dibanding librosa, jaringan dibanding PyTorch (model 0), dan chord hasil lima model,
   pada klip buatan sendiri "pop" (C G Am F Dm7 G7). Data acuan dibuat oleh kode aslinya (tools/cnnlstm/export.py di
   AYRI Studio Tools). */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const { baca } = require('./helper');

const AKAR = path.join(__dirname, '..'), DATA = path.join(__dirname, 'data', 'transkrip-ai');
function f32(nama) { const b = fs.readFileSync(path.join(DATA, nama)); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }
function wav16(nama) {
    const b = fs.readFileSync(path.join(DATA, nama)), dv = new DataView(b.buffer, b.byteOffset, b.length);
    let pos = 12;
    while (pos + 8 <= b.length) {
        const id = b.toString('latin1', pos, pos + 4), size = dv.getUint32(pos + 4, true);
        if (id === 'data') { const y = new Float32Array(size / 2); for (let i = 0; i < y.length; i++) y[i] = dv.getInt16(pos + 8 + 2 * i, true) / 32768; return y; }
        pos += 8 + size + (size & 1);
    }
    throw new Error('tidak ada data');
}
function muat() {
    const sb = { console, Math, Float32Array, Float64Array, Int16Array, Int32Array, DataView, Map, Array, Object, String, JSON, WebAssembly };
    sb.globalThis = sb; vm.createContext(sb);
    vm.runInContext(baca('transkrip-ai/cqt.js') + '\n' + baca('transkrip-ai/chordnet.js'), sb, { filename: 'transkrip-ai' });
    const bin = fs.readFileSync(path.join(AKAR, 'transkrip-ai', 'cnnlstm.bin'));
    return { C: sb.CqtFeatures, CN: sb.ChordNet, W: sb.ChordNet.readWeights(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length)), sb };
}
function selisihTerbesar(a, b) { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; }

test('transkrip AI: perkiraan stem dan CQT sama dengan librosa', () => {
    const { C } = muat(), y = wav16('pop.wav'), acuan = JSON.parse(fs.readFileSync(path.join(DATA, 'pop.json'), 'utf8'));
    assert.ok(Math.abs(C.estimateTuning(y) - acuan.tuning) < 0.011, 'stem');
    const r = C.hybridCqt(y, acuan.tuning), mau = f32('pop.cqt');
    assert.equal(r.frames, mau.length / 288);
    let rel = 0;
    for (let f = 0; f < r.frames; f++) {
        let puncak = 1e-9; for (let b = 0; b < 288; b++) puncak = Math.max(puncak, mau[f * 288 + b]);
        for (let b = 0; b < 288; b++) rel = Math.max(rel, Math.abs(r.v[f * 288 + b] - mau[f * 288 + b]) / puncak);
    }
    assert.ok(rel < 1e-4, 'CQT berbeda ' + rel);
});

test('transkrip AI: jaringan (JavaScript dan WebAssembly) sama dengan PyTorch, lima model menghasilkan C G Am F Dm7 G7', () => {
    const { CN, W, sb } = muat(), cqt = f32('pop.cqt'), frames = cqt.length / 288, mau = f32('pop.probs0');
    const js = CN.run(W, 'm0', cqt, frames, 288, 18, frames);
    assert.ok(selisihTerbesar(js, mau) < 0.02, 'JavaScript ' + selisihTerbesar(js, mau));
    const mem = new WebAssembly.Memory({ initial: 256 });
    const inst = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(AKAR, 'transkrip-ai', 'chordnet.wasm'))), { env: { memory: mem } });
    CN.useWasm(inst, mem);
    const avg = new Float32Array(frames * 100);
    for (let m = 0; m < 5; m++) {
        const p = CN.run(W, 'm' + m, cqt, frames, 288, 18, 1000);
        if (m === 0) assert.ok(selisihTerbesar(CN.run(W, 'm0', cqt, frames, 288, 18, frames), mau) < 0.02, 'WebAssembly');
        for (let i = 0; i < avg.length; i++) avg[i] += p[i] / 5;
    }
    const tabel = JSON.parse(baca('transkrip-ai/chords.json'));
    const segs = CN.toSegs(tabel, CN.decode(tabel, avg, frames), 512 / 22050);
    assert.deepEqual(Array.from(segs, (s) => s.r + ':' + s.k), ['0:maj', '7:maj', '9:m', '5:maj', '2:m7', '7:7']);
    assert.ok(Math.abs(segs[1].t0 - 2.0) < 0.05 && Math.abs(segs[5].t1 - 12.0) < 0.05, 'waktu chord');
    void sb;
});
