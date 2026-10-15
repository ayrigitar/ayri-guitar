# Panduan setup layanan servis (Supabase)

Panduan ini menyambungkan halaman **admin**, **cek status servis**, **nota**, dan **artikel otomatis** ke database Supabase (gratis).
Waktu yang dibutuhkan: sekitar 20–30 menit. Semua langkah bisa dilakukan dari laptop; langkah 7 dari HP.

> **Aturan emas keamanan**
> - Kata sandi database, kata sandi admin, dan **service_role / secret key** JANGAN PERNAH dikirim ke siapa pun (termasuk ke Claude) dan jangan ditaruh di file situs.
> - Yang boleh dibagikan dan ditaruh di situs hanya **Project URL** dan **anon public key** (memang dirancang publik; data dilindungi aturan keamanan di database).

---

## 1. Buat akun dan project

1. Buka **https://supabase.com** → **Start your project** → masuk dengan akun GitHub `ayrigitar` (paling mudah) atau email toko.
2. Klik **New project**, isi:
   - **Name**: `ayri-gitar`
   - **Database Password**: klik *Generate a password*, lalu **simpan di tempat aman** (catatan HP / pengelola kata sandi). Jarang dipakai, tapi jangan sampai hilang.
   - **Region**: **Southeast Asia (Singapore)**: paling dekat dengan Bogor, jadi paling cepat.
   - **Plan**: Free.
3. Klik **Create new project** dan tunggu ±2 menit sampai selesai.

## 2. Buat tabel dan aturan keamanan

1. Di menu kiri, buka **SQL Editor** → **New query**.
2. Buka file [`supabase/1-skema.sql`](1-skema.sql) di GitHub → klik tombol **Copy raw file** (ikon salin) → tempel di SQL Editor.
3. Klik **Run**. Hasil yang benar: **"Success. No rows returned"**.

> Kalau muncul error `must be owner of table objects` (bagian penyimpanan foto), lakukan manual:
> **Storage** → **New bucket** → nama `servis`, centang **Public bucket** → Save. Lalu jalankan ulang file SQL **tanpa** bagian paling bawah (mulai baris `drop policy if exists "admin unggah foto"`), dan kabari Claude; aturan unggah foto akan dibantu lewat menu Storage → Policies.

## 3. Buat akun admin dan matikan pendaftaran umum

1. Menu **Authentication** → **Sign In / Providers** (atau **Settings**): matikan **Allow new users to sign up** → **Save**.
   Dengan begitu tidak ada orang lain yang bisa membuat akun.
2. Menu **Authentication** → **Users** → **Add user** → **Create new user**:
   - Email: email admin Anda.
   - Password: kata sandi yang kuat (minimal 12 huruf/angka). Ini yang dipakai untuk masuk ke halaman admin.
   - Centang **Auto Confirm User**.
   - Klik **Create user**.

## 4. Jadikan akun tersebut admin

1. **SQL Editor** → **New query**.
2. Salin isi [`supabase/2-jadikan-admin.sql`](2-jadikan-admin.sql), tempel, lalu ganti `EMAIL_ADMIN_ANDA` dengan email dari langkah 3.
3. **Run**. Hasil yang benar: muncul **1 baris** berisi `user_id`. Kalau kosong, email salah ketik; ulangi.

## 5. Ambil alamat dan kunci publik

1. Menu **Project Settings** (ikon gerigi) → **API** / **Data API**.
2. Salin **Project URL**: bentuknya `https://xxxxxxxx.supabase.co`.
3. Buka **API Keys** → tab **Legacy API keys** (kalau ada) → salin kunci **anon** **public**: kunci panjang yang diawali `eyJ...`.
   *(Kalau hanya ada "Publishable key" `sb_publishable_...`, salin yang itu.)*
4. Kirim **Project URL** dan **anon public key** ke Claude di chat, atau isi sendiri di file [`layanan-config.js`](../layanan-config.js) (baris `supabaseUrl` dan `supabaseAnonKey`), lalu simpan.
   **Jangan** salin `service_role` / `secret` key.

## 6. Izinkan GitHub membuat halaman artikel

