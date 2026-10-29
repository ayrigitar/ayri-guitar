/* Perantara AI untuk POS AYRI (Cloudflare Worker, gratis).
   Kunci Gemini disimpan sebagai Secret di Cloudflare (GEMINI_KEY), TIDAK PERNAH di situs atau di POS.
   Yang boleh memakai: perangkat POS yang tokennya bisa membuka repo data toko (owner & karyawan), dicek ke GitHub.
   Variabel (Settings → Variables and Secrets):
     GEMINI_KEY  (Secret)  kunci API dari Google AI Studio
     REPO_CEK    (Text)    repo yang harus bisa dibuka token POS, mis. ayrigitar/ayri-toko-data
     ORIGIN      (Text)    asal yang diizinkan, dipisah koma, mis. https://ayrigitar.com
     MODEL       (Text)    opsional, bawaan gemini-3.8-flash (nama model berubah-ubah: bila Google menolak, ganti lewat variabel ini tanpa menempel kode lagi)
   Permintaan: POST { sistem, prompt, maks } + header Authorization: Bearer <token POS>. Jawaban: { teks } atau { error }. */

const IZIN_LAMA = 10 * 60 * 1000; /* token yang sudah lolos cek disimpan (sebagai hash) 10 menit, supaya tidak tiap kali bertanya ke GitHub */
const lolos = new Map();

function jawab(isi, status, cors) { return new Response(JSON.stringify(isi), { status: status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors) }); }
async function sidik(teks) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
    return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
}
async function bolehPakai(token, env) {
    const k = await sidik(token), kini = Date.now(), t = lolos.get(k);
    if (t && kini - t < IZIN_LAMA) return true;
    const r = await fetch('https://api.github.com/repos/' + env.REPO_CEK, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'ayri-ai-worker' } });
    if (!r.ok) return false;
    lolos.set(k, kini);
    return true;
}

export default {
    async fetch(req, env) {
        const izin = String(env.ORIGIN || 'https://ayrigitar.com').split(',').map((s) => s.trim()).filter(Boolean);
        const asal = req.headers.get('Origin') || '';
        const cors = { 'Access-Control-Allow-Origin': izin.indexOf(asal) > -1 ? asal : izin[0], 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        if (req.method !== 'POST') return jawab({ error: 'Gunakan POST.' }, 405, cors);
        if (izin.indexOf(asal) < 0) return jawab({ error: 'Asal permintaan tidak diizinkan.' }, 403, cors);
        if (!env.GEMINI_KEY || !env.REPO_CEK) return jawab({ error: 'Perantara AI belum diatur (GEMINI_KEY / REPO_CEK).' }, 500, cors);
        const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
        if (!token || !(await bolehPakai(token, env))) return jawab({ error: 'Perangkat ini tidak berhak memakai AI. Buka POS dengan PIN dulu.' }, 403, cors);

        let b;
        try { b = await req.json(); } catch (e) { return jawab({ error: 'Permintaan tidak valid.' }, 400, cors); }
        const prompt = String(b && b.prompt || '').slice(0, 12000), sistem = String(b && b.sistem || '').slice(0, 4000);
        if (!prompt.trim()) return jawab({ error: 'Permintaan kosong.' }, 400, cors);
        const model = env.MODEL || 'gemini-3.8-flash', maks = Math.max(64, Math.min(4096, +(b && b.maks) || 1024));
        const lama = /^gemini-2\.5-flash/.test(model); /* hanya model 2.5-flash yang boleh dimatikan "berpikir"-nya; model lain: beri ruang ekstra supaya proses berpikir tidak memotong jawaban */
        const isi = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: Object.assign({ temperature: 0.7, maxOutputTokens: lama ? maks : maks + 2048 }, lama ? { thinkingConfig: { thinkingBudget: 0 } } : {})
        };
        if (sistem) isi.systemInstruction = { parts: [{ text: sistem }] };
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY }, body: JSON.stringify(isi)
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return jawab({ error: r.status === 429 ? 'Kuota AI gratis sedang habis. Coba lagi beberapa saat lagi.' : 'AI menolak permintaan: ' + ((d.error && d.error.message) || r.status) }, 502, cors);
        const c = (d.candidates || [])[0], teks = ((c && c.content && c.content.parts) || []).map((p) => p.text || '').join('').trim();
        if (!teks) return jawab({ error: 'AI tidak memberi jawaban. Coba lagi.' }, 502, cors);
        return jawab({ teks: teks }, 200, cors);
    }
};
