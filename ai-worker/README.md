# Perantara AI untuk POS AYRI

POS memanggil AI (Google Gemini) lewat perantara kecil di Cloudflare Workers. Kunci AI disimpan di Cloudflare sebagai **Secret**, tidak pernah di website, di POS, atau di chat. Hanya perangkat POS yang tokennya bisa membuka repo data toko (owner dan karyawan) yang boleh memakainya.

Keduanya gratis untuk pemakaian toko. Di paket gratis Google, isi permintaan bisa dipakai Google untuk melatih modelnya. POS hanya mengirim data barang dan bahan artikel, tidak pernah nama, nomor HP, atau KTP pelanggan.

## Langkah pemasangan (sekali saja, ±15 menit)

1. **Kunci Gemini**
   - Buka https://aistudio.google.com, masuk dengan akun Google toko.
   - Pilih **Get API key** → **Create API key**. Salin kuncinya. Jangan kirim ke siapa pun, termasuk ke chat.

2. **Buat Worker di Cloudflare**
   - Buka https://dash.cloudflare.com, daftar akun gratis bila belum punya.
   - **Workers & Pages** → **Create** → **Create Worker** → beri nama `ayri-ai` → **Deploy**.
   - **Edit code** → hapus semua isinya → tempel isi file `ai-worker/worker.mjs` dari repo ini → **Deploy**.

3. **Atur variabel** (Worker `ayri-ai` → **Settings** → **Variables and Secrets** → **Add**)
   - `GEMINI_KEY`, tipe **Secret**: kunci dari langkah 1.
   - `REPO_CEK`, tipe **Text**: `ayrigitar/ayri-toko-data`
   - `ORIGIN`, tipe **Text**: `https://ayrigitar.com`
   - (Opsional) `MODEL`, tipe **Text**: nama model Gemini lain. Bawaannya `gemini-2.5-flash`.
   - Tekan **Deploy** / simpan.

4. **Sambungkan ke POS**
   - Salin alamat Worker, misalnya `https://ayri-ai.namaanda.workers.dev`. Alamat ini **bukan** rahasia.
   - Isi di `layanan-config.js` bagian `ai: { url: '...' }`, atau kirim alamatnya ke Claude untuk dipasangkan.

5. **Coba**
   - POS → **Stok** → buka barang → tulis catatan singkat di Deskripsi → **✨ Tulis deskripsi dengan AI**.
   - POS → **Artikel** → isi judul (dan bahan bila ada) → **✨ Tulis draf dengan AI**.

## Bila ada masalah
- "Kuota AI gratis sedang habis": tunggu beberapa saat; batas gratis dihitung per menit dan per hari.
- "Perangkat ini tidak berhak": buka POS dengan PIN; token POS harus bisa membuka `ayri-toko-data`.
- "Perantara AI belum diatur": `GEMINI_KEY` atau `REPO_CEK` belum diisi di Cloudflare.
- Ganti penyedia/model: cukup ubah `MODEL` (atau kode Worker); POS tidak perlu diubah.
