/* Pemroses audio efek.html (AudioWorklet, berjalan di jalur audio browser, per sampel).
   - ayri-gerbang : noise gate
   - ayri-tunda   : garis tunda bermodulasi untuk chorus, flanger, vibrato
   - ayri-phaser  : phaser (filter allpass bertingkat yang disapu LFO, dengan umpan balik)
   - ayri-rotary  : simulasi speaker berputar (horn + drum, efek doppler & volume, stereo)
   - ayri-autowah : envelope filter, frekuensi mengikuti kuat-lemah petikan
   - ayri-rekam   : meneruskan potongan suara ke halaman untuk direkam (WAV)
   - tahap 3 (nada): ayri-oktaf, ayri-geser, ayri-harmoni, ayri-synth (lihat bagian bawah) */
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

/* ===================== tahap 3: nada (eksperimen) =====================
   ayri-oktaf   : octaver gaya analog (pembagi frekuensi) + oktaf atas (penyearah)
   ayri-geser   : pitch shifter dua ketukan tunda bergantian (bisa untuk chord)
   ayri-harmoni : harmonizer; nada dideteksi, harmoni mengikuti kunci & tangga nada
   ayri-synth   : synth yang mengikuti nada & kuat-lemah petikan gitar */

/* pendeteksi nada YIN pada sinyal yang diturunkan 4x (12 kHz) supaya ringan; satu nada (monofonik), 70-1300 Hz */
class Deteksi {
    constructor(sr) {
        this.fs = sr / 4; this.minLag = Math.max(2, Math.floor(this.fs / 1300)); this.maxLag = Math.ceil(this.fs / 70); this.W = Math.ceil(this.fs * 0.022);
        this.n = this.W + this.maxLag + 2; this.ring = new Float32Array(this.n); this.buf = new Float32Array(this.n); this.d = new Float32Array(this.maxLag + 2);
        this.ri = 0; this.isi = 0; this.lp1 = 0; this.lp2 = 0; this.acc = 0; this.k = 0; this.langkah = 0; this.hz = 0; this.yakin = 0;
    }
    push(x) {
        this.lp1 += 0.3 * (x - this.lp1); this.lp2 += 0.3 * (this.lp1 - this.lp2); this.acc += this.lp2;
        if (++this.k < 4) return;
        this.k = 0; this.ring[this.ri] = this.acc / 4; this.acc = 0; this.ri = (this.ri + 1) % this.n;
        if (this.isi < this.n) this.isi++;
        if (++this.langkah >= 64 && this.isi >= this.n) { this.langkah = 0; this.hitung(); }
    }
    hitung() {
        const n = this.n, b = this.buf, W = this.W, d = this.d, maks = this.maxLag;
        for (let i = 0; i < n; i++) b[i] = this.ring[(this.ri + i) % n];
        let e = 0; for (let i = n - W; i < n; i++) e += b[i] * b[i];
        if (e / W < 1e-7) { this.yakin = 0; return; }
        const o = n - W - maks; let jumlah = 0, pilih = -1; d[0] = 1;
        for (let t = 1; t <= maks; t++) {
            let s = 0; for (let j = 0; j < W; j++) { const v = b[o + j] - b[o + j + t]; s += v * v; }
            jumlah += s; d[t] = jumlah > 0 ? s * t / jumlah : 1;
        }
        for (let t = this.minLag; t < maks; t++) if (d[t] < 0.15) { while (t + 1 < maks && d[t + 1] < d[t]) t++; pilih = t; break; }
        if (pilih < 1) { this.yakin = 0; return; }
        const a = d[pilih - 1], c = d[pilih], z = d[pilih + 1], den = a - 2 * c + z;
        this.hz = this.fs / (pilih + (den ? 0.5 * (a - z) / den : 0)); this.yakin = 1 - c;
    }
}
/* penggeser nada: dua ketukan tunda bergerak dengan laju = rasio nada, bergantian dengan crossfade.
   Bila periode nada diketahui (not tunggal), panjang jendela dibuat kelipatan periode itu supaya saat ketukan
   melompat fasenya tetap menyambung (tanpa getar); untuk chord dipakai jendela tetap. */
