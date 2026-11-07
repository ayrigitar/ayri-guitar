/* Worker untuk deteksi chord dengan jaringan saraf (lihat nn.js). Pesan:
   {cmd:'cqt', y, sr}            -> {cqt, frames}: suara mono -> 22.050 Hz -> CQT 288 bin (seperti librosa)
   {cmd:'models', cqt, frames, m} -> {sum}: jumlah keluaran model-model m (daftar nomor 0..4)
   Bobot model (cnnlstm.bin) dan kernel WebAssembly (chordnet.wasm) baru diunduh saat dipakai pertama kali. */
importScripts('cqt.js', 'chordnet.js');
var siap = null;
function muat() {
    if (siap) return siap;
    siap = Promise.all([
        fetch('cnnlstm.bin').then(function (r) { if (!r.ok) throw new Error('bobot model ' + r.status); return r.arrayBuffer(); }),
        typeof WebAssembly === 'object'
            ? fetch('chordnet.wasm').then(function (r) { return r.arrayBuffer(); }).then(function (b) {
                var mem = new WebAssembly.Memory({ initial: 256 });
                return WebAssembly.instantiate(b, { env: { memory: mem } }).then(function (res) { return { inst: res.instance, mem: mem }; });
            }).catch(function () { return null; }) /* tanpa SIMD: tetap jalan, hanya lebih lambat */
            : Promise.resolve(null)
    ]).then(function (r) {
        if (r[1]) ChordNet.useWasm(r[1].inst, r[1].mem);
        return ChordNet.readWeights(r[0]);
    });
    return siap;
}
onmessage = function (e) {
    var d = e.data;
    if (d.cmd === 'cqt') {
        try {
            var y = d.sr === CqtFeatures.SR ? d.y : CqtFeatures.resample(d.y, d.sr, CqtFeatures.SR, CqtFeatures.KAISER_BEST, false);
            var c = CqtFeatures.hybridCqt(y);
            postMessage({ ok: true, cqt: c.v, frames: c.frames }, [c.v.buffer]);
        } catch (err) { postMessage({ ok: false, error: String(err && err.message || err) }); }
    } else if (d.cmd === 'models') {
        muat().then(function (W) {
            var sum = new Float32Array(d.frames * 100);
            d.m.forEach(function (m) {
                var p = ChordNet.run(W, 'm' + m, d.cqt, d.frames, CqtFeatures.BINS, ChordNet.BIN_OFFSET, 1000);
                for (var i = 0; i < sum.length; i++) sum[i] += p[i];
                postMessage({ progress: m });
            });
            postMessage({ ok: true, sum: sum }, [sum.buffer]);
        }).catch(function (err) { postMessage({ ok: false, error: String(err && err.message || err) }); });
    }
};
