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
3. Buat **PIN** minimal 6 karakter (boleh angka atau huruf; makin panjang makin aman; bukan tanggal lahir), ketik ulang, lalu tekan **Pasang**.
4. Menu ⋮ Chrome → **Tambahkan ke layar utama**, supaya admin bisa dibuka seperti aplikasi.

Setelah terpasang, token tidak perlu disimpan di tempat lain. Kalau suatu saat lupa PIN, cukup buat token baru.

- PIN diminta lagi setiap halaman admin dibuka ulang atau dimuat ulang (token hanya hidup di memori selama admin terbuka).
- Salah PIN 5 kali berturut-turut mengunci admin sementara (5 menit, makin lama bila terus salah). Itu menghalangi orang yang menebak-nebak PIN di HP yang hilang.
- PIN bisa diganti kapan saja lewat tombol **Ganti PIN** di bagian bawah halaman Servis.

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

## Beli dengan hak tebus (menu **Tebus**)

Dipakai saat orang butuh uang dan menyerahkan gitarnya. Bentuknya **jual beli dengan hak membeli kembali** (KUHPerdata Pasal 1519 dst.), bukan gadai:
toko **membeli** gitar, dan penjual boleh **membeli kembali** sampai batas tebus dengan harga yang **sama persis dengan harga beli** (kebijakan toko: tanpa biaya tambahan).

> Untung toko datang dari **harga beli yang tepat** (di bawah harga pasar) dan dari gitar yang **tidak ditebus** (masuk stok toko), bukan dari bunga. Menambah "bunga"/biaya per bulan (misalnya beli Rp600.000, tebus Rp700.000, atau wajib beli senar) tetap dianggap **pinjaman berbunga dengan jaminan**, dan kalau rutin termasuk usaha pergadaian yang wajib berizin OJK. Menawarkan servis/senar saat penebusan boleh, asal **tidak diwajibkan**. Sebelum dipakai rutin, minta advokat memeriksa ketentuannya sekali.

| Kejadian | Yang dilakukan di admin |
|---|---|
| Gitar dibeli | **Tebus** → **+ Beli gitar** → data penjual (+ NIK), gitar (no. seri), harga beli, batas tebus (30/60/90 hari), foto gitar & KTP → **Simpan** → **WA: Bukti & minta SETUJU** |
| Penjual membalas SETUJU | Centang **Penjual sudah membalas SETUJU** → Simpan (tanggalnya tercatat di surat perjanjian) |
| Mendekati batas | Daftar tebus menampilkan **🔔** 7 hari dan 1 hari sebelum batas → **Ingatkan via WA** |
| Penjual menebus | Terima pembayaran → status **Sudah dibeli kembali** → Simpan → **WA: Terima kasih** |
| Lewat batas, tidak ditebus | Status **Milik toko** → Simpan → **WA: Masa tebus berakhir** → **Masukkan ke stok** (foto gitar ikut pindah, KTP tidak), lalu isi harga jualnya |

- **KTP:** selalu lihat KTP asli dan catat nama sesuai KTP (NIK opsional). **Foto KTP** disarankan untuk penjual yang belum dikenal atau harga beli di atas Rp1 juta (admin memberi saran). Foto gitar dan KTP **hanya disimpan di repo privat** (terkunci) dan tidak pernah ada di situs.
- **Hapus foto KTP** setelah tidak diperlukan: daftar tebus menandai 🪪 data yang sudah dibeli kembali lebih dari 3 bulan (atau dibatalkan); tekan **Hapus foto KTP**. Untuk gitar yang menjadi **milik toko**, foto KTP tetap disimpan sebagai bukti asal-usul barang.
- Kalimat untuk penjual: *"Untuk keamanan bersama, kami catat KTP-nya ya Kak. Fotonya disimpan terkunci, tidak dibagikan ke siapa pun, dan dihapus setelah transaksi selesai."*
- Penjual bisa membuka **surat perjanjian** di `ayrigitar.com/perjanjian.html` dengan kode `TBS-…` + 4 digit terakhir HP. NIK dan HP tampil disamarkan.
- Ketentuan surat perjanjian bisa diubah di `layanan-config.js` bagian `tebus`.