1. Di GitHub, repo **ayri-guitar** → **Settings** → **Actions** → **General**.
2. Bagian **Workflow permissions** → pilih **Read and write permissions** → **Save**.
3. Setelah langkah 5 selesai dan PR digabung: tab **Actions** → **Terbitkan artikel** → **Run workflow** sekali untuk mengetes. Hasil hijau ✓ = siap.
   Setelah itu GitHub menjalankannya sendiri setiap jam.

## 7. Uji coba dari HP

1. Buka **https://ayrigitar.com/admin.html** di Chrome HP → masuk dengan email + kata sandi admin.
2. Menu ⋮ Chrome → **Tambahkan ke layar utama**, supaya admin bisa dibuka seperti aplikasi.
3. Tekan **+ Gitar masuk**, isi data contoh (pakai nomor HP Anda sendiri), tambah jasa, catat DP, tambah foto, **Simpan**.
4. Tekan **WA: Tanda terima**: WhatsApp terbuka dengan pesan siap kirim.
5. Buka link cek status di pesan itu, masukkan 4 digit terakhir HP → pastikan status, biaya, dan nota tampil.
6. Hapus servis contoh (tombol **Hapus servis** di bagian bawah).

---

## Alur kerja sehari-hari

| Kejadian | Yang dilakukan di admin |
|---|---|
| Gitar masuk | **+ Gitar masuk** → isi data, jasa/part, foto *sebelum*, estimasi → **Simpan** → **WA: Tanda terima** |
| DP / part dibayar | Bagian **Pembayaran** → **Catat pembayaran**. Status otomatis jadi **Antri** saat DP 50% jasa + part lunas terpenuhi |
| Mulai dikerjakan | Status **Sedang dikerjakan** → Simpan → (opsional) **WA: Update status** |
| Ada kerusakan tambahan | Tambah jasa/part, foto di **Kerusakan tambahan**, ubah estimasi, tulis **Pesan untuk pelanggan** → Simpan → **WA: Update status** |
| Selesai | Status **Selesai**, tambah foto *sesudah*, tulis **Saran** (upgrade/perbaikan lain) → Simpan → **WA: Kabari selesai** |
| Diambil | Catat pelunasan → status **Sudah diambil** → Simpan → **WA: Kirim nota**. Garansi mulai dihitung hari ini |
| Mau dijadikan artikel | **Jadikan artikel** → rapikan tulisan & keterangan foto → status **Terbit** → Simpan. Muncul di situs ±1 jam |

## Yang dilihat pelanggan

- Halaman **cek-servis.html**: hanya bisa dibuka dengan **kode servis + 4 digit terakhir HP**.
- Terlihat: jenis/merk gitar, status, estimasi, pesan dari bengkel, rincian biaya, foto yang berlabel **Tampil**, dan (setelah selesai) foto sesudah, saran, serta garansi.
- Tidak pernah terlihat: nomor HP lengkap, catatan internal, foto yang disembunyikan.
- Foto **sebelum** servis disembunyikan secara bawaan; ketuk labelnya di admin untuk menampilkan.

## Mengubah pengaturan toko

Semua ada di [`layanan-config.js`](../layanan-config.js): alamat, jam buka, nomor WA, rekening, persen DP, daftar jasa + harga + garansi, dan ketentuan nota.
Yang **perlu Anda pastikan**:
- `batasAmbilHari` (sekarang **30 hari**): batas gitar tidak diambil sebelum garansi hangus dan kena biaya penitipan.
- `biayaPenitipan` (sekarang kosong): isi misalnya `'Rp5.000 per hari'` kalau ingin nominalnya tercetak di nota.

## Hal penting tentang paket gratis Supabase

- Kuota: database 500 MB dan penyimpanan foto 1 GB (cukup untuk ribuan servis, karena foto otomatis dikecilkan ke WebP ±150–250 KB).
- Project yang **tidak dipakai 7 hari** akan "tidur". Selama Anda membuka admin atau pelanggan membuka cek status setidaknya seminggu sekali, project tetap aktif. Kalau sempat tidur: buka dashboard Supabase → **Restore project**.
- Paket gratis tidak punya backup otomatis. Sebulan sekali: **Table Editor** → tabel `servis` → **Export to CSV** (lakukan juga untuk `servis_item` dan `servis_bayar`), simpan di Google Drive.
