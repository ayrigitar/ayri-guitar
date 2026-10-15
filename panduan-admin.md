# Panduan admin servis Toko Gitar AYRI

Admin servis berjalan **tanpa server dan tanpa biaya**:

- **Data lengkap** (nama, no. HP, catatan, pembayaran) disimpan di repo GitHub **privat** `ayri-servis-data`, ibarat lemari arsip yang terkunci.
- **Data untuk pelanggan** disimpan di situs ayrigitar.com dalam bentuk **terkunci (terenkripsi)**. Hanya bisa dibuka dengan **kode servis + 4 digit terakhir no. HP pelanggan**. Orang lain hanya melihat huruf acak.
- Halaman admin (`ayrigitar.com/admin.html`) menyimpan langsung ke GitHub memakai token yang Anda pasang sendiri di HP atau laptop, terkunci PIN.

> **Aturan emas keamanan**
> - Token GitHub **jangan pernah** dikirim ke siapa pun (termasuk ke Claude), jangan difoto, dan jangan ditaruh di file situs.
> - Repo `ayri-servis-data` **harus Private**. Admin menolak bekerja kalau repo itu publik.

---

## Langkah 1: Buat repo data (privat)

1. Buka **https://github.com/new** (masuk sebagai `ayrigitar`).
2. **Repository name**: `ayri-servis-data`
3. Pilih **Private**.
4. Centang **Add a README file**.
5. Klik **Create repository**.

## Langkah 2: Buat token admin (lakukan di Chrome HP)

Buat token **langsung di HP yang akan dipakai**, supaya token tidak perlu dikirim lewat WhatsApp atau catatan. Untuk laptop, buat token kedua di laptop (langkah 2–3 diulang), sehingga kalau satu perangkat hilang cukup token perangkat itu yang dicabut.

1. Buka **https://github.com/settings/personal-access-tokens/new** (token *fine-grained*). Kalau GitHub meminta kata sandi atau kode verifikasi, isi seperti biasa.
2. **Token name**: `Admin servis AYRI - HP` (di laptop: `Admin servis AYRI - Laptop`)
3. **Expiration**: pilih **No expiration** (tidak perlu diperbarui tiap tahun). Konsekuensinya: kalau HP hilang, rusak, dijual, atau diganti, **token HP itu wajib dicabut** (lihat *Keamanan & perawatan*). Kalau lebih suka token mati sendiri, pilih masa berlaku 1 tahun; GitHub mengirim email pengingat sebelum habis.
4. **Repository access**: **Only select repositories**, lalu pilih **ayri-guitar** dan **ayri-servis-data**.
5. **Permissions** → **Repository permissions** (atau tombol **Add permissions**) → **Contents**: pilih **Read and write**. Biarkan yang lain apa adanya; *Metadata: Read-only* terisi otomatis.
6. Klik **Generate token**, lalu **salin token** (diawali `github_pat_…`). Token hanya ditampilkan sekali; langsung lanjut ke langkah 3.

## Langkah 3: Pasang admin di HP

1. Buka **https://ayrigitar.com/admin.html** di Chrome HP (tab baru).
2. Tempel token ke kolom **Token GitHub**.
3. Buat **PIN** 4–8 angka (bukan tanggal lahir), ketik ulang, lalu tekan **Pasang**.
4. Menu ⋮ Chrome → **Tambahkan ke layar utama**, supaya admin bisa dibuka seperti aplikasi.

Setelah terpasang, token tidak perlu disimpan di tempat lain. Kalau suatu saat lupa PIN, cukup buat token baru.

## Langkah 4: Uji coba

1. Tekan **+ Gitar masuk**, isi data contoh (pakai nomor HP Anda sendiri), tambah jasa, catat DP, tambah foto, lalu **Simpan**.
2. Tekan **WA: Tanda terima**: WhatsApp terbuka dengan pesan siap kirim.
3. Tunggu ±1 menit, buka link cek status di pesan itu, lalu masukkan 4 digit terakhir HP. Status, foto, biaya, dan nota harus tampil.
4. Hapus servis contoh (tombol **Hapus servis** di bagian bawah).

---

## Alur kerja sehari-hari

