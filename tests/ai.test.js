'use strict';
/* AI penulis: isi permintaan (tanpa data pribadi pelanggan), pemanggilan dari POS, dan perantara Cloudflare Worker (ai-worker/worker.mjs). */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), { pathToFileURL } = require('node:url');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, REPO } = require('./helper');

async function mulai() {
    const gh = siapkanRepo(bikinGitHub());
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, d, A: d.A, L: d.L };
}

test('permintaan deskripsi: data barang, tingkat kondisi + artinya, catatan penjual; tanpa harga', async () => {
    const { L } = await mulai();
    const m = L.ai.deskripsi(stokContoh('s1', 1, { gitar_jenis: 'Bass', gitar_merk: 'Fender Aerodyne', warna: 'Hitam Glossy', kondisi: 'bekas', tingkat: 'very_good', deskripsi: 'lecet kecil di body, bonus softcase', harga_jual: 13000000, harga_beli: 9000000 }));
    assert.ok(m.prompt.includes('Barang: Bass Fender Aerodyne') && m.prompt.includes('Warna: Hitam Glossy'));
    assert.ok(m.prompt.includes('tingkat Very Good (pemakaian wajar'));
    assert.ok(m.prompt.includes('lecet kecil di body, bonus softcase'));
    assert.ok(!/13\.000\.000|13000000|9000000/.test(m.prompt + m.sistem), 'harga & modal tidak dikirim');
    assert.match(m.sistem, /jangan mengarang fakta unit ini/);
    assert.match(m.sistem, /SPESIFIKASI MODEL/); assert.match(m.sistem, /jangan menebak/); assert.match(m.sistem, /TERLIHAT JELAS/);
    assert.match(m.prompt, /Baris "Spesifikasi:"/); assert.ok(m.maks >= 900);
    assert.ok(!m.prompt.includes('(umumnya)') && /tanpa kata "umumnya"/.test(m.sistem), 'tanpa label umumnya di hasil');
    assert.ok(!/foto barang ini terlampir/.test(m.prompt), 'tanpa foto: tidak menyebut foto terlampir');
    assert.match(L.ai.deskripsi(stokContoh('s9', 1), 3).prompt, /3 foto barang ini terlampir/);
    const aks = L.ai.deskripsi(stokContoh('s2', 3, { kategori: 'aksesoris', sub: 'Senar', nama: 'Orphee NX35', warna: 'Nylon Klasik Hard Tension', deskripsi: '' }));
    assert.ok(aks.prompt.includes('Kategori: Senar') && aks.prompt.includes('Varian: Nylon Klasik Hard Tension') && aks.prompt.includes('(tidak ada)'));
});

test('permintaan artikel: judul, bahan, kasus servis tanpa nama/HP pelanggan; jawaban dipisah ringkasan & isi', async () => {
    const { L } = await mulai();
    const servis = { nama: 'Budi Santoso', hp: '081234567890', gitar_jenis: 'Akustik', gitar_merk: 'Yamaha APX500', keluhan: 'Bridge terangkat', items: [{ nama: 'Repair Bridge Lepas', harga: 300000 }] };
    const m = L.ai.artikel({ judul: 'Repair Bridge Lepas Yamaha APX500', tag: 'Kasus Servis', isi: 'bridge dilem ulang, dijepit 24 jam' }, servis);
    assert.ok(m.prompt.includes('Judul artikel: Repair Bridge Lepas Yamaha APX500') && m.prompt.includes('Keluhan: Bridge terangkat') && m.prompt.includes('Pekerjaan: Repair Bridge Lepas') && m.prompt.includes('dijepit 24 jam'));
    assert.ok(!/Budi|0812/.test(m.prompt + m.sistem), 'data pribadi pelanggan tidak dikirim');
    const h = L.ai.pisahArtikel('RINGKASAN: Cara kami memperbaiki bridge gitar yang lepas.\n\n## Masalahnya\nBridge terangkat...');
    assert.deepEqual([h.ringkasan, h.isi.slice(0, 13)], ['Cara kami memperbaiki bridge gitar yang lepas.', '## Masalahnya']);
    assert.equal(L.ai.pisahArtikel('## Tanpa ringkasan').ringkasan, '');
});