## Stok & katalog website (menu **Stok**)

Catatan barang dagangan: **gitar** (baru/bekas, termasuk gitar tebus yang menjadi milik toko) dan **aksesoris** (senar, capo, tuner, strap, kabel, case, efek, part, perawatan; daftarnya di `layanan-config.js` → `kategoriAksesoris`).
Barang yang **tersedia**, **ada harga jual**, dan dicentang **🌐 Tampilkan di katalog website** otomatis tampil di **https://ayrigitar.com/katalog.html** (±1 menit setelah disimpan).

| Kejadian | Yang dilakukan di admin |
|---|---|
| Barang masuk | **Stok** → **+ Tambah stok** → pilih **Gitar/Aksesoris** dan **Baru/Used** (untuk Used, pilih juga **Tingkat kondisi**: Mint, Excellent, Very Good, atau Good; tampil di poster, katalog, dan teks penawaran) → nama/merk, warna atau varian, deskripsi, **modal**, **harga jual**, jumlah, asal barang (opsional), foto → **Simpan** |
| Mau menawarkan | **Tawarkan via WA** → pilih kontak, grup, atau status WhatsApp. Pesannya berisi link foto di katalog |
| Ada yang dipesan | Status **Dipesan** → Simpan (di katalog tampil label "Dipesan") |
| Terjual | Bagian **Penjualan** → jumlah, harga, catatan → **Catat penjualan** → **Simpan**. Stok berkurang otomatis; bila habis, status **Terjual** dan barang hilang dari katalog |
| Tidak mau ditampilkan | Hilangkan centang **🌐 Tampilkan di katalog website** → Simpan |

- **Yang tampil di website:** nama, jenis/kategori, kondisi, warna/varian, deskripsi, harga jual, foto, label "Sisa N" untuk aksesoris yang tinggal sedikit, dan tombol pesan via WhatsApp (pesan otomatis berisi kode barang).
- **Yang tidak pernah tampil:** modal, asal barang, nomor seri, catatan internal, dan catatan penjualan.
- **Foto produk** bersifat publik (tidak dikunci) karena memang untuk dijual. Foto pertama menjadi sampul.
- Bagian atas daftar menampilkan **rekap**: unit tersedia (gitar baru/bekas/aksesoris), jumlah barang di katalog, modal di stok, perkiraan untung, serta penjualan **bulan ini**.
- Barang yang lebih dari 90 hari di stok ditandai merah, sebagai tanda untuk dipromosikan atau diturunkan harganya.

## Sewa gitar (di menu **Servis**, tab **Sewa gitar**)

Gitar **used** di Stok bisa disewakan; unit tetap milik toko dan stoknya tidak berkurang. Selama disewa, unit itu tidak muncul di kasir.

| Langkah | Cara |
|---|---|
| Sewa baru | **Servis** → tab **Sewa gitar** → **+ Sewa baru** (atau di halaman stok tekan **Sewakan gitar ini**) → nama & WA penyewa, lama sewa, tarif, deposit → catat bayar sewa + deposit → foto kondisi gitar (dan KTP, hanya owner) → **Simpan sewa** → **WA: Kirim bukti & ketentuan** |
| Perpanjang | Buka sewa → **Perpanjang** (hari) → catat pembayaran tambahan |
| Penawaran ke calon penyewa | Di **Stok**, kartu gitar used punya tombol **Sewa** → formulir sewa unit itu → **Kirim penawaran & foto** (tarif, deposit, ketentuan, link foto; tanpa nomor, kontaknya dipilih di WhatsApp). Setelah calon penyewa setuju, isi nama & WA lalu **Simpan sewa** |
| Pengingat | Sewa yang kembali besok, hari ini, atau telat muncul di **Hari ini**; tombol **Pengingat kembali** membuka WA |
| Gitar kembali | **Gitar sudah dikembalikan** → isi biaya kerusakan bila ada → deposit dikembalikan dikurangi kekurangan sewa/ganti rugi → **Selesaikan sewa** → **WA: Kabari pengembalian** |

