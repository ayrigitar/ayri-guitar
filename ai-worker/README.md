# Perantara AI untuk POS AYRI

POS memanggil AI (Google Gemini) lewat perantara kecil di Cloudflare Workers. Kunci AI disimpan di Cloudflare sebagai **Secret**, tidak pernah di website, di POS, atau di chat. Hanya perangkat POS yang tokennya bisa membuka repo data toko (owner dan karyawan) yang boleh memakainya.

Keduanya gratis untuk pemakaian toko. Di paket gratis Google, isi permintaan bisa dipakai Google untuk melatih modelnya. POS hanya mengirim data barang dan bahan artikel, tidak pernah nama, nomor HP, atau KTP pelanggan.

## Langkah pemasangan (sekali saja, ±15 menit)

1. **Kunci Groq (utama, disarankan)**
   - Buka https://console.groq.com, masuk (bisa dengan akun Google).
   - **API Keys** → **Create API Key**. Salin kuncinya. Jangan kirim ke siapa pun, termasuk ke chat.
   - Groq cepat (biasanya 1–3 detik) dan kuota gratisnya longgar. Gemini dipakai otomatis sebagai cadangan bila Groq sibuk.

1b. **Kunci Gemini (opsional, cadangan)**
   - Buka https://aistudio.google.com, masuk dengan akun Google toko.
   - Pilih **Get API key** → **Create API key**. Salin kuncinya. Jangan kirim ke siapa pun, termasuk ke chat.

2. **Buat Worker di Cloudflare**
   - Buka https://dash.cloudflare.com, daftar akun gratis bila belum punya.
   - **Workers & Pages** → **Create** → **Create Worker** → beri nama `ayri-ai` → **Deploy**.
   - **Edit code** → hapus semua isinya → tempel isi file `ai-worker/worker.mjs` dari repo ini → **Deploy**.

3. **Atur variabel** (Worker `ayri-ai` → **Settings** → **Variables and Secrets** → **Add**)
   - `GROQ_KEY`, tipe **Secret**: kunci Groq dari langkah 1.
   - `GEMINI_KEY`, tipe **Secret** (opsional): kunci Gemini dari langkah 1b.
   - `REPO_CEK`, tipe **Text**: `ayrigitar/ayri-toko-data`
   - `ORIGIN`, tipe **Text**: `https://ayrigitar.com`
   - (Opsional) `GROQ_MODEL`, tipe **Text**: nama model Groq tertentu. Dikosongkan: Worker memilih sendiri model chat terbaik yang tersedia untuk kunci Anda (nama model Groq sering berganti).
   - (Opsional) `GROQ_VISION_MODEL`, tipe **Text**: model Groq yang bisa membaca gambar (untuk analisis foto barang). Dikosongkan: dipilih otomatis.
   - (Opsional) `MODEL`, tipe **Text**: nama model Gemini lain. Bawaannya `gemini-3.8-flash`. Google sering mengganti nama model; bila muncul pesan "model ... no longer available", isi variabel ini dengan model yang disarankan di pesan itu, tanpa menempel kode lagi.
   - Tekan **Deploy** / simpan.

4. **Sambungkan ke POS**
   - Salin alamat Worker, misalnya `https://ayri-ai.namaanda.workers.dev`. Alamat ini **bukan** rahasia.
   - Isi di `layanan-config.js` bagian `ai: { url: '...' }`, atau kirim alamatnya ke Claude untuk dipasangkan.

5. **Coba**
   - POS → **Stok** → buka barang → tulis catatan singkat di Deskripsi → **✨ Tulis deskripsi dengan AI**.
   - POS → **Artikel** → isi judul (dan bahan bila ada) → **✨ Tulis draf dengan AI**.

## Bila ada masalah
- "User location is not supported for the API use": Gemini menolak lokasi pusat data Cloudflare yang menjalankan Worker. Di Worker → Settings → Runtime → **Placement**, pilih **Smart** (atau wilayah Singapore / Amerika Serikat), simpan, tunggu ±1 menit, coba lagi.
- "Kuota AI gratis sedang habis": tunggu beberapa saat; batas gratis dihitung per menit dan per hari.
- "Perangkat ini tidak berhak": buka POS dengan PIN; token POS harus bisa membuka `ayri-toko-data`.
- "Perantara AI belum diatur": `GROQ_KEY`/`GEMINI_KEY` atau `REPO_CEK` belum diisi di Cloudflare.
- "AI sedang sibuk / kuota gratis habis": semua penyedia sedang membatasi; tunggu sebentar. Dengan Groq sebagai utama ini jarang terjadi.
- Kode 524 atau lama sekali: penyedia terlalu lama menjawab. Worker sekarang berhenti menunggu setelah 25 detik dan mencoba penyedia berikutnya.
- Ganti penyedia/model: cukup ubah `MODEL` (atau kode Worker); POS tidak perlu diubah.
