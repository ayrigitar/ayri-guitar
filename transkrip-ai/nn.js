/* Deteksi chord dengan jaringan saraf Chord-CNN-LSTM (Jiang dkk., ISMIR 2019, lisensi MIT; lihat README.md di folder ini).
   TranskripAI.chords(channels, sampleRate, onProgress) -> Promise<[{r, k, t0, t1}] | null>
   Semua dihitung di perangkat dengan beberapa Worker; null bila browser tidak mendukung atau terjadi galat, dan halaman
   memakai deteksi lama. Hasilnya diukur pada 200 lagu uji (GuitarSet dan AAM): lihat README.md. */
(function (root) {
    'use strict';
    var BASE = (function () { var s = document.currentScript; return s ? s.src.replace(/[^/]*$/, '') : 'transkrip-ai/'; })();
    var MODELS = 5;
    var table = null;

    /* banyak Worker: tiap Worker memegang beberapa model; HP dengan memori kecil memakai lebih sedikit */
    function workerCount() {
        var cores = navigator.hardwareConcurrency || 2, mem = navigator.deviceMemory || 4;
        var n = Math.max(1, Math.min(MODELS, cores - 1));
        if (mem <= 2) n = 1; else if (mem <= 4) n = Math.min(n, 2);
        return n;
    }

    function ask(w, msg, transfer, onProgress) {
        return new Promise(function (ok, fail) {
            w.onmessage = function (e) {
                if (e.data.progress !== undefined) { if (onProgress) onProgress(); return; }
                if (e.data.ok) ok(e.data); else fail(new Error(e.data.error || 'worker'));
            };
            w.onerror = function (e) { fail(new Error(e.message || 'worker')); };
            w.postMessage(msg, transfer || []);
        });
    }

    function chords(channels, sr, onProgress) {
        if (typeof Worker === 'undefined' || typeof WebAssembly !== 'object') return Promise.resolve(null);
        var n = channels[0].length, y = new Float32Array(n), i;
        if (channels.length > 1) { var a = channels[0], b = channels[1]; for (i = 0; i < n; i++) y[i] = 0.5 * (a[i] + b[i]); }
        else y.set(channels[0]);
        var nw = workerCount(), workers = [], done = 0;
        for (i = 0; i < nw; i++) workers.push(new Worker(BASE + 'worker.js'));
        function stop() { workers.forEach(function (w) { w.terminate(); }); }
        var tbl = table ? Promise.resolve(table) : fetch(BASE + 'chords.json').then(function (r) { return r.json(); }).then(function (t) { table = t; return t; });
        if (onProgress) onProgress(0.05);
        return ask(workers[0], { cmd: 'cqt', y: y, sr: sr }, [y.buffer]).then(function (c) {
            if (onProgress) onProgress(0.2);
            var jobs = workers.map(function (w, k) {
                var ms = []; for (var m = k; m < MODELS; m += nw) ms.push(m);
                return ask(w, { cmd: 'models', cqt: c.cqt, frames: c.frames, m: ms }, null, function () { done++; if (onProgress) onProgress(0.2 + 0.75 * done / MODELS); });
            });
            return Promise.all([Promise.all(jobs), tbl]).then(function (r) {
                var avg = new Float32Array(c.frames * 100);
                r[0].forEach(function (res) { for (var j = 0; j < avg.length; j++) avg[j] += res.sum[j] / MODELS; });
                var segs = ChordNet.toSegs(r[1], ChordNet.decode(r[1], avg, c.frames), 512 / 22050);
                stop();
                if (onProgress) onProgress(1);
                return segs;
            });
        }).catch(function (err) { stop(); if (root.console) console.warn('Deteksi chord AI tidak jalan, memakai cara lama:', err); return null; });
    }

    root.TranskripAI = { chords: chords };
})(window);