Tarif standar untuk unit di bawah Rp2 juta (ubah di `layanan-config.js` bagian `sewa`): 1 hari Rp100.000, 2 hari Rp150.000, 3 hari Rp175.000, lalu +Rp25.000 per hari; 7 hari Rp300.000. Deposit awal 10% dari harga jual gitar. Biaya sewa dan deposit dibayar di muka. Unit Rp2 juta ke atas: biaya sewa diisi sendiri; untuk semua unit, biaya dan deposit bisa diubah per transaksi. Senar dari toko baru: senar putus didenda Rp10.000 per senar (maks. 6 senar cadangan di tas = Rp60.000), dihitung otomatis di layar pengembalian. Gitar dikembalikan ke toko pada jam operasional. Ada toleransi telat 1x24 jam tanpa biaya (`toleransiHari` di config); lewat itu dihitung tambahan hari sesuai daftar tarif; kembali lebih awal tidak mengurangi biaya. Deposit bukan pendapatan: di **Rekap** hanya uang sewa dan deposit yang dipotong yang dihitung sebagai pendapatan sewa. Foto KTP hanya disimpan di repo owner.

## Katalog & halaman per unit

Barang yang tersedia, berharga jual, dan berlabel 🌐 tampil di **katalog website** (gaya marketplace: kartu foto, harga, lencana Baru/Used + tingkat kondisi, pencarian, filter jenis, urutan harga). Tiap barang punya **halaman sendiri** (foto geser, spesifikasi, deskripsi, tombol WhatsApp, barang lainnya) dan **tautan yang bisa dibagikan**: `ayrigitar.com/unit/KODE.html`. Tautan itu tampil dengan foto dan harga saat dikirim lewat WhatsApp. Tautan muncul otomatis di teks **Bagikan** dan di **penawaran sewa**, dan tombol **Lihat halaman unit** ada di halaman stok. Barang yang terjual, ditahan, atau disembunyikan otomatis hilang dari katalog dan halamannya dihapus; tautan lama akan menampilkan "barang sudah terjual".

## Yang dilihat pelanggan

- **cek-servis.html** dan **nota.html**: hanya terbuka dengan kode servis + 4 digit terakhir HP.
- Terlihat: jenis/merk gitar, status, estimasi, pesan dari bengkel, rincian biaya, foto berlabel **Tampil**, dan (setelah selesai) foto sesudah, saran, serta garansi.
- Tidak pernah terlihat: nomor HP lengkap, catatan internal, foto yang disembunyikan.
- Semua foto tampil ke pelanggan secara bawaan (label **Tampil**); ketuk labelnya di admin bila ada foto yang ingin disembunyikan. Setelah servis selesai, pelanggan melihat bagian **Sebelum & sesudah** berdampingan.
- Kalau nomor HP pelanggan diubah, 4 digit untuk cek status ikut berubah. Kirim ulang tautan lewat WA.

## Karyawan & tablet toko (owner / karyawan)

Admin bisa dipakai dua peran:

| | Owner (HP/laptop Anda) | Karyawan (tablet toko) |
|---|---|---|
| Kasir, Servis, Stok, Jual | ✅ | ✅ |
| Harga modal, asal barang, untung | ✅ | ❌ tidak terlihat |
| Tebus (termasuk foto KTP), Artikel | ✅ | ❌ menu tersembunyi |
| Menghapus data | ✅ | ❌ |

Pembatasan ini **bukan hanya disembunyikan di layar**. Data rahasia ada di repo yang memang tidak bisa dibuka token tablet. Caranya:

