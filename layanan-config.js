/* =====================================================================
   Pengaturan layanan servis Toko Gitar AYRI (admin, cek status, nota, artikel).
   File ini boleh diubah sendiri lewat GitHub; simpan, tunggu ±1 menit, situs ikut berubah.

   Tidak ada server: data lengkap servis disimpan di repo GitHub PRIVAT (repoData),
   data untuk pelanggan disimpan terenkripsi di situs ini (repoSitus).
   JANGAN PERNAH menaruh token GitHub di file ini; token dimasukkan langsung di halaman admin.
   ===================================================================== */
var AYRI_LAYANAN = {
    situsUrl: 'https://ayrigitar.com/',

    github: {
        pemilik: 'ayrigitar',
        repoSitus: 'ayri-guitar',        /* repo situs ini (publik) */
        repoData: 'ayri-servis-data',    /* repo PRIVAT berisi data pelanggan. Setelah dipisah: KHUSUS OWNER (tebus, KTP, modal stok) */
        /* repo PRIVAT bersama owner + karyawan (servis, stok tanpa modal, penjualan, artikel), riwayatnya baru.
           Kosong = belum dipisah: semua yang membuka admin dianggap owner. Lihat panduan-admin.md, bagian Karyawan. */
        repoBersama: 'ayri-toko-data',
        cabang: 'main'
    },

    toko: {
        nama: 'Toko Gitar AYRI',
        alamat: 'Jln. Jabaru II, Bojong Baru, Pasirkuda, Kota Bogor',
        jam: 'Senin–Minggu 12.00–19.00 (Jumat mulai 13.00)',
        wa: '6285795738637',
        rekening: [
            { bank: 'BCA', nomor: '6395460912', atasNama: 'Rio Alam Nur' }
        ]
    },

    /* aturan pembayaran: pengerjaan dimulai setelah DP jasa + part lunas */
    dpJasaPersen: 50,
    bulatkanKe: 1000,

    /* gitar sudah selesai tapi belum diambil (dihitung dari tanggal status Selesai) */
    gratisTitipHari: 14,                   /* gratis dititipkan sampai sekian hari */
    biayaTitipPerHari: 5000,               /* biaya penitipan per hari setelah masa gratis (Rp) */
    garansiHangusHari: 30,                 /* garansi hangus bila belum diambil lewat sekian hari */
    penyimpananLamaHari: 90,               /* setelah sekian hari: pemilik dihubungi tertulis, gitar tetap disimpan */
    pengingatHari: [7, 12],                /* admin diingatkan mengirim WA pengingat pada hari ke- ini */

    /* garansi: '7h' = 7 hari, '1b' = 1 bulan, '6b' = 6 bulan */
    syaratJatuh: 'Berlaku selama gitar tidak jatuh atau terbentur kembali.',

    /* daftar jasa yang sering dipakai (harga awal; bisa diubah per servis) */
    katalogJasa: [
        { grup: 'Setup & Perawatan', nama: 'Basic Setup (Akustik)', harga: 100000, garansi: '7h' },
        { grup: 'Setup & Perawatan', nama: 'Basic Setup (Elektrik)', harga: 150000, garansi: '7h' },
        { grup: 'Setup & Perawatan', nama: 'Full Setup (Akustik)', harga: 350000, garansi: '7h' },
        { grup: 'Setup & Perawatan', nama: 'Full Setup (Elektrik)', harga: 400000, garansi: '7h' },
        { grup: 'Custom Nut & Saddle', nama: 'Custom Nut & Saddle Akustik + Basic Setup', harga: 400000, garansi: '7h' },
        { grup: 'Custom Nut & Saddle', nama: 'Custom Nut Elektrik + Basic Setup', harga: 300000, garansi: '7h' },
        { grup: 'Fret & Neck', nama: 'Refret Nickel + Basic Setup (termasuk fret)', harga: 500000, garansi: '7h' },
        { grup: 'Fret & Neck', nama: 'Refret Stainless + Basic Setup (fret belum termasuk)', harga: 600000, garansi: '7h' },
        { grup: 'Fret & Neck', nama: 'Ganti Fretboard + Refret', harga: 1000000, garansi: '7h' },
        { grup: 'Fret & Neck', nama: 'Ganti Truss Rod + Basic Setup', harga: 500000, garansi: '7h' },
        { grup: 'Kelistrikan', nama: 'Wiring Gitar Elektrik + Basic Setup', harga: 350000, garansi: '1b' },
        { grup: 'Kelistrikan', nama: 'Shielding Copper Sheet + Basic Setup', harga: 500000, garansi: '1b' },
        { grup: 'Kelistrikan', nama: 'Perbaikan Kelistrikan / Wiring', harga: 0, garansi: '1b' },
        { grup: 'Repair Berat', nama: 'Repair Neck Patah', harga: 300000, garansi: '6b', jatuh: true },
        { grup: 'Repair Berat', nama: 'Repair Bridge Lepas', harga: 300000, garansi: '6b', jatuh: true },
        { grup: 'Repair Berat', nama: 'Repair Body Terbuka', harga: 0, garansi: '6b', jatuh: true },
        { grup: 'Lainnya', nama: 'Ganti Senar', harga: 0, garansi: '' }
    ],

    jenisGitar: ['Akustik', 'Akustik Elektrik', 'Klasik', 'Elektrik', 'Bass', 'Ukulele', 'Lainnya'],
    /* nama barang ditulis "Gitar <jenis> <merk>"; jenis berikut berdiri sendiri, tanpa kata "Gitar" (mis. "Bass Fender Aerodyne") */
    jenisTanpaGitar: ['Bass', 'Ukulele'],
    /* tingkat kondisi gitar bekas (tampil di poster, katalog, dan pesan WA): kunci, nama tampil, arti singkat untuk bantuan di admin */
    tingkatKondisi: [
        ['mint', 'Mint', 'nyaris seperti baru, tanpa cacat berarti'],
        ['excellent', 'Excellent', 'pemakaian sangat ringan, cacat tipis hampir tak terlihat'],
        ['very_good', 'Very Good', 'pemakaian wajar, goresan halus atau lecet kecil, fungsi sempurna'],
        ['good', 'Good', 'bekas pakai terlihat (goresan, penyok kecil), fungsi tetap baik']
    ],
    /* ---------- sewa gitar (unit used dari stok) ----------
       Tarif & deposit hanya nilai awal di formulir; bisa diubah per transaksi. */
    sewa: {
        tarifHari: 100000,             /* tarif per hari */
        tarifMinggu: 600000,           /* paket 7 hari (bayar seperti 6 hari); 0 = tanpa paket mingguan */
        depositPersen: 30,             /* deposit awal = % harga jual unit ... */
        depositMin: 500000,            /* ... tetapi tidak kurang dari ini */
        depositMaks: 3000000,          /* ... dan tidak lebih dari ini (0 = tanpa batas) */
        maksHari: 30,                  /* durasi sewa terpanjang yang bisa dipilih */
        /* tercetak di pesan WhatsApp; {batas}, {tarif}, {deposit} diganti otomatis */
        ketentuan: [
            'Gitar diserahkan dalam kondisi sesuai catatan/foto saat serah terima, dan harus dikembalikan dalam kondisi yang sama paling lambat {batas}.',
            'Deposit {deposit} dibayar saat serah terima dan dikembalikan penuh saat gitar kembali tanpa kerusakan.',
            'Bila ada kerusakan atau kehilangan, biaya perbaikan/penggantian dipotong dari deposit; kekurangannya ditanggung penyewa.',
            'Keterlambatan dihitung sebagai tambahan hari sewa dengan tarif normal ({tarif}); pengembalian lebih awal tidak mengurangi biaya sewa.',
            'Gitar tidak boleh dipinjamkan, disewakan kembali, atau dijadikan jaminan kepada pihak lain.'
        ]
    },

    /* menu Stok & katalog website: kategori aksesoris, dan kapan "sisa N" ditampilkan */
    kategoriAksesoris: ['Senar', 'Capo', 'Tuner', 'Strap', 'Kabel', 'Case & tas', 'Efek & amplifier', 'Part & pickup', 'Perawatan', 'Lainnya'],
    katalogSisaTampil: 3,

    /* tercetak di nota; {dp}, {gratis}, {biaya}, {hangus}, {lepas} diganti otomatis */
    ketentuan: [
        'Pengerjaan dimulai setelah DP {dp}% biaya jasa dan pembayaran lunas part/suku cadang kami terima.',
        'Bila ditemukan kerusakan lain, biaya dan estimasi dapat berubah; kami kabari dulu sebelum dikerjakan.',
        'Garansi dihitung sejak gitar diambil dan hanya berlaku untuk pekerjaan yang tercantum di nota ini.',
        'Garansi tidak berlaku bila gitar dibongkar atau diperbaiki pihak lain.',
        'Gitar yang sudah selesai gratis dititipkan sampai {gratis} hari sejak kami kabari. Setelah itu dikenakan biaya penitipan {biaya}. Bila tidak diambil lebih dari {hangus} hari, garansi servis hangus.',
        'Bila gitar belum diambil lebih dari {lepas} hari sejak dinyatakan selesai, kami akan menghubungi pemilik secara tertulis (WhatsApp). Gitar tetap kami simpan dengan baik dan biaya penitipan tetap berjalan. Perubahan kondisi karena penyimpanan lama (misalnya senar berkarat atau setelan neck bergeser) tidak termasuk garansi servis.',
        'Klaim garansi wajib menyebutkan kode servis atau menunjukkan nota ini.'
    ],

    /* ---------- beli gitar dengan hak tebus (jual beli dengan hak membeli kembali, KUHPerdata Pasal 1519 dst.) ----------
       Toko MEMBELI gitar; penjual boleh membeli kembali sampai batas tebus dengan harga yang SAMA dengan harga beli
       Kebijakan toko: tanpa biaya tambahan. Menambah "bunga"/biaya per bulan menjadikannya pinjaman berbunga. */
    tebus: {
        batasHari: 30,                 /* batas tebus bawaan (hari sejak beli) */
        maksHari: 90,                  /* batas tebus terpanjang yang boleh dipilih */
        pengingatHari: [7, 1],         /* pengingat WA sekian hari sebelum batas tebus */
        fotoKtpMinHarga: 1000000,      /* sarankan foto KTP bila harga beli di atas ini (atau penjual belum dikenal) */
        hapusKtpHari: 90,              /* foto KTP disarankan dihapus sekian hari setelah gitar dibeli kembali */
        /* tercetak di surat perjanjian; {batas}, {tebus} diganti otomatis */
        ketentuan: [
            'Penjual menyatakan gitar ini miliknya sendiri, bukan barang curian, jaminan, atau sengketa, dan menyerahkan kepemilikannya kepada Toko Gitar AYRI dengan harga beli yang tercantum.',
            'Penjual berhak membeli kembali gitar ini paling lambat tanggal {batas} dengan harga {tebus}.',
            'Selama masa tersebut, toko menyimpan gitar dengan baik dan tidak menjualnya kepada pihak lain.',
            'Bila sampai tanggal {batas} penjual tidak membeli kembali, hak membeli kembali berakhir dan gitar sepenuhnya menjadi milik toko, tanpa kewajiban lain di antara kedua pihak.',
            'Perubahan batas waktu hanya berlaku bila disepakati kedua pihak secara tertulis (WhatsApp).'
        ]
    },

    /* ---------- jual stok dengan DP lalu pelunasan ----------
       Biaya pembatalan berupa potongan wajar yang disepakati di awal (pembeli membalas SETUJU di WhatsApp).
       Klausula "DP hangus / uang tidak dapat dikembalikan" sengaja tidak dipakai (UU 8/1999 Pasal 18). */
    jual: {
        batasHari: 30,                 /* barang ditahan sekian hari sejak DP */
        potonganPersen: 10,            /* biaya pembatalan oleh pembeli: % harga barang, paling banyak sebesar uang yang sudah dibayar */
        pengingatHari: [7, 1],         /* pengingat pelunasan sekian hari sebelum batas */
        /* tercetak di nota pesanan; {batas}, {potongan} diganti otomatis */
        ketentuan: [
            'Barang ditahan untuk pembeli sampai tanggal {batas} dan selama itu tidak dijual kepada pihak lain.',
            'Sisa pembayaran dilunasi paling lambat tanggal {batas}. Barang diserahkan setelah lunas.',
            'Bila pembeli membatalkan pesanan, atau sampai tanggal {batas} belum melunasi tanpa kesepakatan baru, pesanan batal dan uang yang sudah dibayar dikembalikan setelah dipotong biaya pembatalan {potongan}% dari harga barang (paling banyak sebesar uang yang sudah dibayar).',
            'Bila toko yang membatalkan (misalnya barang rusak atau tidak dapat diserahkan), seluruh uang dikembalikan tanpa potongan.',
            'Pembayaran hanya sah bila tunai di toko atau transfer ke rekening yang tercantum di nota ini. Perubahan batas waktu berlaku bila disepakati kedua pihak secara tertulis (WhatsApp).'
        ]
    }
};