class Penggeser {
    constructor(sr, ms) { this.W0 = Math.round(sr * ms / 1000); this.W = this.W0; this.g = new Tunda(this.W0 * 2 + 8); this.dA = 2; this.dB = 2 + this.W0 / 2; }
    aturPeriode(T) { this.W = T > 4 ? Math.min(this.W0 * 2, Math.max(2 * T, Math.round(this.W0 / (2 * T)) * 2 * T)) : this.W0; }
    proses(x, r) {
        this.g.tulis(x);
        const dd = 1 - r, W = this.W;
        this.dA += dd; this.dB += dd;
        if (this.dA < 2) this.dA += W; else if (this.dA > 2 + W) this.dA -= W;
        if (this.dB < 2) this.dB += W; else if (this.dB > 2 + W) this.dB -= W;
        const pa = Math.min(1, Math.max(0, (this.dA - 2) / W)), pb = Math.min(1, Math.max(0, (this.dB - 2) / W));
        const ga = Math.sin(Math.PI * pa), gb = Math.sin(Math.PI * pb), wa = ga * ga, wb = gb * gb, jml = wa + wb || 1;
        return (this.g.baca(this.dA) * wa + this.g.baca(this.dB) * wb) / jml;
    }
}
function ikut(env, v, naik, turun) { return v > env ? v + (env - v) * naik : v + (env - v) * turun; }

class OktafAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() { return [k('bawah1', 0.8, 0, 1), k('bawah2', 0, 0, 1), k('atas', 0, 0, 1), k('asli', 0.7, 0, 1)]; }
    constructor() {
        super(); this.a = 0; this.b = 0; this.tinggi = false; this.f1 = 1; this.f2 = 1; this.env = 0;
        this.s1a = 0; this.s1b = 0; this.s2a = 0; this.s2b = 0; this.hx = 0; this.hy = 0;
        this.kD = 1 - Math.exp(-PI2 * 700 / sampleRate); this.kS = 1 - Math.exp(-PI2 * 500 / sampleRate); this.kS2 = 1 - Math.exp(-PI2 * 300 / sampleRate);
        this.naik = Math.exp(-1 / (sampleRate * 0.001)); this.turun = Math.exp(-1 / (sampleRate * 0.08));
    }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length, b1 = p.bawah1[0] * 1.3, b2 = p.bawah2[0] * 1.3, at = p.atas[0] * 1.5, as = p.asli[0];
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0;
            this.a += this.kD * (x - this.a); this.b += this.kD * (this.a - this.b);
            this.env = ikut(this.env, Math.abs(x), this.naik, this.turun);
            /* pembagi: tiap puncak naik membalik flip-flop pertama (f/2); flip-flop kedua mengikuti yang pertama (f/4) */
            const h = this.env * 0.15 + 1e-4;
            if (!this.tinggi && this.b > h) { this.tinggi = true; this.f1 = -this.f1; if (this.f1 > 0) this.f2 = -this.f2; }
            else if (this.tinggi && this.b < -h) this.tinggi = false;
            this.s1a += this.kS * (this.f1 * this.env - this.s1a); this.s1b += this.kS * (this.s1a - this.s1b);
            this.s2a += this.kS2 * (this.f2 * this.env - this.s2a); this.s2b += this.kS2 * (this.s2a - this.s2b);
            const r = Math.abs(x), y = r - this.hx + 0.995 * this.hy; this.hx = r; this.hy = y;
            const o = x * as + this.s1b * b1 + this.s2b * b2 + y * at;
            for (let c = 0; c < out.length; c++) out[c][i] = o;
        }
        return true;
    }
}
registerProcessor('ayri-oktaf', OktafAyri);

class GeserAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() { return [k('semi', 12, -24, 24), k('sen', 0, -100, 100), k('campur', 0.4, 0, 1)]; }
    constructor() { super(); this.g = new Penggeser(sampleRate, 40); this.det = new Deteksi(sampleRate); this.hitungan = 0; }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length, r = Math.pow(2, (p.semi[0] + p.sen[0] / 100) / 12), m = p.campur[0];
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0;
            this.det.push(x);
            if (++this.hitungan >= 256) { this.hitungan = 0; this.g.aturPeriode(this.det.yakin > 0.8 ? sampleRate / this.det.hz : 0); }
            const o = x * (1 - m) + this.g.proses(x, r) * m;
            for (let c = 0; c < out.length; c++) out[c][i] = o;
        }
        return true;
    }
}
registerProcessor('ayri-geser', GeserAyri);