- `ayri-servis-data` (repo yang sudah ada) menjadi repo **khusus owner**: tebus, foto KTP, harga modal, dan seluruh riwayat lama.
- Repo baru `ayri-toko-data` menjadi repo **bersama**: servis, stok **tanpa harga modal**, penjualan, artikel. Riwayatnya baru, jadi tidak ada data rahasia lama di dalamnya.

### Langkah A: buat repo bersama
1. Buka **https://github.com/new** (masuk sebagai `ayrigitar`).
2. **Repository name**: `ayri-toko-data`, pilih **Private**, centang **Add a README file**, lalu **Create repository**.

### Langkah B: beri token owner akses ke repo baru
1. Buka **https://github.com/settings/personal-access-tokens**, lalu pilih token **Admin servis AYRI** di HP Anda.
2. **Repository access** → tambahkan **ayri-toko-data** (sehingga ada tiga: ayri-guitar, ayri-servis-data, ayri-toko-data) → **Update**.
3. Ulangi untuk token laptop bila ada. Token tidak berubah, jadi tidak perlu dipasang ulang.

### Langkah C: minta Claude mengaktifkan pemisahan
Kabari Claude bahwa langkah A dan B sudah selesai. Claude mengisi `repoBersama: 'ayri-toko-data'` di `layanan-config.js`.
Setelah situs diperbarui, buka admin di HP owner. Akan muncul layar **Pisahkan data owner & karyawan** → tekan **Pindahkan sekarang** (sekali saja).

### Langkah D: pasang di tablet toko
1. Di tablet, buat token baru di **https://github.com/settings/personal-access-tokens/new**:
   - **Token name**: `Tablet toko AYRI`
   - **Expiration**: 1 tahun (atau No expiration, asal dicabut bila tablet hilang)
   - **Repository access** → **Only select repositories** → **ayri-guitar** dan **ayri-toko-data** saja (**jangan** pilih ayri-servis-data)
   - **Contents**: **Read and write**
2. Buka **https://ayrigitar.com/admin.html** di tablet, tempel token, buat PIN khusus tablet, lalu **Pasang**. Di header akan tertulis **Karyawan**.

> Karyawan yang keluar kerja: ganti PIN tablet (Hapus token dari perangkat ini → pasang ulang dengan PIN baru), atau cabut token tablet dan buat yang baru.
> Token tablet tetap bisa mengubah situs (karena nota servis disimpan di sana), jadi berikan hanya kepada karyawan yang dipercaya.

## Hari ini & kas harian

- **Hari ini** adalah halaman pertama admin. Isinya hal yang perlu ditindak hari itu: DP barang yang lewat atau tinggal ≤3 hari, servis lewat estimasi, gitar selesai yang perlu diingatkan, tebus jatuh tempo, karyawan yang belum absen, laporan opname, aksesoris hampir habis, dan pengingat cadangan (tiap 7 hari).
- **Kas harian**:
  - **Buka kasir** pagi hari dengan saldo awal laci.
  - Catat **pengeluaran** (dari laci atau rekening) dengan kategorinya.
  - Malam hari hitung uang laci, lalu **Tutup kasir**.
  - Admin menghitung uang yang *seharusnya* ada (saldo awal + tunai masuk dari transaksi − pengeluaran tunai) dan menampilkan selisihnya.
- **Riwayat kas & pengeluaran** per bulan. Pengeluaran juga masuk **Rekap** sebagai perkiraan laba.

## Jam masuk, stock opname, rekap

- **Jam masuk** (menu Jam, di HP lewat **Lainnya**): karyawan memilih namanya, lalu tekan **Masuk sekarang** dan **Keluar** saat pulang. Status *Tepat waktu* / *Terlambat* dihitung dari jadwal masing-masing.
  - Owner mengatur nama karyawan, jam masuk–pulang, jam masuk Jumat, dan toleransi terlambat di **Atur karyawan & shift**.
  - Waktu diambil dari jam perangkat, jadi pastikan jam tablet benar (otomatis dari internet).
