/* Noise gate untuk efek.html (AudioWorklet, berjalan di jalur audio browser).
   Sinyal di bawah ambang diredam supaya dengung/desis gitar hilang saat tidak dipetik;
   terbuka dalam ~1 ms saat senar dipetik, menutup pelan sesuai "lepas". */
class GerbangAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'ambang', defaultValue: -62, minValue: -100, maxValue: 0, automationRate: 'k-rate' },
            { name: 'lepas', defaultValue: 120, minValue: 5, maxValue: 2000, automationRate: 'k-rate' }
        ];
    }
    constructor() { super(); this.env = 0; this.g = 0; this.tahan = 0; }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0];
        if (!inp || !inp.length) { for (const ch of out) ch.fill(0); return true; }
        const buka = Math.pow(10, p.ambang[0] / 20), tutup = buka * 0.6;
        const naik = Math.exp(-1 / (sampleRate * 0.001)), turun = Math.exp(-1 / (sampleRate * p.lepas[0] / 1000));
        const envTurun = Math.exp(-1 / (sampleRate * 0.015)), lamaTahan = Math.round(sampleRate * 0.04);
        const n = inp[0].length;
        for (let i = 0; i < n; i++) {
            let x = 0;
            for (let c = 0; c < inp.length; c++) { const v = Math.abs(inp[c][i]); if (v > x) x = v; }
            this.env = x > this.env ? x : this.env * envTurun + x * (1 - envTurun);
            /* histeresis: buka di atas ambang, baru mulai menutup setelah di bawah 60% ambang */
            if (this.env > buka) this.tahan = lamaTahan;
            else if (this.env < tutup && this.tahan > 0) this.tahan--;
            const target = this.tahan > 0 ? 1 : 0;
            this.g = target + (this.g - target) * (target > this.g ? naik : turun);
            for (let c = 0; c < out.length; c++) out[c][i] = (inp[c] || inp[0])[i] * this.g;
        }
        return true;
    }
}
registerProcessor('ayri-gerbang', GerbangAyri);