const TANGGA = [[0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]];
class HarmoniAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() { return [k('kunci', 0, 0, 11), k('minor', 0, 0, 1), k('langkah', 2, -7, 7), k('campur', 0.6, 0, 1)]; }
    constructor() { super(); this.det = new Deteksi(sampleRate); this.g = new Penggeser(sampleRate, 40); this.r = 1; this.target = 0; this.hitungan = 0; this.awal = true; }
    /* interval (semiton) dari nada m ke nada harmoni: langkah tangga nada dari derajat terdekat */
    interval(m, kunci, tg, langkah) {
        const rel = ((Math.round(m) - kunci) % 12 + 12) % 12;
        let der = 0; for (let i = 0; i < 7; i++) if (tg[i] <= rel) der = i;
        const t = der + langkah, okt = Math.floor(t / 7), idx = ((t % 7) + 7) % 7;
        return tg[idx] + 12 * okt - tg[der];
    }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length, m = p.campur[0], tg = TANGGA[p.minor[0] > 0.5 ? 1 : 0];
        const kunci = Math.round(p.kunci[0]), langkah = Math.round(p.langkah[0]);
        if (this.awal) { this.awal = false; this.target = Math.pow(2, this.interval(kunci, kunci, tg, langkah) / 12); this.r = this.target; }
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0;
            this.det.push(x);
            if (++this.hitungan >= 64) {
                this.hitungan = 0;
                if (this.det.yakin > 0.8 && this.det.hz > 0) {
                    this.target = Math.pow(2, this.interval(69 + 12 * Math.log2(this.det.hz / 440), kunci, tg, langkah) / 12);
                    this.g.aturPeriode(sampleRate / this.det.hz);
                } else this.g.aturPeriode(0);
            }
            this.r += (this.target - this.r) * 0.003;
            const o = x * (1 - 0.3 * m) + this.g.proses(x, this.r) * 0.7 * m;
            for (let c = 0; c < out.length; c++) out[c][i] = o;
        }
        return true;
    }
}
registerProcessor('ayri-harmoni', HarmoniAyri);

function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
class SynthAyri extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [k('bentuk', 0, 0, 2), k('oktaf', 0, -2, 1), k('cutoff', 1500, 80, 10000), k('reso', 0.4, 0, 1), k('amplop', 0.5, 0, 1), k('glide', 30, 0, 500), k('campur', 0.7, 0, 1)];
    }
    constructor() {
        super(); this.det = new Deteksi(sampleRate); this.fase = 0; this.hz = 0; this.target = 0; this.env = 0; this.ic1 = 0; this.ic2 = 0; this.a1 = 0; this.a2 = 0; this.a3 = 0;
        this.naik = Math.exp(-1 / (sampleRate * 0.004)); this.turun = Math.exp(-1 / (sampleRate * 0.25));
    }
    process(inputs, outputs, p) {
        const inp = inputs[0], out = outputs[0], n = out[0].length, bentuk = Math.round(p.bentuk[0]), kali = Math.pow(2, Math.round(p.oktaf[0])), m = p.campur[0];
        const gk = 1 - Math.exp(-1 / (sampleRate * Math.max(0.001, p.glide[0] / 1000))), kq = 2 - 1.85 * p.reso[0], amplop = p.amplop[0], dasar = p.cutoff[0];
        for (let i = 0; i < n; i++) {
            const x = inp && inp.length ? mono(inp, i) : 0;
            this.det.push(x);
            this.env = ikut(this.env, Math.abs(x), this.naik, this.turun);
            if (this.det.yakin > 0.8 && this.det.hz > 0) { this.target = this.det.hz * kali; if (!this.hz) this.hz = this.target; }
            if (this.target) this.hz += (this.target - this.hz) * gk;
            const dt = Math.min(0.45, this.hz / sampleRate);
            this.fase += dt; if (this.fase >= 1) this.fase -= 1;
            let osc;
            if (bentuk === 0) osc = 2 * this.fase - 1 - blep(this.fase, dt);
            else if (bentuk === 1) osc = (this.fase < 0.5 ? 1 : -1) + blep(this.fase, dt) - blep((this.fase + 0.5) % 1, dt);
            else osc = Math.sin(PI2 * this.fase);
            const a = this.target ? Math.min(1, this.env * 4) : 0;
            if ((i & 15) === 0) {
                const fc = Math.min(sampleRate * 0.45, dasar * (1 + amplop * 6 * a)), g = Math.tan(Math.PI * fc / sampleRate);
                this.a1 = 1 / (1 + g * (g + kq)); this.a2 = g * this.a1; this.a3 = g * this.a2;
            }
            const v3 = osc - this.ic2, v1 = this.a1 * this.ic1 + this.a2 * v3, v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
            this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
            const o = x * (1 - m) + v2 * a * 0.45 * m;
            for (let c = 0; c < out.length; c++) out[c][i] = o;
        }
        return true;
    }
}
registerProcessor('ayri-synth', SynthAyri);