- **Stock opname** (tombol di halaman Stok, atau **Lainnya** di HP): isi jumlah fisik yang berbeda dari sistem, beserta alasannya.
  - Laporan dari karyawan *menunggu owner*; owner menekan **Setujui & sesuaikan stok**.
  - Owner yang menghitung sendiri langsung menyesuaikan stok.
  - Nilai rupiah selisih hanya terlihat oleh owner.
- **Rekap bulanan** (khusus owner):
  - uang masuk menurut tanggal bayar (barang, servis, tebus), uang keluar (beli gitar tebus, uang kembali karena batal);
  - untung kotor barang (harga deal − modal) dan rincian tunai/transfer untuk dicocokkan dengan kas dan mutasi rekening;
  - grafik, barang terlaris, log transaksi, dan **Unduh CSV** untuk Excel.

## Aplikasi di HP/PC & mode offline

- **Pasang sebagai aplikasi**: buka admin di Chrome (HP/tablet) atau Edge (PC), lalu pilih **Pasang aplikasi** (menu Lainnya, atau ikon pasang di bilah alamat). Ikon **AYRI POS** muncul di layar utama dan terbuka tanpa bilah browser.
- **Internet putus**: admin tetap terbuka dengan data terakhir di perangkat. Penjualan di kasir, pelunasan servis, buka/tutup kasir, pengeluaran, dan jam masuk tetap bisa dicatat. Di atas tampil **Offline · N antri**.
- Begitu online lagi, antrian **dikirim otomatis** (atau ketuk label itu untuk mengirim sekarang). Yang perlu internet: foto baru, stok, tebus, artikel, opname, pengaturan karyawan.
- Bila ada transaksi yang ditolak saat dikirim (mis. barang yang sama sudah terjual dari perangkat lain), label berubah merah **gagal terkirim**. Ketuk untuk melihat rinciannya, lalu catat ulang.
- **Dua perangkat mengubah catatan yang sama**: perangkat yang menyimpan belakangan ditolak dengan pesan *Data ini baru diubah di perangkat lain*. Tekan **OK** untuk memuat data terbaru, lalu ulangi perubahan Anda. Tidak ada data yang tertimpa diam-diam. Penjualan, pengeluaran kas, dan jam masuk dari dua perangkat sekaligus selalu tersimpan dua-duanya.
- **Tutup kasir** selalu menghitung ulang dari transaksi terbaru semua perangkat. Bila ada transaksi baru dari perangkat lain sejak layar dibuka, admin memberi tahu angka "seharusnya ada di laci" yang baru sebelum kasir ditutup.
- **Aplikasi Android (APK)**: ada dua aplikasi. **AYRI Alat Latihan** bisa diunduh siapa saja di halaman Releases repo ayri-guitar (tombol di beranda, hanya tampil di HP Android). Versi baru: buat tag di `ayri-aplikasi`, lalu salin `ayri-alat-latihan.apk` ke rilis baru di `ayri-guitar` (tandai *latest*); tautan di beranda otomatis mengarah ke versi terbaru. **AYRI POS** hanya ada di Releases repo privat `ayri-aplikasi`. Pasang di HP owner dan tablet toko, lalu pasang token dan PIN seperti biasa. Saat memasang, Android akan meminta izin "instal dari sumber ini". Izinkan sekali untuk Chrome atau File Manager.
- Fitur baru di situs langsung ada di aplikasi, jadi tidak perlu memasang ulang APK. APK baru hanya dibuat bila bagian aplikasinya berubah. Kunci tanda tangan APK ada di folder `Documents\ayri-kunci-aplikasi` di PC. Simpan salinannya, karena tanpa kunci itu update APK tidak bisa dipasang.
- Salinan data di perangkat terkunci PIN. Jangan **Pasang ulang token** selagi masih ada antrian, karena antrian ikut terhapus.

## Cetak struk ke printer Bluetooth (aplikasi AYRI POS)

