/* Perantara AI untuk POS AYRI (Cloudflare Worker, gratis).
   Kunci AI disimpan sebagai Secret di Cloudflare, TIDAK PERNAH di situs atau di POS.
   Penyedia dicoba berurutan: Groq (cepat, kuota gratis longgar) lalu Gemini sebagai cadangan; yang kuncinya kosong dilewati.
   Yang boleh memakai: perangkat POS yang tokennya bisa membuka repo data toko (owner & karyawan), dicek ke GitHub.
   Variabel (Settings → Variables and Secrets):
     GROQ_KEY           (Secret)  kunci API dari console.groq.com            (disarankan, utama)
     GEMINI_KEY         (Secret)  kunci API dari Google AI Studio            (opsional, cadangan)
     REPO_CEK           (Text)    repo yang harus bisa dibuka token POS, mis. ayrigitar/ayri-toko-data
     ORIGIN             (Text)    asal yang diizinkan, dipisah koma, mis. https://ayrigitar.com
     GROQ_MODEL         (Text)    opsional; kosong = Worker memilih sendiri model chat terbaik yang tersedia untuk kunci Groq Anda
     GROQ_VISION_MODEL  (Text)    opsional; kosong = Worker memilih sendiri model Groq yang bisa membaca gambar
     MODEL              (Text)    opsional, model Gemini, bawaan gemini-3.8-flash
   Nama model sering berubah: bila penyedia menolak nama model, ganti lewat variabel di atas tanpa menempel kode lagi.
   Permintaan: POST { sistem, prompt, maks, gambar?: ["data:image/jpeg;base64,...", ...] } + header Authorization: Bearer <token POS>.
   Jawaban: { teks, catatan? } atau { error }. Bila foto tidak bisa dibaca penyedia mana pun, jawaban dibuat dari teks saja dan diberi catatan. */

const IZIN_LAMA = 10 * 60 * 1000; /* token yang sudah lolos cek disimpan (sebagai hash) 10 menit, supaya tidak tiap kali bertanya ke GitHub */
const lolos = new Map();
const BATAS_WAKTU = 25000; /* jangan menunggu lebih dari 25 detik: lebih baik pindah ke penyedia berikutnya */
const MAKS_GAMBAR = 4, MAKS_GAMBAR_PANJANG = 2200000; /* karakter base64 per gambar (±1,6 MB) */
const POLA_GAMBAR = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

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

async function kirim(url, op) {
    let r;
    try { r = await fetch(url, Object.assign({ signal: AbortSignal.timeout(BATAS_WAKTU) }, op)); }
    catch (e) { throw new Error(e && e.name === 'TimeoutError' ? 'terlalu lama menjawab' : 'tidak bisa dihubungi'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((r.status === 429 ? 'kuota 429 ' : r.status + ' ') + ((d.error && (d.error.message || d.error)) || ''));
    return d;
}

/* Groq: format OpenAI (chat completions). Nama model sering berganti, jadi bila GROQ_MODEL kosong Worker menanyakan daftar model yang
   tersedia untuk kunci ini dan memilih model chat terbaik (utamakan keluarga llama 70b, lalu gpt-oss, lalu lainnya); pilihan diingat sementara.
   Untuk permintaan dengan gambar dipilih model yang bisa membaca gambar (llama-4 scout/maverick, "vision", pixtral, qwen-vl). */
let modelGroq = null, modelGroqGambar = null;
async function daftarModelGroq(env) {
    const d = await kirim('https://api.groq.com/openai/v1/models', { method: 'GET', headers: { Authorization: 'Bearer ' + env.GROQ_KEY } });
    return (d.data || []).filter((m) => m.active !== false).map((m) => String(m.id)).filter((id) => !/whisper|guard|tts|playai|orpheus|embed|safeguard|transcri/i.test(id));
}
async function pilihModelGroq(env, ulang, gambar) {
    if (gambar && env.GROQ_VISION_MODEL) return env.GROQ_VISION_MODEL;
    if (!gambar && env.GROQ_MODEL) return env.GROQ_MODEL;
    if (!ulang && (gambar ? modelGroqGambar : modelGroq)) return gambar ? modelGroqGambar : modelGroq;
    const ids = await daftarModelGroq(env);
    if (gambar) {
        const h = ids.filter((id) => /llama-4|scout|maverick|vision|pixtral|qwen.*vl|-vl\b/i.test(id));
        if (!h.length) throw new Error('tidak ada model gambar untuk kunci ini');
        return (modelGroqGambar = h[0]);
    }
    const teks = ids.filter((id) => !/vision-preview/i.test(id));
    for (const p of [/llama.*70b/i, /gpt-oss-120b/i, /gpt-oss/i, /llama/i, /qwen/i, /kimi|mixtral|gemma/i]) {
        const h = teks.filter((id) => p.test(id));
        if (h.length) return (modelGroq = h[0]);
    }
    if (teks.length) return (modelGroq = teks[0]);
    throw new Error('tidak ada model chat yang tersedia untuk kunci ini');
}
async function groq(sistem, prompt, maks, env, gambar) {
    const ada = gambar.length > 0;
    const minta = async (model) => kirim('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.GROQ_KEY },
        body: JSON.stringify({
            model: model, temperature: 0.7, max_tokens: maks,
            messages: (sistem ? [{ role: 'system', content: sistem }] : []).concat([{
                role: 'user',
                content: ada ? [{ type: 'text', text: prompt }].concat(gambar.map((u) => ({ type: 'image_url', image_url: { url: u } }))) : prompt
            }])
        })
    });
    const khusus = ada ? env.GROQ_VISION_MODEL : env.GROQ_MODEL;
    let d;
    try { d = await minta(await pilihModelGroq(env, false, ada)); }
    catch (e) {
        if (khusus || !/^404|does not exist|model/i.test(String(e && e.message)) || /tidak ada model/.test(String(e && e.message))) throw e;
        if (ada) modelGroqGambar = null; else modelGroq = null;
        d = await minta(await pilihModelGroq(env, true, ada)); /* model yang diingat sudah tidak ada: pilih ulang */
    }
    const teks = String((((d.choices || [])[0] || {}).message || {}).content || '').trim();
    if (!teks) throw new Error('jawaban kosong');
    return teks;
}
/* Gemini: hanya model 2.5-flash yang boleh dimatikan "berpikir"-nya; model lain diberi ruang token ekstra supaya jawaban tidak terpotong */
async function gemini(sistem, prompt, maks, env, gambar) {
    const model = env.MODEL || 'gemini-3.8-flash', lama = /^gemini-2\.5-flash/.test(model);
    const bagian = [{ text: prompt }].concat(gambar.map((u) => ({ inline_data: { mime_type: 'image/jpeg', data: u.slice(u.indexOf(',') + 1) } })));
    const isi = { contents: [{ role: 'user', parts: bagian }],
        generationConfig: Object.assign({ temperature: 0.7, maxOutputTokens: lama ? maks : maks + 2048 }, lama ? { thinkingConfig: { thinkingBudget: 0 } } : {}) };
    if (sistem) isi.systemInstruction = { parts: [{ text: sistem }] };
    const d = await kirim('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY }, body: JSON.stringify(isi)
    });
    const c = (d.candidates || [])[0], teks = ((c && c.content && c.content.parts) || []).map((p) => p.text || '').join('').trim();
    if (!teks) throw new Error('jawaban kosong');
    return teks;
}

