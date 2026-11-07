/* Chord-CNN-LSTM (Jiang et al., ISMIR 2019, MIT) for the browser: the network of ChordNet in AYRI Studio Tools
   (ChordNet.kt), inference only. Works in a page, a Worker and Node. */
(function (root) {
    'use strict';
    var SPEC = 252, BIN_OFFSET = 18, HIDDEN = 96, CNN_OUT = 240, MARGIN = 12;
    var SELU_S = 1.0507009873554805, SELU_A = 1.6732632423543772;
    var LAYERS = [['conv1a', 1, 1], ['conv1b', 1, 1], ['conv1c', 1, 3], ['conv2a', 1, 1], ['conv2b', 1, 1], ['conv2c', 1, 3],
        ['conv3a', 1, 1], ['conv3b', 1, 4], ['conv4a', 0, 1], ['conv4b', 0, 1]];
    var SLICES = [0, 73, 86, 90, 94, 97, 100];

    /* WebAssembly kernels (chordnet.wasm), when given: a memory with a bump allocator; weights copied in once. */
    var WA = null;
    function useWasm(instance, memory) {
        WA = { ex: instance.exports, mem: memory, top: 1024, wptr: new Map() };
    }
    function heap() { return new Float32Array(WA.mem.buffer); }
    function alloc(bytes) {
        var p = (WA.top + 15) & ~15; WA.top = p + bytes;
        var need = WA.top - WA.mem.buffer.byteLength;
        if (need > 0) WA.mem.grow(Math.ceil(need / 65536));
        return p;
    }
    function wasmArray(a) {
        var p = WA.wptr.get(a);
        if (p === undefined) { p = alloc(a.length * 4); heap().set(a, p >> 2); WA.wptr.set(a, p); }
        return p;
    }

    function halfToFloat(h) {
        var s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
        if (e === 0) return s * m * Math.pow(2, -24);
        if (e === 31) return m ? NaN : s * Infinity;
        return s * (1 + m / 1024) * Math.pow(2, e - 15);
    }

    /* tools/cnnlstm/export.py format: int32 count (negative = float32), per tensor name, rank, dims, values. */
    function readWeights(buf) {
        var dv = new DataView(buf), p = 0, map = {};
        function i32() { var v = dv.getInt32(p, true); p += 4; return v; }
        var n0 = i32(), f32 = n0 < 0, n = Math.abs(n0);
        for (var k = 0; k < n; k++) {
            var len = i32(), name = '';
            for (var i = 0; i < len; i++) name += String.fromCharCode(dv.getUint8(p + i));
            p += len;
            var rank = i32(), dims = [], count = 1;
            for (var r = 0; r < rank; r++) { dims.push(i32()); count *= dims[r]; }
            var a = new Float32Array(count);
            if (f32) { for (var j = 0; j < count; j++) a[j] = dv.getFloat32(p + 4 * j, true); p += 4 * count; }
            else { for (var j2 = 0; j2 < count; j2++) a[j2] = halfToFloat(dv.getUint16(p + 2 * j2, true)); p += 2 * count; }
            map[name] = { dims: dims, v: a };
        }
        return map;
    }

    /* Output channels [o0, o1) (at most 4) of a 3x3 convolution over the bordered input xp, on the wide grid. */
    function convGroup(xp, inCh, n, wp, plane, wt, bias, o0, o1, y, fo, acc) {
        var total = n * wp, blk = 2048, k9 = inCh * 9;
        var a0 = acc[0], a1 = acc[1], a2 = acc[2], a3 = acc[3];
        var w0 = o0 * k9, w1 = o0 + 1 < o1 ? (o0 + 1) * k9 : -1, w2 = o0 + 2 < o1 ? (o0 + 2) * k9 : -1, w3 = o0 + 3 < o1 ? (o0 + 3) * k9 : -1;
        for (var p0 = 0; p0 < total; p0 += blk) {
            var len = Math.min(blk, total - p0), p;
            a0.fill(0, 0, len); a1.fill(0, 0, len); a2.fill(0, 0, len); a3.fill(0, 0, len);
            for (var i = 0; i < inCh; i++) for (var kt = 0; kt < 3; kt++) for (var kf = 0; kf < 3; kf++) {
                var tap = i * 9 + kt * 3 + kf, src = i * plane + kt * wp + kf + p0;
                var c0 = wt[w0 + tap], c1 = w1 >= 0 ? wt[w1 + tap] : 0, c2 = w2 >= 0 ? wt[w2 + tap] : 0, c3 = w3 >= 0 ? wt[w3 + tap] : 0;
                for (p = 0; p < len; p++) {
                    var v = xp[src + p];
                    a0[p] += c0 * v; a1[p] += c1 * v; a2[p] += c2 * v; a3[p] += c3 * v;
                }
            }
            for (p = 0; p < len; p++) {
                var q = p0 + p, t = (q / wp) | 0, c = q - t * wp;
                if (c >= fo) continue;
                var d = t * fo + c;
                y[o0 * n * fo + d] = a0[p] + bias[o0];
                if (w1 >= 0) y[(o0 + 1) * n * fo + d] = a1[p] + bias[o0 + 1];
                if (w2 >= 0) y[(o0 + 2) * n * fo + d] = a2[p] + bias[o0 + 2];
                if (w3 >= 0) y[(o0 + 3) * n * fo + d] = a3[p] + bias[o0 + 3];
            }
        }
    }

    function normSelu(y, c, len) {
        var s0 = c * len, sum = 0, i;
        for (i = s0; i < s0 + len; i++) sum += y[i];
        var mean = sum / len, v = 0;
        for (i = s0; i < s0 + len; i++) { var d = y[i] - mean; v += d * d; }
        var inv = 1 / Math.sqrt(v / len + 1e-5);
        for (i = s0; i < s0 + len; i++) {
            var z = (y[i] - mean) * inv;
            y[i] = z > 0 ? SELU_S * z : SELU_S * SELU_A * (Math.exp(z) - 1);
        }
    }

    /* The 240 CNN features of frames [t0, t1) of x (stride / offset per frame), into out (frames x 240). */
    function cnnWindow(W, pre, x, stride, offset, frames, t0, t1, out) {
        var a = Math.max(0, t0 - MARGIN), b = Math.min(frames, t1 + MARGIN), n = b - a, ch = 1, f = SPEC;
        var cur = new Float32Array(n * SPEC), acc = [new Float32Array(2048), new Float32Array(2048), new Float32Array(2048), new Float32Array(2048)];
        for (var t = 0; t < n; t++) cur.set(x.subarray((a + t) * stride + offset, (a + t) * stride + offset + SPEC), t * SPEC);
        for (var L = 0; L < LAYERS.length; L++) {
            var name = LAYERS[L][0], padF = LAYERS[L][1], poolK = LAYERS[L][2];
            var wt = W[pre + '.audio_feature_block.' + name + '.weight'], bias = W[pre + '.audio_feature_block.' + name + '.bias'].v;
            var outCh = wt.dims[0], fo = f + 2 * padF - 2, wp = f + 2 * padF, plane = (n + 2) * wp + 2;
            var xp = new Float32Array(ch * plane);
            for (var i = 0; i < ch; i++) for (var tt = 0; tt < n; tt++) xp.set(cur.subarray((i * n + tt) * f, (i * n + tt) * f + f), i * plane + (tt + 1) * wp + padF);
            var next;
            if (WA) {
                var wPtr = wasmArray(wt.v), bPtr = wasmArray(bias), mark = WA.top;
                var xpPtr = alloc(xp.length * 4), yPtr = alloc(outCh * n * fo * 4), offPtr = alloc(ch * 9 * 4), wpPtr = alloc(ch * 9 * 8 * 4);
                heap().set(xp, xpPtr >> 2);
                WA.ex.conv_group(xpPtr, ch, n, wp, plane, wPtr, bPtr, 0, outCh, yPtr, fo, 0, n, offPtr, wpPtr);
                next = heap().slice(yPtr >> 2, (yPtr >> 2) + outCh * n * fo);
                WA.top = mark;
            } else {
                next = new Float32Array(outCh * n * fo);
                for (var o = 0; o < outCh; o += 4) convGroup(xp, ch, n, wp, plane, wt.v, bias, o, Math.min(outCh, o + 4), next, fo, acc);
            }
            for (var c = 0; c < outCh; c++) normSelu(next, c, n * fo);
            ch = outCh; f = fo; cur = next;
            if (poolK > 1) {
                var fp = (f / poolK) | 0, pooled = new Float32Array(ch * n * fp);
                for (var c2 = 0; c2 < ch; c2++) for (var t2 = 0; t2 < n; t2++) {
                    var s = (c2 * n + t2) * f, d = (c2 * n + t2) * fp;
                    for (var j = 0; j < fp; j++) {
                        var m = cur[s + j * poolK];
                        for (var k = 1; k < poolK; k++) m = Math.max(m, cur[s + j * poolK + k]);
                        pooled[d + j] = m;
                    }
                }
                cur = pooled; f = fp;
            }
        }
        for (var t3 = t0; t3 < t1; t3++) for (var c3 = 0; c3 < ch; c3++) for (var j3 = 0; j3 < f; j3++) {
            out[t3 * CNN_OUT + c3 * f + j3] = cur[(c3 * n + (t3 - a)) * f + j3];
        }
    }

    function lstmDir(W, pre, feat, frames, sfx, h, off) {
        var wi = W[pre + '.lstm1.weight_ih_l0' + sfx].v, wh = W[pre + '.lstm1.weight_hh_l0' + sfx].v;
        var bi = W[pre + '.lstm1.bias_ih_l0' + sfx].v, bh = W[pre + '.lstm1.bias_hh_l0' + sfx].v;
        var G = 4 * HIDDEN, g = new Float32Array(G), hp = new Float32Array(HIDDEN), c = new Float32Array(HIDDEN), rev = sfx !== '';
        var gin = null;
        if (WA) {
            // the input part of the gates for all frames at once: W_ih x + b_ih + b_hh
            var bias = new Float32Array(G);
            for (var b0 = 0; b0 < G; b0++) bias[b0] = bi[b0] + bh[b0];
            var wP = wasmArray(wi), mark = WA.top, aP = alloc(feat.length * 4), bP = alloc(G * 4), cP = alloc(frames * G * 4);  // weights kept below the mark
            var hv = heap(); hv.set(feat, aP >> 2); hv.set(bias, bP >> 2);
            WA.ex.matmul_rows(aP, wP, bP, G, CNN_OUT, 0, frames, cP);
            gin = heap().slice(cP >> 2, (cP >> 2) + frames * G);
            WA.top = mark;
        }
        for (var step = 0; step < frames; step++) {
            var t = rev ? frames - 1 - step : step, xr = t * CNN_OUT;
            for (var k = 0; k < G; k++) {
                var s, r = k * CNN_OUT, j;
                if (gin) s = gin[t * G + k];
                else { s = bi[k] + bh[k]; for (j = 0; j < CNN_OUT; j++) s += wi[r + j] * feat[xr + j]; }
                var r2 = k * HIDDEN;
                for (j = 0; j < HIDDEN; j++) s += wh[r2 + j] * hp[j];
                g[k] = s;
            }
            for (var q = 0; q < HIDDEN; q++) {
                var ig = 1 / (1 + Math.exp(-g[q])), fg = 1 / (1 + Math.exp(-g[HIDDEN + q]));
                var gg = Math.tanh(g[2 * HIDDEN + q]), og = 1 / (1 + Math.exp(-g[3 * HIDDEN + q]));
                c[q] = fg * c[q] + ig * gg;
                hp[q] = og * Math.tanh(c[q]);
                h[t * 2 * HIDDEN + off + q] = hp[q];
            }
        }
    }

    /* Softmax outputs (frames x 100) of model pre ("m0".."m4"); windows of at most `win` frames, equal sizes. */
    function run(W, pre, x, frames, stride, offset, win) {
        win = win || 1000;
        var feat = new Float32Array(frames * CNN_OUT), parts = Math.max(1, Math.ceil(frames / win)), size = Math.ceil(frames / parts);
        for (var t = 0; t < frames; t += size) cnnWindow(W, pre, x, stride, offset, frames, t, Math.min(frames, t + size), feat);
        var h = new Float32Array(frames * 2 * HIDDEN);
        lstmDir(W, pre, feat, frames, '', h, 0);
        lstmDir(W, pre, feat, frames, '_reverse', h, HIDDEN);
        var fw = W[pre + '.final_fc1.weight'].v, fb = W[pre + '.final_fc1.bias'].v, out = new Float32Array(frames * 100);
        for (var f = 0; f < frames; f++) {
            var o = f * 100;
            for (var k = 0; k < 100; k++) {
                var s = fb[k];
                for (var j = 0; j < 2 * HIDDEN; j++) s += fw[k * 2 * HIDDEN + j] * h[f * 2 * HIDDEN + j];
                out[o + k] = s;
            }
            for (var sl = 0; sl < 6; sl++) {
                var a = o + SLICES[sl], e = o + SLICES[sl + 1], mx = out[a], sum = 0, i;
                for (i = a + 1; i < e; i++) mx = Math.max(mx, out[i]);
                for (i = a; i < e; i++) { out[i] = Math.exp(out[i] - mx); sum += out[i]; }
                for (i = a; i < e; i++) out[i] /= sum;
            }
        }
        return out;
    }

    root.ChordNet = { readWeights: readWeights, run: run, useWasm: useWasm, SPEC: SPEC, BIN_OFFSET: BIN_OFFSET, SLICES: SLICES };
})(typeof self !== 'undefined' ? self : globalThis);