test('api.ai: ditolak bila belum diaktifkan; mengirim token POS ke perantara dan mengembalikan teks atau pesan galat', async () => {
    const { d, L, A } = await mulai();
    L.C.ai.url = '';
    await assert.rejects(A.ai({ prompt: 'x' }), /belum diaktifkan/);
    L.C.ai.url = 'https://ai.contoh.workers.dev';
    let kirim;
    d.sb.fetch = async (url, op) => { kirim = { url, op }; return { ok: true, status: 200, json: async () => ({ teks: 'Draf deskripsi.' }) }; };
    assert.equal(await A.ai({ sistem: 's', prompt: 'p', maks: 100 }), 'Draf deskripsi.');
    assert.equal(kirim.url, 'https://ai.contoh.workers.dev');
    assert.equal(kirim.op.headers.Authorization, 'Bearer ' + d.token);
    assert.deepEqual(JSON.parse(kirim.op.body), { sistem: 's', prompt: 'p', maks: 100 });
    d.sb.fetch = async () => ({ ok: false, status: 502, json: async () => ({ error: 'Kuota AI gratis sedang habis. Coba lagi beberapa saat lagi.' }) });
    await assert.rejects(A.ai({ prompt: 'p' }), /Kuota AI gratis/);
    d.sb.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(A.ai({ prompt: 'p' }), /Periksa internet/);
});

test('perantara (worker): menolak asal & token tak berhak, meneruskan ke Gemini dengan kunci dari Secret', async () => {
    const worker = (await import(pathToFileURL(path.join(REPO, 'ai-worker', 'worker.mjs')).href)).default;
    const env = { GEMINI_KEY: 'kunci-rahasia', REPO_CEK: 'ayrigitar/ayri-toko-data', ORIGIN: 'https://ayrigitar.com' };
    const asli = globalThis.fetch, panggilan = [];
    globalThis.fetch = async (url, op) => {
        panggilan.push({ url: String(url), op });
        if (String(url).startsWith('https://api.github.com/')) return new Response('{}', { status: op.headers.Authorization === 'Bearer tok-baik' ? 200 : 404 });
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '  Hasil AI  ' }] } }] }), { status: 200 });
    };
    const minta = (asal, tok, isi) => worker.fetch(new Request('https://ai.contoh.workers.dev/', { method: 'POST', headers: Object.assign({ Origin: asal, 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}), body: JSON.stringify(isi || { sistem: 'S', prompt: 'P' }) }), env);
    try {
        assert.equal((await minta('https://jahat.example', 'tok-baik')).status, 403, 'asal lain ditolak');
        assert.equal((await minta('https://ayrigitar.com', 'tok-jelek')).status, 403, 'token tanpa akses repo ditolak');
        assert.equal((await minta('https://ayrigitar.com', '')).status, 403);
        const r = await minta('https://ayrigitar.com', 'tok-baik');
        assert.equal(r.status, 200);
        assert.deepEqual(await r.json(), { teks: 'Hasil AI' });
        assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://ayrigitar.com');
        const g = panggilan.filter((x) => x.url.includes('generativelanguage')).pop();
        assert.equal(g.op.headers['x-goog-api-key'], 'kunci-rahasia');
        assert.ok(!g.url.includes('kunci-rahasia'), 'kunci tidak di URL');
        const isi = JSON.parse(g.op.body);
        assert.equal(isi.systemInstruction.parts[0].text, 'S');
        assert.equal(isi.contents[0].parts[0].text, 'P');
        assert.ok(g.url.includes('/models/gemini-3.8-flash:'), 'model bawaan terbaru');
        assert.deepEqual(isi.generationConfig.thinkingConfig, { thinkingLevel: 'low' }, 'seri 3.x: berpikir dikecilkan (tidak bisa dimatikan)');
        assert.ok(isi.generationConfig.maxOutputTokens > 1024, 'ada ruang ekstra untuk proses berpikir');
        /* token yang sudah lolos disimpan sebentar: permintaan kedua tidak bertanya ke GitHub lagi */
        const ghSebelum = panggilan.filter((x) => x.url.startsWith('https://api.github.com/') && x.op.headers.Authorization === 'Bearer tok-baik').length;
        await minta('https://ayrigitar.com', 'tok-baik');
        assert.equal(panggilan.filter((x) => x.url.startsWith('https://api.github.com/') && x.op.headers.Authorization === 'Bearer tok-baik').length, ghSebelum);
        assert.equal((await minta('https://ayrigitar.com', 'tok-baik', { prompt: '' })).status, 400);
        const pre = await worker.fetch(new Request('https://ai.contoh.workers.dev/', { method: 'OPTIONS', headers: { Origin: 'https://ayrigitar.com' } }), env);
        assert.equal(pre.status, 204);
    } finally { globalThis.fetch = asli; }
});

