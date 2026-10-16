/* Pemroses audio efek.html (AudioWorklet, berjalan di jalur audio browser, per sampel).
   - ayri-gerbang : noise gate
   - ayri-tunda   : garis tunda bermodulasi untuk chorus, flanger, vibrato
   - ayri-phaser  : phaser (filter allpass bertingkat yang disapu LFO, dengan umpan balik)
   - ayri-rotary  : simulasi speaker berputar (horn + drum, efek doppler & volume, stereo)
   - ayri-autowah : envelope filter, frekuensi mengikuti kuat-lemah petikan
   - ayri-rekam   : meneruskan potongan suara ke halaman untuk direkam (WAV) */
const PI2 = Math.PI * 2;
function k(name, def, min, max) { return { name, defaultValue: def, minValue: min, maxValue: max, automationRate: 'k-rate' }; }
function mono(inp, i) { let x = 0; for (let c = 0; c < inp.length; c++) x += inp[c][i]; return inp.length ? x / inp.length : 0; }

/* garis tunda melingkar; baca(d) = sampel d langkah yang lalu (pecahan, interpolasi linear) */
class Tunda {
    constructor(n) { this.b = new Float32Array(n); this.i = 0; }
    tulis(x) { this.b[this.i] = x; this.i = (this.i + 1) % this.b.length; }
    baca(d) {
        const n = this.b.length; let p = this.i - d; while (p < 0) p += n;
        const i0 = Math.floor(p), f = p - i0;
        return this.b[i0 % n] * (1 - f) + this.b[(i0 + 1) % n] * f;
    }
}

class GerbangAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() { return [k('ambang', -62, -100, 0), k('lepas', 120, 5, 2000)]; }
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

/* chorus / flanger / vibrato: tunda dasar + sapuan LFO; kanal kanan bergeser fase (lebar stereo) */
class TundaAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [k('dasar', 14, 0.1, 40), k('dalam', 2, 0, 20), k('laju', 0.8, 0.01, 20), k('umpan', 0, -0.95, 0.95),
            k('basah', 0.5, 0, 1), k('kering', 1, 0, 1), k('lebar', 1, 0, 1)];
    }
    constructor() { super(); const n = Math.ceil(sampleRate * 0.08); this.g = [new Tunda(n), new Tunda(n)]; this.fase = 0; }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length;
        const dasar = p.dasar[0] * sampleRate / 1000, dalam = p.dalam[0] * sampleRate / 1000, langkah = PI2 * p.laju[0] / sampleRate;
        const fb = p.umpan[0], basah = p.basah[0], kering = p.kering[0], geser = Math.PI * p.lebar[0] * 0.5;
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0;
            this.fase += langkah; if (this.fase > PI2) this.fase -= PI2;
            for (let c = 0; c < out.length; c++) {
                const g = this.g[c] || this.g[0];
                const d = Math.max(1, dasar + dalam * (0.5 + 0.5 * Math.sin(this.fase + c * geser)));
                const y = g.baca(d); g.tulis(x + y * fb);
                out[c][i] = x * kering + y * basah;
            }
        }
        return true;
    }
}
registerProcessor('ayri-tunda', TundaAyri);

/* phaser: 4-8 allpass orde satu, frekuensi disapu eksponensial 200 Hz - 4 kHz */
class PhaserAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() { return [k('laju', 0.5, 0.01, 10), k('dalam', 0.7, 0, 1), k('umpan', 0.4, 0, 0.9), k('campur', 1, 0, 1), k('tahap', 4, 2, 8)]; }
    constructor() { super(); this.fase = 0; this.s = [new Float32Array(16), new Float32Array(16)]; this.akhir = [0, 0]; this.a = [0, 0]; }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length, tahap = Math.round(p.tahap[0]);
        const langkah = PI2 * p.laju[0] / sampleRate, dalam = p.dalam[0], fb = p.umpan[0], m = p.campur[0];
        const fmin = 200, fmax = 200 + 3800 * dalam;
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0;
            this.fase += langkah; if (this.fase > PI2) this.fase -= PI2;
            for (let c = 0; c < out.length && c < 2; c++) {
                if ((i & 15) === 0) {
                    const f = fmin * Math.pow(fmax / fmin, 0.5 + 0.5 * Math.sin(this.fase + c * Math.PI / 2)), t = Math.tan(Math.PI * Math.min(f, sampleRate * 0.45) / sampleRate);
                    this.a[c] = (t - 1) / (t + 1);
                }
                const a = this.a[c], st = this.s[c];
                let v = x + this.akhir[c] * fb;
                for (let j = 0; j < tahap; j++) { const y = a * v + st[2 * j] - a * st[2 * j + 1]; st[2 * j] = v; st[2 * j + 1] = y; v = y; }
                this.akhir[c] = v;
                out[c][i] = (x * (1 - 0.5 * m) + v * 0.5 * m) * (1 + 0.2 * m);
            }
        }
        return true;
    }
}
registerProcessor('ayri-phaser', PhaserAyri);