/* The repository's XHMM decoder (no beats) and the chords as a page shows them; see ChordTable / NeuralChords in the app. */
(function (root) {
    'use strict';
    var SL = [0, 73, 86, 90, 94, 97, 100], PENALTY = 30;
    var NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    var QUALITY = { maj: 'maj', min: 'm', '7': '7', maj7: 'maj7', min7: 'm7', sus2: 'sus2', sus4: 'sus4', 'sus4(b7)': '7sus4', dim: 'dim', aug: 'aug',
        hdim7: 'm7b5', dim7: 'dim7', '9': '9', maj9: 'maj9', min9: 'm9', '11': '11', '13': '13' };
    var BASS = { '3': 4, b3: 3, '5': 7, b7: 10, '2': 2 };

    /* chords.json: [[name, [triad, bass, 7th, 9th, 11th, 13th]], ...] -> chord index per frame of the averaged outputs p */
    function decode(table, p, frames) {
        var K = table.length, obs = new Float64Array(K), dp = new Float64Array(K), nd = new Float64Array(K), pre = new Array(frames), c, f;
        function score(f) {
            var o = f * 100;
            for (c = 0; c < K; c++) {
                var a = table[c][1], s = Math.log(p[o + a[0]]);
                if (a[1] >= 0) s += Math.log(p[o + SL[1] + a[1]]);
                for (var i = 0; i < 4; i++) if (a[i + 2] >= 0) s += Math.log(p[o + SL[i + 2] + a[i + 2]]);
                obs[c] = s;
            }
        }
        function argmax(a) { var b = 0; for (var i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }
        score(0);
        for (c = 0; c < K; c++) dp[c] = c === 0 ? obs[0] : -Infinity;
        var best = argmax(dp);
        for (f = 1; f < frames; f++) {
            score(f);
            var diff = dp[best] - PENALTY, pr = pre[f] = new Int16Array(K);
            for (c = 0; c < K; c++) { var same = dp[c]; if (same > diff) { nd[c] = same + obs[c]; pr[c] = c; } else { nd[c] = diff + obs[c]; pr[c] = best; } }
            var t = dp; dp = nd; nd = t; best = argmax(dp);
        }
        var path = new Int32Array(frames); if (!frames) return path;
        path[frames - 1] = best;
        for (f = frames - 2; f >= 0; f--) path[f] = pre[f + 1][path[f + 1]];
        return path;
    }

    /* "A:min/b7" -> { r: 9, k: 'm', bass: 7 }; "N" -> r -1 */
    function parseName(name) {
        if (name === 'N' || name === 'X') return { r: -1, k: 'maj', bass: -1 };
        var parts = name.split(':'), root0 = parts[0], rest = parts[1] || 'maj', pc = NOTES[root0[0]];
        for (var i = 1; i < root0.length; i++) pc += root0[i] === '#' ? 1 : root0[i] === 'b' ? -1 : 0;
        pc = (pc + 12) % 12;
        var q = rest.split('/')[0], b = rest.indexOf('/') >= 0 ? BASS[rest.split('/')[1]] : undefined;
        return { r: pc, k: QUALITY[q] || 'maj', bass: b !== undefined ? (pc + b) % 12 : -1 };
    }

    /* chords from the path: no "no chord" before the first or after the last, one inside held by the chord before it */
    function toSegs(table, path, dt) {
        var out = [], start = 0;
        for (var f = 1; f <= path.length; f++) {
            if (f < path.length && path[f] === path[start]) continue;
            var n = parseName(table[path[start]][0]), t0 = start * dt, t1 = f * dt;
            start = f;
            if (n.r < 0) continue;
            var last = out[out.length - 1];
            if (last) last.t1 = t0;
            if (last && last.r === n.r && last.k === n.k) last.t1 = t1;
            else out.push({ r: n.r, k: n.k, t0: t0, t1: t1 });
        }
        return out;
    }

    root.ChordNet.decode = decode;
    root.ChordNet.parseName = parseName;
    root.ChordNet.toSegs = toSegs;
})(typeof self !== 'undefined' ? self : globalThis);