- Butuh aplikasi **AYRI POS versi 1.3.0** ke atas. Printer thermal 58 mm Bluetooth biasa (mis. iWare) langsung bisa.
- Sekali saja: nyalakan printer, lalu **pasangkan di menu Bluetooth HP/tablet** (Pengaturan → Bluetooth → pilih printer; PIN biasanya 0000 atau 1234).
- Setelah transaksi, tekan **Cetak struk 58 mm**. Pertama kali, aplikasi minta izin *Perangkat sekitar* dan menanyakan printer mana yang dipakai. Setelah itu struk langsung keluar tanpa dialog.
- **Ganti printer**: tombol di layar struk. Setelah memilih, printer mencetak tulisan "Printer siap dipakai".
- Bila muncul "Printer tidak tersambung": pastikan printer menyala, kertas ada, dan tidak sedang tersambung ke HP lain.
- **Simpan PDF** tetap lewat menu cetak Android. Di browser biasa (bukan aplikasi), Cetak struk juga memakai menu cetak.

## Keamanan & perawatan

- **HP hilang?** Buka https://github.com/settings/personal-access-tokens → token **Admin servis AYRI** → **Revoke**. Buat token baru (langkah 2) dan pasang di HP baru. Data tidak hilang karena tersimpan di GitHub.
- **Lupa PIN?** Di layar PIN tekan **Pasang ulang token**, lalu tempel token baru.
- **Ganti HP**: cabut token HP lama (cara sama seperti HP hilang), lalu buat token baru di HP baru.
- **Token kedaluwarsa** (kalau memilih masa berlaku): admin menampilkan pesan "Token GitHub ditolak". Buat token baru (langkah 2), lalu di admin tekan **Hapus token dari perangkat ini** dan pasang yang baru.
- **Cadangan**: semua riwayat perubahan tersimpan otomatis di repo `ayri-servis-data`. Tombol **Unduh cadangan** (di daftar servis, dan pengingat di halaman Hari ini) menyimpan salinan, misalnya ke Google Drive sebulan sekali.
  - Cadangan berisi nama dan nomor HP pelanggan, jadi **dikunci dengan sandi** yang Anda ketik saat mengunduh (minimal 6 karakter). **Catat sandinya**: tanpa sandi, cadangan tidak bisa dibuka siapa pun, termasuk Claude.
  - Untuk membaca isinya: tombol **Buka cadangan** di bagian bawah halaman Servis, pilih berkas `.ayri.json`, ketik sandinya; hasilnya berkas `.json` biasa. Hapus berkas hasil itu bila sudah tidak dipakai.
- **Kapasitas**: situs GitHub Pages maksimal 1 GB. Foto servis dikecilkan ke ±150 KB, jadi cukup untuk ribuan foto. Kalau suatu saat mendekati batas, minta Claude membuat fitur arsip yang menghapus foto servis lama yang garansinya sudah habis.

## Mengubah pengaturan toko

Semua ada di [`layanan-config.js`](layanan-config.js): alamat, jam buka, nomor WA, rekening, persen DP, daftar jasa + harga + garansi, dan ketentuan nota.
Aturan penitipan saat ini:
- `gratisTitipHari` (**14 hari**), `biayaTitipPerHari` (**5000**), `garansiHangusHari` (**30 hari**), `penyimpananLamaHari` (**90 hari**): aturan gitar yang sudah selesai tapi belum diambil. Dihitung dari tanggal status **Selesai**; batas gratis, biaya yang berjalan, dan garansi hangus tampil di pesan WA, halaman cek status, dan nota.
- `pengingatHari` (**[7, 12]**): hari ke- berapa setelah selesai admin diberi tanda untuk mengirim pengingat.

## Bantuan dari Claude

Pekerjaan harian cukup lewat admin. Claude bisa membantu untuk:
- merapikan atau menulis artikel dari hasil servis;
- rekap bulanan (kirim file **Unduh cadangan** kalau perlu);
- mengubah daftar harga, ketentuan, atau tampilan.