test('perantara (worker): Groq dicoba lebih dulu, Gemini jadi cadangan bila Groq sibuk; keduanya gagal = pesan ramah', async () => {
    const worker = (await import(pathToFileURL(path.join(REPO, 'ai-worker', 'worker.mjs')).href)).default;
    const env = { GROQ_KEY: 'kunci-groq', GEMINI_KEY: 'kunci-gemini', REPO_CEK: 'ayrigitar/ayri-toko-data', ORIGIN: 'https://ayrigitar.com' };
    const asli = globalThis.fetch;
    let groqSibuk = false, geminiSibuk = false, dipanggil = [];
    globalThis.fetch = async (url, op) => {
        url = String(url); dipanggil.push(url);
        if (url.startsWith('https://api.github.com/')) return new Response('{}', { status: 200 });
        if (url.endsWith('/openai/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'whisper-large-v3' }, { id: 'meta-llama/llama-guard-4' }, { id: 'openai/gpt-oss-20b' }, { id: 'llama-9-70b-instruktur' }] }), { status: 200 });
        if (url.includes('api.groq.com')) {
            assert.equal(op.headers.Authorization, 'Bearer kunci-groq');
            assert.equal(JSON.parse(op.body).model, 'llama-9-70b-instruktur', 'model dipilih otomatis dari daftar: llama 70b, bukan whisper/guard');
            const b = JSON.parse(op.body);
            assert.deepEqual(b.messages.map((m) => m.role), ['system', 'user']);
            return groqSibuk ? new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), { status: 429 }) : new Response(JSON.stringify({ choices: [{ message: { content: ' Dari Groq ' } }] }), { status: 200 });
        }
        return geminiSibuk ? new Response('{}', { status: 429 }) : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Dari Gemini' }] } }] }), { status: 200 });
    };
    const minta = () => worker.fetch(new Request('https://ai.contoh.workers.dev/', { method: 'POST', headers: { Origin: 'https://ayrigitar.com', 'Content-Type': 'application/json', Authorization: 'Bearer tok-groq-uji' }, body: JSON.stringify({ sistem: 'S', prompt: 'P' }) }), env);
    try {
        assert.deepEqual(await (await minta()).json(), { teks: 'Dari Groq' });
        assert.ok(!dipanggil.some((u) => u.includes('generativelanguage')), 'Gemini tidak dipanggil bila Groq berhasil');
        groqSibuk = true;
        assert.deepEqual(await (await minta()).json(), { teks: 'Dari Gemini' }, 'Groq sibuk: pindah ke Gemini');
        geminiSibuk = true;
        const r = await minta();
        assert.equal(r.status, 502);
        assert.match((await r.json()).error, /sibuk|kuota/);
    } finally { globalThis.fetch = asli; }
});

test('perantara (worker): foto dikirim ke model Groq yang bisa melihat gambar; gambar tak sah dibuang; gagal baca foto = jawaban dari teks + catatan', async () => {
    const worker = (await import(pathToFileURL(path.join(REPO, 'ai-worker', 'worker.mjs')).href)).default;
    const env = { GROQ_KEY: 'kunci-groq', REPO_CEK: 'ayrigitar/ayri-toko-data', ORIGIN: 'https://ayrigitar.com' };
    const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', asli = globalThis.fetch;
    let daftar = [{ id: 'llama-9-70b-instruktur' }, { id: 'meta-llama/llama-4-scout-17b-16e-instruct' }], bodi = [];
    globalThis.fetch = async (url, op) => {
        url = String(url);
        if (url.startsWith('https://api.github.com/')) return new Response('{}', { status: 200 });
        if (url.endsWith('/openai/v1/models')) return new Response(JSON.stringify({ data: daftar }), { status: 200 });
        const b = JSON.parse(op.body); bodi.push(b);
        return new Response(JSON.stringify({ choices: [{ message: { content: 'Hasil' } }] }), { status: 200 });
    };
    const minta = (isi) => worker.fetch(new Request('https://ai.contoh.workers.dev/', { method: 'POST', headers: { Origin: 'https://ayrigitar.com', 'Content-Type': 'application/json', Authorization: 'Bearer tok-foto-uji' }, body: JSON.stringify(isi) }), env);
    try {
        const r = await minta({ sistem: 'S', prompt: 'P', gambar: [JPEG, 'http://jahat.example/x.jpg', 'data:text/html;base64,AAAA', JPEG] });
        assert.deepEqual(await r.json(), { teks: 'Hasil' });
        const b = bodi.pop();
        assert.match(b.model, /scout/, 'model yang bisa melihat gambar');
        const isi = b.messages[1].content;
        assert.equal(isi[0].type, 'text'); assert.equal(isi.length, 3, 'teks + 2 gambar JPEG yang sah; sisanya dibuang');
        assert.equal(isi[1].image_url.url, JPEG);
        /* tanpa gambar: model teks biasa, isi pesan berupa teks */
        await minta({ prompt: 'P' });
        const t = bodi.pop(); assert.match(t.model, /70b/); assert.equal(typeof t.messages[0].content, 'string');
        /* tidak ada model gambar & tidak ada penyedia lain: jawaban dari teks saja + catatan */
        daftar = [{ id: 'llama-9-70b-instruktur' }];
        const modelLama = bodi.length, segar = (await import(pathToFileURL(path.join(REPO, 'ai-worker', 'worker.mjs')).href + '?segar')).default; /* salinan baru: pilihan model lama tidak diingat */
        const r2 = await (await segar.fetch(new Request('https://ai.contoh.workers.dev/', { method: 'POST', headers: { Origin: 'https://ayrigitar.com', 'Content-Type': 'application/json', Authorization: 'Bearer tok-foto-uji' }, body: JSON.stringify({ prompt: 'P', gambar: [JPEG] }) }), env)).json();
        assert.equal(r2.teks, 'Hasil'); assert.match(r2.catatan, /Foto belum bisa dibaca/);
        assert.match(r2.catatan, /Groq: tidak ada model gambar/, 'alasan Groq ikut dicatat');
        assert.match(r2.catatan, /Gemini: kunci belum dipasang/, 'cadangan yang belum dipasang disebut');
        assert.ok(!r2.catatan.includes('kunci-groq'), 'kunci tidak pernah ikut tertulis');
        assert.equal(typeof bodi[bodi.length - 1].messages[0].content, 'string', 'percobaan ulang tanpa gambar');
        assert.ok(bodi.length >= modelLama + 1);
    } finally { globalThis.fetch = asli; }
});

