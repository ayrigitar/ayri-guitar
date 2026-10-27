# Uji otomatis

Menjalankan semuanya (butuh Node.js 22 atau lebih baru, tanpa paket tambahan):

```
node --test
```

Uji memuat kode ASLI dari repo (`layanan.js`, `admin.js`, `artikel-*.js`, `sw.js`, halaman HTML) ke dalam sandbox, dan memakai GitHub palsu di memori
(`helper.js`) yang meniru aturan penting GitHub, termasuk "Update is not a fast forward", jadi tidak menyentuh data toko yang asli.

| File | Yang diperiksa |
|---|---|
| `api.test.js` | perilaku dasar: servis, stok, jual, kas, absen, opname, tebus, artikel, offline, pemindahan data |
| `balapan.test.js` | dua perangkat menyimpan bersamaan, layar basi, antrian offline yang bentrok |
| `gagal-sebagian.test.js` | gagal di tengah jalan lalu Simpan ulang; antrian offline berisi beberapa jenis transaksi |
| `pin.test.js` | PIN, penguncian setelah salah 5 kali, token tidak di sessionStorage, cadangan terenkripsi |
| `hitungan.test.js` | hitungan uang, DP, penitipan, pembatalan pesanan, format |
| `artikel.test.js` | teks artikel aman dari penyisipan HTML, pembuat halaman menolak alamat berbahaya |
| `tuner.test.js` | mesin tuner: akurasi (< 1 sen) dan kecepatan jarum muncul (< 200 ms) pada petikan senar buatan |
| `admin-ui.test.js` | tombol aksi admin memakai komponen seragam (id tetap ada), poster Bagikan memuat foto lewat GitHub |
| `chord.test.js` | mesin chord (bentuk jari, kecepatan) dan pembaca chart |
| `halaman.test.js` | sintaks semua skrip, urutan `util.js`, tautan lokal, aturan keamanan halaman admin (CSP), sitemap, service worker, tidak ada token di repo |

Untuk melihat admin asli dengan data contoh (tanpa menyentuh data toko): `node tests/server-admin.js 8783`, lalu buka http://127.0.0.1:8783/admin.html (token apa saja, mis. `tok-owner`, dan PIN 6 angka). Rinciannya ada di komentar atas `tests/server-admin.js`.

Sebelum membuat PR yang mengubah halaman, jalankan juga `node scripts/perbarui-sitemap.js` supaya tanggal di `sitemap.xml` ikut diperbarui.
