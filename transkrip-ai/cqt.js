/* The input of the Chord-CNN-LSTM models: librosa 0.9.2's hybrid_cqt(y, sr=22050, hop_length=512, fmin=F#0, n_bins=288,
   bins_per_octave=36, tuning=None), re-implemented after librosa (ISC licence) and resampy (ISC licence); the same steps
   as CqtFeatures.kt in AYRI Studio Tools. Works in a page, a Worker and Node. */
(function (root) {
    'use strict';
    var SR = 22050, HOP = 512, BINS = 288, BPO = 36, HANN_BW = 1.50018310546875;
    var FMIN = 440 * Math.pow(2, (18 - 69) / 12);
    var KAISER_BEST = { zeros: 50, beta: 12.9846, rolloff: 0.917347, precision: 13 };
    var KAISER_FAST = { zeros: 24, beta: 9.90322, rolloff: 0.868212, precision: 9 };

    function makeFft(n) {
        var bits = 0; while ((1 << bits) < n) bits++;
        var rev = new Int32Array(n), cs = new Float64Array(n / 2), sn = new Float64Array(n / 2), i;
        for (i = 0; i < n; i++) { var r = 0, x = i; for (var b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
        for (i = 0; i < n / 2; i++) { cs[i] = Math.cos(2 * Math.PI * i / n); sn[i] = -Math.sin(2 * Math.PI * i / n); }
        return function (re, im) {
            var i, j, t;
            for (i = 0; i < n; i++) { j = rev[i]; if (j > i) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
            for (var size = 2; size <= n; size <<= 1) {
                var half = size >> 1, step = n / size;
                for (i = 0; i < n; i += size) {
                    for (j = i, k = 0; j < i + half; j++, k += step) {
                        var a = j + half, tr = re[a] * cs[k] - im[a] * sn[k], ti = re[a] * sn[k] + im[a] * cs[k];
                        re[a] = re[j] - tr; im[a] = im[j] - ti; re[j] += tr; im[j] += ti;
                    }
                }
            }
            var k;
        };
    }
    function log2(x) { return Math.log(x) / Math.LN2; }
    function alpha() { var r2 = Math.pow(2, 2 / BPO); return (r2 - 1) / (r2 + 1); }
    function besselI0(x) { var sum = 1, term = 1, q = x * x / 4; for (var k = 1; ; k++) { term *= q / (k * k); sum += term; if (term < sum * 1e-17) break; } return sum; }

    /* resampy.resample as librosa calls it: length ceil(n * ratio), scale divides by sqrt(ratio). Taps cached per phase. */
    function resample(x, srIn, srOut, flt, scale) {
        var ratio = srOut / srIn, len = x.length, bits = 1 << flt.precision, nTab = bits * flt.zeros, nWin = nTab + 1;
        var win = new Float64Array(nWin), delta = new Float64Array(nWin), i0b = besselI0(flt.beta), i;
        for (i = 0; i <= nTab; i++) {
            var u = i / nTab, t = flt.rolloff * flt.zeros * u, sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
            win[i] = flt.rolloff * sinc * besselI0(flt.beta * Math.sqrt(Math.max(0, 1 - u * u))) / i0b;
        }
        for (i = 0; i < nTab; i++) delta[i] = win[i + 1] - win[i];
        var sc = Math.min(1, ratio), step = Math.floor(sc * bits), inc = 1 / ratio;
        var nOut = Math.ceil(len * ratio), nRes = Math.floor(len * ratio), out = new Float32Array(nOut);
        function gcd(a, b) { return b ? gcd(b, a % b) : a; }
        var phases = (srIn === Math.round(srIn) && srOut === Math.round(srOut)) ? Math.round(srOut / gcd(srIn, srOut)) : 0;
        if (phases > 4096) phases = 0;
        var cacheL = [], cacheR = [];
        function taps(tr, n, right) {
            var frac = sc * (tr - n); if (right) frac = sc - frac;
            var idx = frac * bits, off = Math.floor(idx), eta = idx - off, m = Math.floor((nWin - off) / step), w = new Float64Array(m);
            for (var j = 0; j < m; j++) w[j] = win[off + j * step] + eta * delta[off + j * step];
            return w;
        }
        for (var t2 = 0; t2 < nRes; t2++) {
            var tr = t2 * inc, n = Math.floor(tr), ph = phases ? t2 % phases : -1;
            var lw = ph >= 0 ? (cacheL[ph] || (cacheL[ph] = taps(tr, n, false))) : taps(tr, n, false);
            var rw = ph >= 0 ? (cacheR[ph] || (cacheR[ph] = taps(tr, n, true))) : taps(tr, n, true);
            var s = 0, iMax = Math.min(n + 1, lw.length), kMax = Math.min(len - n - 1, rw.length), k;
            for (k = 0; k < iMax; k++) s += lw[k] * x[n - k];
            for (k = 0; k < kMax; k++) s += rw[k] * x[n + k + 1];
            out[t2] = s * sc;
        }
        if (scale) { var g = 1 / Math.sqrt(ratio); for (i = 0; i < nRes; i++) out[i] *= g; }
        return out;
    }

    function stft(y, nFft, hop, hann, each) {
        var len = y.length, frames = 1 + Math.floor(len / hop), fft = makeFft(nFft), re = new Float64Array(nFft), im = new Float64Array(nFft), i;
        var win = null; if (hann) { win = new Float64Array(nFft); for (i = 0; i < nFft; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / nFft); }
        for (var f = 0; f < frames; f++) {
            var s = f * hop - nFft / 2;
            for (i = 0; i < nFft; i++) { var k = s + i, v = (k >= 0 && k < len) ? y[k] : 0; re[i] = win ? v * win[i] : v; im[i] = 0; }
            fft(re, im);
            each(f, re, im);
        }
        return frames;
    }

    /* librosa's wavelet filters for freqs at sr, in the FFT domain, sparsified (quantile 0.01) */
    function filterFft(sr, freqs, hop, gain) {
        var q = 1 / alpha(), lengths = freqs.map(function (f) { return q * sr / f; }), maxL = Math.max.apply(null, lengths);
        var nFft = Math.pow(2, Math.ceil(log2(maxL))), maxLen = nFft;
        if (hop && nFft < Math.pow(2, 1 + Math.ceil(log2(hop)))) nFft = Math.pow(2, 1 + Math.ceil(log2(hop)));
        var fft = makeFft(nFft), half = nFft / 2 + 1;
        var rows = freqs.map(function (fq, b) {
            var ilen = lengths[b], start = Math.floor(-ilen / 2), end = Math.floor(ilen / 2), n = end - start;
            var re = new Float64Array(nFft), im = new Float64Array(nFft), lpad = Math.floor((maxLen - n) / 2), l1 = 0, i;
            var r0 = new Float64Array(n), i0 = new Float64Array(n);
            for (i = 0; i < n; i++) {
                var ph = (start + i) * 2 * Math.PI * fq / sr, w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
                r0[i] = Math.cos(ph) * w; i0[i] = Math.sin(ph) * w; l1 += Math.sqrt(r0[i] * r0[i] + i0[i] * i0[i]);
            }
            var s = ilen / nFft / l1;
            for (i = 0; i < n; i++) { re[lpad + i] = r0[i] * s; im[lpad + i] = i0[i] * s; }
            fft(re, im);
            var mag = new Float64Array(half), total = 0;
            for (i = 0; i < half; i++) { mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]); total += mag[i]; }
            var sorted = Float64Array.from(mag).sort(), cum = 0, j = 0;
            while (j < half) { cum += sorted[j] / total; if (cum >= 0.01) break; j++; }
            if (j >= half) j = 0;
            var thr = sorted[j], lo = 0, hi = half - 1;
            while (lo < half && mag[lo] < thr) lo++;
            while (hi > lo && mag[hi] < thr) hi--;
            var rr = new Float64Array(hi - lo + 1), ri = new Float64Array(hi - lo + 1);
            for (var k = lo; k <= hi; k++) if (mag[k] >= thr) { rr[k - lo] = re[k] * gain; ri[k - lo] = im[k] * gain; }
            return { lo: lo, re: rr, im: ri };
        });
        return { rows: rows, nFft: nFft };
    }

    function pseudoCqt(y, freqs) {
        var ff = filterFft(SR, freqs, HOP, 1), rows = ff.rows, nb = freqs.length, frames = 1 + Math.floor(y.length / HOP);
        var out = new Float32Array(frames * nb), norm = 1 / Math.sqrt(ff.nFft), mag = new Float64Array(ff.nFft / 2 + 1);
        var amag = rows.map(function (r) { var a = new Float64Array(r.re.length); for (var k = 0; k < a.length; k++) a[k] = Math.sqrt(r.re[k] * r.re[k] + r.im[k] * r.im[k]); return a; });
        stft(y, ff.nFft, HOP, true, function (f, re, im) {
            for (var k = 0; k < mag.length; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
            for (var b = 0; b < nb; b++) {
                var r = rows[b], a = amag[b], s = 0;
                for (var j = 0; j < a.length; j++) s += a[j] * mag[r.lo + j];
                out[f * nb + b] = s * norm;
            }
        });
        return { v: out, frames: frames };
    }

    function fullCqt(y0, freqs) {
        var nBins = freqs.length, nOct = Math.ceil(nBins / BPO), q = 1 / alpha(), cutoff = 0, i;
        freqs.forEach(function (f) { cutoff = Math.max(cutoff, f * (1 + 0.5 * HANN_BW / q)); });
        var y = y0, sr = SR, hop = HOP, nyq = SR / 2;
        if (cutoff < KAISER_FAST.rolloff * nyq) {
            var tz = 0; while (((HOP >> tz) & 1) === 0) tz++;
            var c1 = Math.max(0, Math.ceil(log2(KAISER_FAST.rolloff * nyq / cutoff)) - 2), c2 = Math.max(0, tz - nOct + 1), count = Math.min(c1, c2);
            if (count > 0) { var factor = 1 << count; hop /= factor; y = resample(y, factor, 1, KAISER_FAST, true); sr /= factor; }
        }
        var resp = [], my = y, mySr = sr, myHop = hop;
        for (i = 0; i < nOct; i++) {
            var hiB = nBins - BPO * i, loB = Math.max(0, nBins - BPO * (i + 1)), fo = freqs.slice(loB, hiB), nb = fo.length;
            var ff = filterFft(mySr, fo, 0, Math.sqrt(sr / mySr)), rows = ff.rows, frames = 1 + Math.floor(my.length / myHop), out = new Float32Array(frames * nb);
            stft(my, ff.nFft, myHop, false, function (f, re, im) {
                for (var b = 0; b < nb; b++) {
                    var r = rows[b], sre = 0, sim = 0;
                    for (var k = 0; k < r.re.length; k++) { var a = re[r.lo + k], c = im[r.lo + k]; sre += r.re[k] * a - r.im[k] * c; sim += r.re[k] * c + r.im[k] * a; }
                    out[f * nb + b] = Math.sqrt(sre * sre + sim * sim);
                }
            });
            resp.push({ v: out, frames: frames, nb: nb });
            if (myHop % 2 === 0 && i + 1 < nOct) { myHop /= 2; my = resample(my, 2, 1, KAISER_FAST, true); mySr /= 2; }
        }
        var frames2 = Math.min.apply(null, resp.map(function (r) { return r.frames; })), out2 = new Float32Array(frames2 * nBins), end = nBins;
        resp.forEach(function (r) { for (var f = 0; f < frames2; f++) out2.set(r.v.subarray(f * r.nb, f * r.nb + r.nb), f * nBins + end - r.nb); end -= r.nb; });
        for (var b = 0; b < nBins; b++) { var s = 1 / Math.sqrt(q * sr / freqs[b]); for (var f2 = 0; f2 < frames2; f2++) out2[f2 * nBins + b] *= s; }
        return { v: out2, frames: frames2 };
    }

    /* librosa.estimate_tuning(y, sr=22050, bins_per_octave=36), in fractions of a bin */
    function estimateTuning(y) {
        var nFft = 2048, half = nFft / 2 + 1, pitches = [], mags = [], s = new Float64Array(half);
        stft(y, nFft, 512, true, function (f, re, im) {
            var mx = 0, k;
            for (k = 0; k < half; k++) { s[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]); if (s[k] > mx) mx = s[k]; }
            var ref = 0.1 * mx;
            for (k = 1; k < half - 1; k++) {
                var fk = k * SR / nFft; if (fk < 150 || fk >= 4000) continue;
                var c = s[k] > ref ? s[k] : 0, l = s[k - 1] > ref ? s[k - 1] : 0, r = s[k + 1] > ref ? s[k + 1] : 0;
                if (!(c > l && c >= r)) continue;
                var avg = 0.5 * (s[k + 1] - s[k - 1]), sh = 2 * s[k] - s[k + 1] - s[k - 1];
                sh = avg / (sh + (Math.abs(sh) < 2.2250738585072014e-308 ? 1 : 0));
                var p = (k + sh) * SR / nFft;
                if (p > 0) { pitches.push(p); mags.push(s[k] + 0.5 * avg * sh); }
            }
        });
        if (!pitches.length) return 0;
        var sm = Float64Array.from(mags).sort(), n = sm.length, thr = n % 2 ? sm[(n - 1) / 2] : 0.5 * (sm[n / 2 - 1] + sm[n / 2]);
        var counts = new Int32Array(100);
        for (var i = 0; i < pitches.length; i++) {
            if (mags[i] < thr) continue;
            var res = (BPO * log2(pitches[i] / (440 / 16))) % 1; if (res < 0) res += 1; if (res >= 0.5) res -= 1;
            var b = Math.floor((res + 0.5) * 100 + 1e-9); if (b >= 100) b = 99; if (b >= 0) counts[b]++;
        }
        var best = 0; for (var j = 1; j < 100; j++) if (counts[j] > counts[best]) best = j;
        return -0.5 + best * 0.01;
    }

    /* frames x 288 magnitudes of mono y at 22050 Hz */
    function hybridCqt(y, tuning) {
        var tun = tuning === undefined || tuning === null ? estimateTuning(y) : tuning, fmin = FMIN * Math.pow(2, tun / BPO), q = 1 / alpha(), i;
        var freqs = []; for (i = 0; i < BINS; i++) freqs.push(fmin * Math.pow(2, i / BPO));
        var nPseudo = 0; freqs.forEach(function (f) { if (Math.pow(2, Math.ceil(log2(q * SR / f))) < 2 * HOP) nPseudo++; });
        var nFull = BINS - nPseudo, full = fullCqt(y, freqs.slice(0, nFull)), ps = pseudoCqt(y, freqs.slice(nFull));
        var frames = Math.min(full.frames, ps.frames), out = new Float32Array(frames * BINS);
        for (var f = 0; f < frames; f++) {
            out.set(full.v.subarray(f * nFull, f * nFull + nFull), f * BINS);
            out.set(ps.v.subarray(f * nPseudo, f * nPseudo + nPseudo), f * BINS + nFull);
        }
        return { v: out, frames: frames, tuning: tun };
    }

    root.CqtFeatures = { SR: SR, HOP: HOP, BINS: BINS, hybridCqt: hybridCqt, estimateTuning: estimateTuning, resample: resample, KAISER_BEST: KAISER_BEST };
})(typeof self !== 'undefined' ? self : globalThis);
