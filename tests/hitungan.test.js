'use strict';
/* Hitungan uang, tanggal, dan format pada layanan.js: biaya servis, DP, penitipan, pembatalan pesanan, rupiah, nomor WA. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat } = require('./helper');

const L = bikinPerangkat(siapkanRepo(bikinGitHub())).L;

test('biaya servis: DP = 50% jasa (dibulatkan ke 1000) + part lunas', () => {
    let h = L.hitung({ diskon: 0 }, [{ jenis: 'jasa', harga: 150000, qty: 1 }], []);
    assert.deepEqual([h.total, h.wajibAwal], [150000, 75000]);
    h = L.hitung({ diskon: 0 }, [{ jenis: 'jasa', harga: 101000, qty: 1 }, { jenis: 'part', harga: 20000, qty: 2 }], []);
    assert.equal(h.wajibAwal, 51000 + 40000);
});

test('diskon: melebihi jasa dipotongkan ke part, tidak pernah melebihi total', () => {
    let h = L.hitung({ diskon: 200000 }, [{ jenis: 'jasa', harga: 100000, qty: 1 }, { jenis: 'part', harga: 150000, qty: 1 }], []);
    assert.deepEqual([h.diskon, h.total, h.wajibAwal], [200000, 50000, 50000]);
    h = L.hitung({ diskon: 999999 }, [{ jenis: 'jasa', harga: 10000, qty: 1 }], []);
    assert.deepEqual([h.diskon, h.total, h.lunas], [10000, 0, false]);
});

test('pembayaran: kelebihan bayar tercatat, harga/qty berupa teks tetap dihitung', () => {
    let h = L.hitung({}, [{ jenis: 'jasa', harga: 100000, qty: 1 }], [{ jumlah: 120000 }]);
    assert.deepEqual([h.sisa, h.lebih, h.lunas], [0, 20000, true]);
    h = L.hitung({}, [{ jenis: 'jasa', harga: '100000', qty: '2' }], []);
    assert.equal(h.total, 200000);
});

test('tanggal: lintas bulan/tahun, selisih hari, garansi akhir bulan', () => {
    assert.equal(L.tambahHari('2026-01-31', 1), '2026-02-01');
    assert.equal(L.tambahHari('2026-12-31', 1), '2027-01-01');
    assert.equal(L.hariAntara('2026-10-01', '2026-10-21'), 20);
    assert.equal(L.hariAntara('2026-10-21', '2026-10-01'), -20);
    assert.equal(L.garansiAkhir('1b', '2026-01-31'), '2026-02-28');
    assert.equal(L.garansiAkhir('6b', '2026-08-31'), '2027-02-28');
    assert.equal(L.garansiAkhir('7h', '2026-10-21'), '2026-10-28');
    assert.equal(L.garansiAkhir('x', '2026-10-21'), null);
    assert.equal(L.garansiLabel('7h'), '1 minggu');
    assert.equal(L.garansiLabel('12b'), '1 tahun');
});

test('penitipan gitar selesai: gratis 14 hari, lalu Rp5.000/hari; garansi hangus setelah 30 hari', () => {
    const s = { status: 'selesai', tgl_selesai: '2026-10-01' };
    let t = L.titip(s, '2026-10-15');
    assert.deepEqual([t.lama, t.hariBiaya, t.biaya], [14, 0, 0]);
    t = L.titip(s, '2026-10-20');
    assert.deepEqual([t.lama, t.hariBiaya, t.biaya], [19, 5, 25000]);
    t = L.titip(s, '2026-11-01');
    assert.deepEqual([t.garansiHangus, t.lepas], [true, false]);
});

test('pengingat penitipan: hari ke-7 dan ke-12, tidak diulang setelah dicatat', () => {
    assert.equal(L.perluIngat({ status: 'selesai', tgl_selesai: '2026-10-01', pengingat: [] }, '2026-10-08'), true);
    assert.equal(L.perluIngat({ status: 'selesai', tgl_selesai: '2026-10-01', pengingat: ['2026-10-08'] }, '2026-10-09'), false);
    assert.equal(L.perluIngat({ status: 'selesai', tgl_selesai: '2026-10-01', pengingat: ['2026-10-08'] }, '2026-10-13'), true);
});

test('pesanan DP dibatalkan: pembeli kena potongan 10% (maks sebesar DP), toko tanpa potongan', () => {
    const jual = (bayar, ekstra) => Object.assign({ items: [{ harga: 3000000, qty: 1 }], bayar }, ekstra || {});
    let h = L.hitungJual(jual([{ jumlah: 1000000, jenis: 'dp' }]));
    assert.deepEqual([h.potongan, h.harusKembali], [300000, 700000]);
    h = L.hitungJual(jual([{ jumlah: 100000, jenis: 'dp' }]));
    assert.deepEqual([h.potongan, h.harusKembali], [100000, 0], 'potongan tidak melebihi uang yang sudah dibayar');
    h = L.hitungJual(jual([{ jumlah: 1000000, jenis: 'dp' }], { batal_oleh: 'toko' }));
    assert.deepEqual([h.potongan, h.harusKembali], [0, 1000000]);
    h = L.hitungJual(jual([{ jumlah: 1000000, jenis: 'dp' }, { jumlah: 700000, jenis: 'refund' }], { batal_oleh: 'pembeli', status: 'batal' }));
    assert.deepEqual([h.dibayar, h.kembali], [1000000, 700000], 'refund tercatat sebagai uang kembali, bukan mengurangi uang masuk');
    h = L.hitungJual({ items: [{ harga: 1234567, qty: 1 }], bayar: [{ jumlah: 1234567, jenis: 'dp' }] });
    assert.equal(h.potongan % 1000, 0, 'potongan dibulatkan ke 1000');
});

test('format: rupiah, nomor WhatsApp, 4 digit HP, escape HTML', () => {
    assert.equal(L.rupiah(1234567), 'Rp1.234.567');
    assert.equal(L.rupiah(-5000), '−Rp5.000');
    assert.equal(L.rupiah('abc'), 'Rp0');
    assert.equal(L.waNomor('0857-9573-8637'), '6285795738637');
    assert.equal(L.waNomor('85795738637'), '6285795738637');
    assert.equal(L.waNomor('+62 857 9573 8637'), '6285795738637');
    assert.equal(L.hp4('0857-9573-8637'), '8637');
    assert.equal(L.esc('a\'b"<>&'), 'a&#39;b&quot;&lt;&gt;&amp;');
});

test('kode unik: 31 huruf tersebar rata (tidak condong ke huruf tertentu)', () => {
    const hit = {};
    for (let i = 0; i < 20000; i++) L.kodeBaru('AYR').slice(4).split('').forEach((c) => { hit[c] = (hit[c] || 0) + 1; });
    const nilai = Object.values(hit);
    assert.equal(nilai.length, 31);
    assert.ok(Math.max(...nilai) / Math.min(...nilai) < 1.12, 'selisih kemunculan terbanyak/tersedikit harus kecil');
});

test('util.js: satu sumber untuk esc, rupiah, salin', () => {
    const U = bikinPerangkat(siapkanRepo(bikinGitHub())).sb.AYRI_UTIL;
    assert.equal(U.esc(null), '');
    assert.equal(U.esc('<a href="x">\'</a>'), '&lt;a href=&quot;x&quot;&gt;&#39;&lt;/a&gt;');
    assert.equal(U.rupiah(2500000), 'Rp2.500.000');
    const asal = { a: [1, { b: 2 }] }, kopi = U.salin(asal);
    kopi.a[1].b = 3;
    assert.equal(asal.a[1].b, 2);
});

test('struk thermal 58 mm: semua baris muat 32 huruf, ASCII saja, angka rata kanan', () => {
    const s = { waktu: new Date(2026, 9, 23, 14, 5), nama: 'Bambang Sétiawan', kode: ['JUL-ABC123', 'AYR-XYZ789'], nota: ['x'], metode: 'tunai', dp: false,
        items: [{ nama: 'Gitar Akustik Yamaha F310 (Natural) – bekas, kondisi mulus sekali', qty: 1, harga: 1350000 }, { nama: "D'Addario EXL110", qty: 2, harga: 90000 }],
        total: 1530000, dibayar: 1530000, diterima: 1600000 };
    const b = L.strukThermal(s);
    for (const x of b) {
        assert.ok(x.t.length <= (x.besar ? 16 : 32), 'terlalu panjang: ' + x.t);
        assert.match(x.t, /^[\x20-\x7e]*$/, 'bukan ASCII: ' + x.t);
    }
    const teks = b.map((x) => x.t);
    assert.ok(teks.includes('  2 x Rp90.000'.padEnd(32 - 'Rp180.000'.length) + 'Rp180.000'));
    assert.ok(teks.some((t) => /^TOTAL +Rp1\.530\.000$/.test(t) && t.length === 32));
    assert.ok(teks.some((t) => /^Kembali +Rp70\.000$/.test(t)));
    assert.ok(teks.includes('23 Okt 2026 14.05'));
    assert.ok(teks.some((t) => t.includes('Bambang Setiawan')));
    assert.ok(b.find((x) => x.besar).b);
});

test('struk thermal DP: sisa dan batas pelunasan', () => {
    const b = L.strukThermal({ waktu: new Date(2026, 9, 23), kode: ['JUL-1'], nota: [], metode: 'transfer', dp: true, items: [{ nama: 'Gitar', qty: 1, harga: 3200000 }],
        total: 3200000, dibayar: 1000000, jual: { batas_lunas: '2026-11-22' } }).map((x) => x.t);
    assert.ok(b.some((t) => /^DP \(Transfer\) +Rp1\.000\.000$/.test(t)));
    assert.ok(b.some((t) => /^SISA +Rp2\.200\.000$/.test(t)));
    assert.ok(b.some((t) => /^Lunasi s\/d +22 Nov 2026$/.test(t)));
});

test('tanda terima servis 58 mm: kode besar, HP disamarkan, sisa bayar, ketentuan dari pengaturan, label gitar', () => {
    const s = { kode: 'AYR-K7M2PQ', nama: 'Rian', hp: '0813 2222 3333', tgl_masuk: '2026-10-23', estimasi: '2026-10-27', gitar_jenis: 'Akustik', gitar_merk: 'Taylor 214ce',
        keluhan: 'Action tinggi, fret buzz', items: [{ jenis: 'jasa', nama: 'Full Setup (Akustik)', harga: 350000, qty: 1 }, { jenis: 'part', nama: 'Senar', harga: 90000, qty: 2 }],
        bayar: [{ jumlah: 355000 }] };
    const b = L.strukServis(s, { label: true }), t = b.map((x) => x.t);
    for (const x of b) assert.ok(x.t.length <= (x.besar ? 16 : 32) && /^[\x20-\x7e]*$/.test(x.t), x.t);
    assert.equal(b.filter((x) => x.besar && x.t === 'AYR-K7M2PQ').length, 2);
    assert.ok(t.some((x) => /^No\. HP +\*{4}3333$/.test(x)));
    assert.ok(!t.join('\n').includes('0813'));
    assert.ok(t.some((x) => /^SISA +Rp175\.000$/.test(x)));
    assert.ok(t.some((x) => /^  2 x Rp90\.000 +Rp180\.000$/.test(x)));
    assert.ok(t.join(' ').includes('Gratis dititipkan 14 hari'));
    assert.ok(t.some((x) => x.includes('LABEL GITAR')));
    const tanpa = L.strukServis(s).map((x) => x.t);
    assert.ok(!tanpa.some((x) => x.includes('LABEL GITAR')));
});

test('tanda terima servis tanpa rincian biaya tetap bisa dicetak', () => {
    const t = L.strukServis({ kode: 'AYR-1', nama: 'A', hp: '', tgl_masuk: '2026-10-23', items: [], bayar: [] }).map((x) => x.t);
    assert.ok(t.includes('TANDA TERIMA SERVIS'));
    assert.ok(!t.some((x) => x.startsWith('TOTAL')));
});

test('nama barang: bass dan ukulele tanpa kata Gitar, tingkat kondisi hanya untuk gitar bekas', () => {
    const g = (j, m, x) => Object.assign({ kategori: 'gitar', gitar_jenis: j, gitar_merk: m, kondisi: 'bekas' }, x || {});
    assert.equal(L.judulStok(g('Bass', 'Fender Aerodyne')), 'Bass Fender Aerodyne');
    assert.equal(L.judulStok(g('Ukulele', 'Kala KA-C')), 'Ukulele Kala KA-C');
    assert.equal(L.judulStok(g('Akustik', 'Yamaha F310')), 'Gitar Akustik Yamaha F310');
    assert.equal(L.judulStok(g('Lainnya', 'Cigar Box')), 'Gitar Cigar Box');
    assert.equal(L.judulStok({ kategori: 'aksesoris', nama: 'Senar Elixir' }), 'Senar Elixir');
    assert.equal(L.tingkatStok(g('Bass', 'X', { tingkat: 'excellent' })), 'Excellent');
    assert.equal(L.tingkatStok(g('Bass', 'X', { tingkat: 'very_good' })), 'Very Good');
    assert.equal(L.tingkatStok(g('Bass', 'X', { kondisi: 'baru', tingkat: 'mint' })), '', 'gitar baru tidak punya tingkat');
    assert.equal(L.tingkatStok({ kategori: 'aksesoris', kondisi: 'bekas', tingkat: 'mint' }), '');
    assert.equal(L.tingkatStok(g('Bass', 'X', { tingkat: 'ngawur' })), '', 'nilai tak dikenal diabaikan');
    assert.equal(L.KONDISI.bekas, 'Used');
});

test('tahap foto servis: tiga tahap (gitar, sebelum, sesudah); foto lama "kerusakan tambahan" dianggap sebelum', () => {
    assert.deepEqual(Object.keys(L.TAHAP), ['gitar', 'sebelum', 'sesudah']);
    assert.equal(L.TAHAP.gitar, 'Gitar');
    assert.equal(L.tahapFoto({ tahap: 'kerusakan' }), 'sebelum');
    assert.deepEqual(['gitar', 'sebelum', 'sesudah'].map((t) => L.tahapFoto({ tahap: t })), ['gitar', 'sebelum', 'sesudah']);
});