| Kejadian | Yang dilakukan di admin |
|---|---|
| Gitar masuk | **+ Gitar masuk** → isi data, jasa/part, foto *sebelum*, estimasi → **Simpan** → **WA: Tanda terima** |
| DP / part dibayar | Bagian **Pembayaran** → **Catat pembayaran** → **Simpan**. Status otomatis jadi **Antri** saat DP 50% jasa + part lunas terpenuhi |
| Mulai dikerjakan | Status **Sedang dikerjakan** → Simpan → (opsional) **WA: Update status** |
| Ada kerusakan tambahan | Tambah jasa/part, foto di **Kerusakan tambahan**, ubah estimasi, tulis **Pesan untuk pelanggan** → Simpan → **WA: Update status** |
| Selesai | Status **Selesai**, tambah foto *sesudah*, tulis **Saran** (upgrade/perbaikan lain) → Simpan → **WA: Kabari selesai** |
| Belum diambil | Daftar servis menampilkan **🔔 … gitar perlu diingatkan** pada hari ke-7 dan ke-12 setelah selesai (lalu seminggu sekali bila biaya titip sudah berjalan). Ketuk **Lihat** → **Ingatkan via WA**; tanggal pengingat tercatat otomatis |
| Diambil | Kalau lewat masa gratis: bagian Status → **+ Tambah biaya penitipan**. Catat pelunasan → status **Sudah diambil** → Simpan → **WA: Kirim nota**. Garansi mulai dihitung hari ini |
| Mau dijadikan artikel | **Jadikan artikel** → rapikan tulisan & keterangan foto → status **Terbit** → Simpan |

Catatan:
- Semua perubahan baru terkirim saat menekan **Simpan**. Tanda **"Belum disimpan"** muncul kalau ada yang belum terkirim.
- Halaman pelanggan dan artikel ikut berubah **±1 menit** setelah disimpan (GitHub memperbarui situs).
- Usahakan tidak lebih dari ±10 kali Simpan per jam. Gabungkan beberapa perubahan dalam sekali Simpan.

## Yang dilihat pelanggan

- **cek-servis.html** dan **nota.html**: hanya terbuka dengan kode servis + 4 digit terakhir HP.
- Terlihat: jenis/merk gitar, status, estimasi, pesan dari bengkel, rincian biaya, foto berlabel **Tampil**, dan (setelah selesai) foto sesudah, saran, serta garansi.
- Tidak pernah terlihat: nomor HP lengkap, catatan internal, foto yang disembunyikan.
- Foto **sebelum** servis disembunyikan secara bawaan; ketuk labelnya di admin untuk menampilkan.
- Kalau nomor HP pelanggan diubah, 4 digit untuk cek status ikut berubah. Kirim ulang tautan lewat WA.

## Keamanan & perawatan

- **HP hilang?** Buka https://github.com/settings/personal-access-tokens → token **Admin servis AYRI** → **Revoke**. Buat token baru (langkah 2) dan pasang di HP baru. Data tidak hilang karena tersimpan di GitHub.
- **Lupa PIN?** Di layar PIN tekan **Pasang ulang token**, lalu tempel token baru.
- **Ganti HP**: cabut token HP lama (cara sama seperti HP hilang), lalu buat token baru di HP baru.
- **Token kedaluwarsa** (kalau memilih masa berlaku): admin menampilkan pesan "Token GitHub ditolak". Buat token baru (langkah 2), lalu di admin tekan **Hapus token dari perangkat ini** dan pasang yang baru.
- **Cadangan**: semua riwayat perubahan tersimpan otomatis di repo `ayri-servis-data`. Tombol **Unduh cadangan** di daftar servis menyimpan salinan JSON, misalnya ke Google Drive sebulan sekali.
- **Kapasitas**: situs GitHub Pages maksimal 1 GB. Foto servis dikecilkan ke ±150 KB, jadi cukup untuk ribuan foto. Kalau suatu saat mendekati batas, minta Claude membuat fitur arsip yang menghapus foto servis lama yang garansinya sudah habis.

## Mengubah pengaturan toko

Semua ada di [`layanan-config.js`](layanan-config.js): alamat, jam buka, nomor WA, rekening, persen DP, daftar jasa + harga + garansi, dan ketentuan nota.
Aturan penitipan saat ini:
- `gratisTitipHari` (**14 hari**), `biayaTitipPerHari` (**5000**), `garansiHangusHari` (**30 hari**), `lepasTanggungJawabHari` (**90 hari**): aturan gitar yang sudah selesai tapi belum diambil. Dihitung dari tanggal status **Selesai**; batas gratis, biaya yang berjalan, dan garansi hangus tampil di pesan WA, halaman cek status, dan nota.
- `pengingatHari` (**[7, 12]**): hari ke- berapa setelah selesai admin diberi tanda untuk mengirim pengingat.

## Bantuan dari Claude

Pekerjaan harian cukup lewat admin. Claude bisa membantu untuk:
- merapikan atau menulis artikel dari hasil servis;
- rekap bulanan (kirim file **Unduh cadangan** kalau perlu);
- mengubah daftar harga, ketentuan, atau tampilan.
