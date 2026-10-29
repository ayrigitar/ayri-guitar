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
    assert.match(m.sistem, /Jangan mengarang/);
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
        /* token yang sudah lolos disimpan sebentar: permintaan kedua tidak bertanya ke GitHub lagi */
        const ghSebelum = panggilan.filter((x) => x.url.startsWith('https://api.github.com/') && x.op.headers.Authorization === 'Bearer tok-baik').length;
        await minta('https://ayrigitar.com', 'tok-baik');
        assert.equal(panggilan.filter((x) => x.url.startsWith('https://api.github.com/') && x.op.headers.Authorization === 'Bearer tok-baik').length, ghSebelum);
        assert.equal((await minta('https://ayrigitar.com', 'tok-baik', { prompt: '' })).status, 400);
        const pre = await worker.fetch(new Request('https://ai.contoh.workers.dev/', { method: 'OPTIONS', headers: { Origin: 'https://ayrigitar.com' } }), env);
        assert.equal(pre.status, 204);
    } finally { globalThis.fetch = asli; }
});