/* coba penyedia berurutan dengan/tanpa gambar; mengembalikan teks atau melempar daftar galat */
async function jalankan(urutan, sistem, prompt, maks, env, gambar) {
    const galat = [];
    for (const [nama, panggil] of urutan) {
        try { return await panggil(sistem, prompt, maks, env, gambar); }
        catch (e) { galat.push(nama + ': ' + (e && e.message || e)); }
    }
    const err = new Error(galat.join(' · ')); err.galat = galat; throw err;
}

export default {
    async fetch(req, env) {
        const izin = String(env.ORIGIN || 'https://ayrigitar.com').split(',').map((s) => s.trim()).filter(Boolean);
        const asal = req.headers.get('Origin') || '';
        const cors = { 'Access-Control-Allow-Origin': izin.indexOf(asal) > -1 ? asal : izin[0], 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        if (req.method !== 'POST') return jawab({ error: 'Gunakan POST.' }, 405, cors);
        if (izin.indexOf(asal) < 0) return jawab({ error: 'Asal permintaan tidak diizinkan.' }, 403, cors);
        if ((!env.GROQ_KEY && !env.GEMINI_KEY) || !env.REPO_CEK) return jawab({ error: 'Perantara AI belum diatur (GROQ_KEY atau GEMINI_KEY, dan REPO_CEK).' }, 500, cors);
        const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
        if (!token || !(await bolehPakai(token, env))) return jawab({ error: 'Perangkat ini tidak berhak memakai AI. Buka POS dengan PIN dulu.' }, 403, cors);

        let b;
        try { b = await req.json(); } catch (e) { return jawab({ error: 'Permintaan tidak valid.' }, 400, cors); }
        const prompt = String(b && b.prompt || '').slice(0, 12000), sistem = String(b && b.sistem || '').slice(0, 4000);
        if (!prompt.trim()) return jawab({ error: 'Permintaan kosong.' }, 400, cors);
        /* gambar: hanya JPEG data-URL yang wajar ukurannya; selebihnya dibuang */
        const gambar = (Array.isArray(b && b.gambar) ? b.gambar : []).filter((u) => typeof u === 'string' && u.length <= MAKS_GAMBAR_PANJANG && POLA_GAMBAR.test(u)).slice(0, MAKS_GAMBAR);
        const maks = Math.max(64, Math.min(4096, +(b && b.maks) || 1024)), urutan = [];
        if (env.GROQ_KEY) urutan.push(['Groq', groq]);
        if (env.GEMINI_KEY) urutan.push(['Gemini', gemini]);
        try {
            try { return jawab({ teks: await jalankan(urutan, sistem, prompt, maks, env, gambar) }, 200, cors); }
            catch (e) {
                if (!gambar.length) throw e;
                /* foto tidak bisa dibaca penyedia mana pun: tetap beri jawaban dari teks saja, dengan catatan */
                /* alasan tiap penyedia ikut dicatat (kunci disamarkan) supaya penyebabnya bisa diketahui: kuota, nama model, atau kunci cadangan belum dipasang */
                let sebab = ((e && e.galat) || [String(e && e.message || e)]).join(' · ');
                [env.GROQ_KEY, env.GEMINI_KEY].forEach((k) => { if (k) sebab = sebab.split(k).join('…'); });
                if (!env.GEMINI_KEY) sebab += ' · Gemini: kunci belum dipasang';
                return jawab({ teks: await jalankan(urutan, sistem, prompt, maks, env, []), catatan: 'Foto belum bisa dibaca AI; jawaban dibuat dari catatan saja. (' + sebab.slice(0, 280) + ')' }, 200, cors);
            }
        } catch (e) {
            const galat = e && e.galat || [String(e && e.message || e)];
            const sibuk = galat.some((g) => / 429|kuota|rate|quota/i.test(g));
            return jawab({ error: sibuk ? 'AI sedang sibuk / kuota gratis habis. Coba lagi sebentar lagi.' : 'AI gagal: ' + galat.join(' · ') }, 502, cors);
        }
    }
};