test('perantara (worker): model gambar qwen3 Groq dikenali; Gemini 3.x diberi thinkingLevel rendah dan diulang tanpa itu bila ditolak', async () => {
    const worker = (await import(pathToFileURL(path.join(REPO, 'ai-worker', 'worker.mjs')).href + '?qwen')).default;
    const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', asli = globalThis.fetch;
    const minta = (env, isi) => worker.fetch(new Request('https://ai.contoh.workers.dev/', { method: 'POST', headers: { Origin: 'https://ayrigitar.com', 'Content-Type': 'application/json', Authorization: 'Bearer tok-qwen-uji' }, body: JSON.stringify(isi) }), env);
    try {
        /* Groq: hanya qwen/qwen3.8-27b yang bisa melihat gambar */
        let model = null;
        globalThis.fetch = async (url, op) => {
            url = String(url);
            if (url.startsWith('https://api.github.com/')) return new Response('{}', { status: 200 });
            if (url.endsWith('/openai/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'llama-3.3-70b-versatile' }, { id: 'qwen/qwen3.8-27b' }] }), { status: 200 });
            model = JSON.parse(op.body).model;
            return new Response(JSON.stringify({ choices: [{ message: { content: 'Hasil gambar' } }] }), { status: 200 });
        };
        const r = await (await minta({ GROQ_KEY: 'kg', REPO_CEK: 'a/b', ORIGIN: 'https://ayrigitar.com' }, { prompt: 'P', gambar: [JPEG] })).json();
        assert.equal(r.teks, 'Hasil gambar'); assert.equal(model, 'qwen/qwen3.8-27b');
        assert.equal(r.catatan, undefined, 'foto terbaca: tanpa catatan gagal');
        /* Gemini 3.x: thinkingLevel low; bila ditolak karena pengaturan itu, diulang tanpa pengaturan berpikir */
        const config = [];
        globalThis.fetch = async (url, op) => {
            url = String(url);
            if (url.startsWith('https://api.github.com/')) return new Response('{}', { status: 200 });
            const gc = JSON.parse(op.body).generationConfig; config.push(gc.thinkingConfig || null);
            if (gc.thinkingConfig) return new Response(JSON.stringify({ error: { message: 'Unknown name "thinkingLevel": Cannot find field.' } }), { status: 400 });
            return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Dari Gemini' }] } }] }), { status: 200 });
        };
        const g = await (await minta({ GEMINI_KEY: 'kgem', REPO_CEK: 'a/b', ORIGIN: 'https://ayrigitar.com' }, { prompt: 'P', gambar: [JPEG] })).json();
        assert.equal(g.teks, 'Dari Gemini');
        assert.deepEqual(config, [{ thinkingLevel: 'low' }, null]);
    } finally { globalThis.fetch = asli; }
});