/* speaker berputar: horn (nada tinggi, cepat) dan drum (nada rendah, lebih lambat), kecepatan berubah dengan inersia */
class RotaryAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() { return [k('cepat', 0, 0, 1), k('dalam', 0.7, 0, 1), k('campur', 1, 0, 1)]; }
    constructor() {
        super(); const n = Math.ceil(sampleRate * 0.01);
        this.th = [new Tunda(n), new Tunda(n)]; this.td = [new Tunda(n), new Tunda(n)];
        this.fh = 0; this.fd = 0; this.vh = 0.8; this.vd = 0.67; this.lp = 0;
    }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length, cepat = p.cepat[0] > 0.5, dalam = p.dalam[0], m = p.campur[0];
        const tH = cepat ? 6.8 : 0.8, tD = cepat ? 5.9 : 0.67, aH = Math.exp(-1 / (sampleRate * 0.8)), aD = Math.exp(-1 / (sampleRate * 3));
        const kLp = 1 - Math.exp(-PI2 * 800 / sampleRate), ms = sampleRate / 1000;
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0;
            this.vh = tH + (this.vh - tH) * aH; this.vd = tD + (this.vd - tD) * aD;
            this.fh += PI2 * this.vh / sampleRate; if (this.fh > PI2) this.fh -= PI2;
            this.fd += PI2 * this.vd / sampleRate; if (this.fd > PI2) this.fd -= PI2;
            this.lp += kLp * (x - this.lp);
            const rendah = this.lp, tinggi = x - this.lp;
            for (let c = 0; c < out.length && c < 2; c++) {
                const posH = this.fh + c * Math.PI / 2, posD = this.fd + c * Math.PI / 2;
                this.th[c].tulis(tinggi); this.td[c].tulis(rendah);
                const h = this.th[c].baca(1 + (0.25 + 0.25 * Math.sin(posH)) * ms * dalam * 2) * (1 - dalam * 0.5 * (1 - Math.cos(posH)));
                const d = this.td[c].baca(1 + (0.15 + 0.15 * Math.sin(posD)) * ms * dalam * 2) * (1 - dalam * 0.3 * (1 - Math.cos(posD)));
                out[c][i] = x * (1 - m) + (h + d) * m * 1.35;
            }
        }
        return true;
    }
}
registerProcessor('ayri-rotary', RotaryAyri);

/* envelope filter: filter state-variable; frekuensi naik (atau turun) mengikuti kekuatan petikan */
class AutowahAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [k('peka', 0.6, 0, 1), k('bawah', 300, 50, 2000), k('atas', 2500, 300, 8000), k('q', 4, 0.5, 20), k('campur', 1, 0, 1), k('arah', 1, -1, 1)];
    }
    constructor() { super(); this.env = 0; this.ic1 = 0; this.ic2 = 0; this.a1 = 0; this.a2 = 0; this.a3 = 0; }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length;
        const peka = 2 + p.peka[0] * 40, lo = p.bawah[0], hi = Math.max(lo + 50, p.atas[0]), kq = 1 / p.q[0], m = p.campur[0], turun = p.arah[0] < 0;
        const naik = Math.exp(-1 / (sampleRate * 0.003)), lepas = Math.exp(-1 / (sampleRate * 0.12));
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0, v = Math.abs(x);
            this.env = v > this.env ? v + (this.env - v) * naik : v + (this.env - v) * lepas;
            if ((i & 15) === 0) {
                let e = Math.min(1, this.env * peka); if (turun) e = 1 - e;
                const f = lo * Math.pow(hi / lo, e), g = Math.tan(Math.PI * Math.min(f, sampleRate * 0.45) / sampleRate);
                this.a1 = 1 / (1 + g * (g + kq)); this.a2 = g * this.a1; this.a3 = g * this.a2;
            }
            const v3 = x - this.ic2, v1 = this.a1 * this.ic1 + this.a2 * v3, v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
            this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
            /* bandpass dinormalkan (puncak = 1 berapa pun resonansinya) supaya volume tidak melonjak */
            const y = v1 * kq * 1.4 + v2 * 0.2;
            const o = x * (1 - m) + y * m;
            for (let c = 0; c < out.length; c++) out[c][i] = o;
        }
        return true;
    }
}
registerProcessor('ayri-autowah', AutowahAyri);

/* perekam: saat aktif, kumpulan 128 sampel per kanal dikirim ke halaman (dikumpulkan jadi WAV di sana) */
class RekamAyri extends AudioWorkletProcessor {
    constructor() {
        super(); this.on = false; this.kumpul = [[], []]; this.isi = 0;
        this.port.onmessage = (e) => { this.on = !!e.data.rekam; if (!this.on) this.kirim(); };
    }
    kirim() {
        if (!this.isi) return;
        const ch = this.kumpul.map((a) => { const r = new Float32Array(this.isi); let o = 0; for (const b of a) { r.set(b, o); o += b.length; } return r; });
        this.port.postMessage(ch, ch.map((c) => c.buffer));
        this.kumpul = [[], []]; this.isi = 0;
    }
    process(inputs, outputs) {
        const inp = inputs[0], out = outputs[0];
        if (inp && inp.length) for (let c = 0; c < out.length; c++) out[c].set(inp[c] || inp[0]);
        if (this.on && inp && inp.length) {
            this.kumpul[0].push(inp[0].slice()); this.kumpul[1].push((inp[1] || inp[0]).slice()); this.isi += inp[0].length;
            if (this.isi >= 8192) this.kirim();
        }
        return true;
    }
}
registerProcessor('ayri-rekam', RekamAyri);
