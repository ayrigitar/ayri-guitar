'use strict';
/* Tahap 0 (tes pengunci): perilaku alur status HARI INI, sebelum aturannya dipindah ke satu tabel.
   Tidak ada yang diubah. Baris yang ditandai CELAH adalah perilaku yang sudah diketahui tidak konsisten; tesnya
   sengaja diubah di PR yang memperbaikinya, supaya perubahan perilaku selalu terlihat dan disengaja.

   Bagian 1: aturan pindah status di admin.js (papan antrian servis, form servis, tebus, titip), fungsi aslinya dijalankan dengan tiruan layar.
   Bagian 2: apa yang dilakukan Layanan.api saat menyimpan status (tanggal, status turunan stok & jual) terhadap GitHub palsu. */
const test = require('node:test'), assert = require('node:assert/strict');
const vm = require('vm');
const { bikinGitHub, siapkanRepo, bikinPerangkat, baca, stokContoh, jualContoh, servisContoh, hariIni } = require('./helper');

async function mulai(o) {
    o = o || {};
    const gh = siapkanRepo(bikinGitHub(), { data: o.data });
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, A: d.A, L: d.L };
}

/* ---------- Bagian 1: fungsi admin.js yang asli, dengan layar tiruan ---------- */
const ADMIN = baca('admin.js');
function ambilFungsi(nama) {
    const i = ADMIN.indexOf('function ' + nama + '(');
    assert.ok(i >= 0, 'fungsi ' + nama + ' ada di admin.js');
    let k = ADMIN.indexOf('{', i), n = 0;
    for (let j = k; j < ADMIN.length; j++) {
        if (ADMIN[j] === '{') n++;
        else if (ADMIN[j] === '}' && --n === 0) return ADMIN.slice(i, j + 1);
    }
    throw new Error('akhir fungsi ' + nama + ' tidak ketemu');
}
/* jawab = jawaban untuk setiap confirm(); dicatat semua pertanyaan, toast, dan apa yang disimpan */
function layar(L, jawab) {
    const catat = { tanya: [], toast: [], simpan: [] };
    const ctx = {
        L, catat, Promise,
        confirm: (t) => { catat.tanya.push(t); return jawab !== false; },
        toast: (t) => { catat.toast.push(t); },
        salin: (x) => JSON.parse(JSON.stringify(x)),
        A: { simpanServis: (s) => { catat.simpan.push(s); return Promise.resolve(s); } },
        taruh() {}, gambarDaftar() {}, gambarStatus() {}, gambarRingkas() {}, gambarStatusTebus() {}, gambarStatusTitip() {},
        setDirty() {}, $: () => null, waServis: () => '', gagal() {}
    };
    vm.createContext(ctx);
    vm.runInContext('var ed, te, tp, menyimpan, rekaman = {}; function cariId(j, id) { return rekaman[id]; }\n' +
        ['geserServis', 'ubahStatus', 'ubahStatusTebus', 'ubahStatusTitip'].map(ambilFungsi).join('\n'), ctx);
    return ctx;
}
const kartu = { classList: { add() {}, remove() {} } };
const sv = (ekstra) => Object.assign({ id: 's1', kode: 'AYR-AAAAAA', status: 'menunggu_dp', diskon: 0, items: [{ jenis: 'jasa', nama: 'Setup', harga: 100000, qty: 1 }], bayar: [], foto: [] }, ekstra || {});
const lunasDp = [{ id: 'b1', tgl: '2026-11-01', jumlah: 50000, jenis: 'dp', metode: 'tunai' }];

test('servis, papan antrian: hanya maju/mundur satu kolom; DP kurang ditanya dulu; kembali ke Menunggu DP ditolak bila DP sudah masuk', async () => {
    const { L } = await mulai();
    let c = layar(L, false); c.rekaman.s1 = sv();
    c.geserServis('s1', 1, kartu);
    assert.equal(c.catat.simpan.length, 0, 'dijawab Batal: tidak disimpan'); assert.match(c.catat.tanya[0], /Pembayaran awal masih kurang/);
    c = layar(L, true); c.rekaman.s1 = sv();
    c.geserServis('s1', 1, kartu);
    assert.equal(c.catat.simpan[0].status, 'antri');
    c = layar(L, true); c.rekaman.s1 = sv({ status: 'antri', bayar: lunasDp });
    c.geserServis('s1', -1, kartu);
    assert.equal(c.catat.simpan.length, 0); assert.match(c.catat.toast[0], /tidak bisa kembali ke Menunggu DP/);
    c = layar(L, true); c.rekaman.s1 = sv({ status: 'diambil', bayar: lunasDp });
    c.geserServis('s1', 1, kartu);
    assert.equal(c.catat.simpan.length, 0, 'Diambil adalah kolom terakhir');
    assert.equal(L.URUT_STATUS.indexOf('batal'), -1, 'Batal tidak ada di papan: hanya dari form');
});

test('servis, papan antrian: mundur dari Selesai menghapus tanggal selesai (dan tanggal diambil)', async () => {
    const { L } = await mulai();
    const c = layar(L, true); c.rekaman.s1 = sv({ status: 'selesai', bayar: lunasDp, tgl_selesai: '2026-11-05' });
    c.geserServis('s1', -1, kartu);
    assert.equal(c.catat.simpan[0].status, 'dikerjakan'); assert.equal(c.catat.simpan[0].tgl_selesai, undefined);
    c.rekaman.s1 = sv({ status: 'diambil', bayar: lunasDp, tgl_selesai: '2026-11-05', tgl_diambil: '2026-11-07' });
    c.geserServis('s1', -1, kartu);
    assert.equal(c.catat.simpan[1].status, 'selesai'); assert.equal(c.catat.simpan[1].tgl_selesai, '2026-11-05'); assert.equal(c.catat.simpan[1].tgl_diambil, undefined);
});

test('servis, form: boleh lompat ke status mana saja; konfirmasi untuk DP kurang, sisa bayar, dan Batal', async () => {
    const { L } = await mulai();
    let c = layar(L, true); c.ed = { s: sv(), antri: [] };
    c.ubahStatus('diambil');
    assert.equal(c.ed.s.status, 'diambil', 'Menunggu DP langsung ke Diambil'); assert.match(c.catat.tanya[0], /sisa pembayaran/);
    c = layar(L, true); c.ed = { s: sv({ status: 'antri', bayar: lunasDp }), antri: [] };
    c.ubahStatus('batal');
    assert.equal(c.ed.s.status, 'batal'); assert.match(c.catat.tanya[0], /dibatalkan/);
    c = layar(L, false); c.ed = { s: sv({ status: 'antri', bayar: lunasDp }), antri: [] };
    c.ubahStatus('batal');
    assert.equal(c.ed.s.status, 'antri', 'dijawab Batal: status tetap');
    c = layar(L, true); c.ed = { s: sv({ status: 'batal', bayar: lunasDp }), antri: [] };
    c.ubahStatus('dikerjakan');
    assert.equal(c.ed.s.status, 'dikerjakan'); assert.equal(c.catat.tanya.length, 0, 'dari Batal kembali aktif tanpa pertanyaan');
});

test('servis, form: CELAH (beda dengan papan) mundur dari Selesai tidak menghapus tanggal selesai; kembali ke Menunggu DP diizinkan', async () => {
    const { L } = await mulai();
    let c = layar(L, true); c.ed = { s: sv({ status: 'selesai', bayar: lunasDp, tgl_selesai: '2026-11-05' }), antri: [] };
    c.ubahStatus('dikerjakan');
    assert.equal(c.ed.s.status, 'dikerjakan'); assert.equal(c.ed.s.tgl_selesai, '2026-11-05');
    c = layar(L, true); c.ed = { s: sv({ status: 'antri', bayar: lunasDp }), antri: [] };
    c.ubahStatus('menunggu_dp');
    assert.equal(c.ed.s.status, 'menunggu_dp', 'form mengizinkan; simpanServis lalu menaikkannya lagi ke Antri');
    assert.match(ambilFungsi('simpanServis'), /rec\.status === 'menunggu_dp' && h\.total > 0 && h\.kurangAwal === 0\) rec\.status = 'antri'/);
});

test('tebus, form: pindah ke status mana saja; konfirmasi hanya saat masuk Milik toko (sebelum batas), Ditebus, Batal', async () => {
    const { L } = await mulai();
    const tb = (ekstra) => Object.assign({ status: 'aktif', harga_beli: 900000, tgl_beli: '2026-11-01', batas_tebus: '2099-01-01' }, ekstra || {});
    let c = layar(L, true); c.te = { t: tb() };
    c.ubahStatusTebus('milik_toko');
    assert.equal(c.te.t.status, 'milik_toko'); assert.match(c.catat.tanya[0], /belum lewat/);
    c = layar(L, true); c.te = { t: tb({ batas_tebus: '2020-01-01' }) };
    c.ubahStatusTebus('milik_toko');
    assert.equal(c.catat.tanya.length, 0, 'batas sudah lewat: tanpa pertanyaan');
    c = layar(L, true); c.te = { t: tb({ status: 'ditebus' }) };
    c.ubahStatusTebus('aktif');
    assert.equal(c.te.t.status, 'aktif'); assert.equal(c.catat.tanya.length, 0, 'CELAH: Ditebus bisa kembali ke Masa tebus tanpa pertanyaan');
    c = layar(L, true); c.te = { t: tb({ status: 'batal' }) };
    c.ubahStatusTebus('milik_toko');
    assert.equal(c.te.t.status, 'milik_toko', 'dari Batal pun bisa');
});

test('titip, form: konfirmasi saat Diambil/Batal; kembali ke Aktif tanpa pertanyaan (stok yang sudah ditarik tidak ikut kembali)', async () => {
    const { L } = await mulai();
    let c = layar(L, true); c.tp = { t: { status: 'aktif' } };
    c.ubahStatusTitip('diambil');
    assert.equal(c.tp.t.status, 'diambil'); assert.match(c.catat.tanya[0], /ditarik dari stok/);
    c = layar(L, true); c.tp = { t: { status: 'diambil' } };
    c.ubahStatusTitip('aktif');
    assert.equal(c.tp.t.status, 'aktif'); assert.equal(c.catat.tanya.length, 0);
    const tarik = ambilFungsi('tarikStokTitip');
    assert.match(tarik, /row\.status !== 'aktif'/, 'stok hanya ditarik saat titipan tidak aktif; tidak ada langkah sebaliknya');
});

/* ---------- Bagian 2: Layanan.api ---------- */
test('api servis: Selesai/Diambil mengisi tanggalnya sekali; mundur status tidak menghapus tanggal (yang menghapus adalah papan antrian)', async () => {
    const { A } = await mulai();
    let r = await A.simpanServis(servisContoh('Budi', '081234567890', { bayar: lunasDp, status: 'selesai' }), []);
    assert.equal(r.tgl_selesai, hariIni());
    r = await A.simpanServis(Object.assign({}, r, { status: 'dikerjakan' }), []);
    assert.equal(r.status, 'dikerjakan'); assert.equal(r.tgl_selesai, hariIni(), 'tetap tersimpan');
    r = await A.simpanServis(Object.assign({}, r, { status: 'diambil' }), []);
    assert.equal(r.tgl_diambil, hariIni());
    r = await A.simpanServis(Object.assign({}, r, { status: 'menunggu_dp' }), []);
    assert.equal(r.status, 'menunggu_dp', 'api tidak memeriksa arah pindah status');
});

test('api jual: DP/Lunas dihitung dari pembayaran; Selesai dan Batal disimpan apa adanya beserta tanggalnya', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 3)]) } });
    const dp = await A.simpanJual(jualContoh('Ani', '081111111111', 's1', { status: 'lunas', bayar: [{ id: 'b1', tgl: hariIni(), jumlah: 300000, jenis: 'dp', metode: 'tunai' }] }));
    assert.equal(dp.status, 'dp', 'status Lunas yang dikirim diganti hasil hitungan'); assert.ok(dp.batas_lunas);
    const lunas = await A.simpanJual(Object.assign({}, dp, { bayar: dp.bayar.concat([{ id: 'b2', tgl: hariIni(), jumlah: 700000, jenis: 'pelunasan', metode: 'tunai' }]) }));
    assert.equal(lunas.status, 'lunas'); assert.equal(lunas.tgl_lunas, hariIni());
    const selesai = await A.simpanJual(Object.assign({}, lunas, { status: 'selesai' }));
    assert.equal(selesai.status, 'selesai'); assert.equal(selesai.tgl_selesai, hariIni());
    const batal = await A.simpanJual(Object.assign({}, selesai, { status: 'batal', batal_oleh: 'pembeli' }));
    assert.equal(batal.status, 'batal'); assert.equal(batal.tgl_batal, hariIni());
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 3, 'batal mengembalikan barang');
});

test('api stok: status mengikuti jumlah (0 = Terjual, ada = Tersedia); Ditarik tetap Ditarik; Dipesan tetap Dipesan', async () => {
    const { A } = await mulai();
    let r = await A.simpanStok(stokContoh(null, 2, { id: undefined, kode: undefined, created_at: undefined, kategori: 'aksesoris', kondisi: 'baru', nama: 'Senar' }), []);
    assert.equal(r.status, 'tersedia');
    r = await A.simpanStok(Object.assign({}, r, { jumlah: 0 }), []);
    assert.equal(r.status, 'terjual', 'disimpan dari form dengan jumlah 0');
    r = await A.simpanStok(Object.assign({}, r, { jumlah: 4 }), []);
    assert.equal(r.status, 'tersedia', 'terisi lagi: Tersedia');
    r = await A.simpanStok(Object.assign({}, r, { status: 'ditarik' }), []);
    r = await A.simpanStok(Object.assign({}, r, { jumlah: 6 }), []);
    assert.equal(r.status, 'ditarik', 'Ditarik tidak terangkat otomatis walau jumlah naik');
    r = await A.simpanStok(Object.assign({}, r, { status: 'dipesan', jumlah: 0 }), []);
    assert.equal(r.status, 'dipesan');
});

test('api opname: disesuaikan ke 0 membuat barang Tersedia jadi Ditarik; dari 0 ke ada membuat Terjual jadi Tersedia', async () => {
    const { gh, A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 2), stokContoh('s2', 0, { status: 'terjual' })]) } });
    await A.simpanOpname({ oleh: 'Rio', items: [
        { stok_id: 's1', kode: 'STK-S1', nama: 'A', sistem: 2, fisik: 0, catatan: 'bonus' },
        { stok_id: 's2', kode: 'STK-S2', nama: 'B', sistem: 0, fisik: 2, catatan: '' }
    ] }, true);
    const st = gh.json('ayri-toko-data', 'stok.json');
    assert.equal(st.find((x) => x.id === 's1').status, 'ditarik', 'beda dengan simpan dari form (Terjual); pemilik: tetap Ditarik (barang bonus)');
    assert.equal(st.find((x) => x.id === 's2').status, 'tersedia');
    assert.match(ambilFungsi('barangOpname'), /s\.status === 'terjual' && !\(\+s\.jumlah > 0\)/, 'barang habis terjual tidak muncul di daftar opname');
});

test('api tebus, titip, sewa: tanggal diisi saat masuk status akhir; status bisa kembali ke Aktif dan tanggalnya tetap', async () => {
    const { A } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
    let t = await A.simpanTebus({ nama: 'Candra', hp: '083333333333', nik: '', gitar_jenis: 'Akustik', gitar_merk: 'Cort', tgl_beli: hariIni(), harga_beli: 900000, batas_tebus: '2099-01-01', metode: 'tunai', status: 'ditebus', foto: [] }, []);
    assert.equal(t.tgl_tebus, hariIni());
    t = await A.simpanTebus(Object.assign({}, t, { status: 'aktif' }), []);
    assert.equal(t.status, 'aktif'); assert.equal(t.tgl_tebus, hariIni());
    t = await A.simpanTebus(Object.assign({}, t, { status: 'milik_toko' }), []);
    assert.equal(t.tgl_berakhir, hariIni());

    let p = await A.simpanTitip({ nama: 'Sari', hp: '081355550001', nik: '', gitar_jenis: 'Elektrik', gitar_merk: 'Ibanez', tgl_masuk: hariIni(), harga_jual: 6000000, status: 'diambil', foto: [], pengingat: [] }, []);
    assert.equal(p.tgl_diambil, hariIni());
    p = await A.simpanTitip(Object.assign({}, p, { status: 'aktif' }), []);
    assert.equal(p.status, 'aktif'); assert.equal(p.tgl_diambil, hariIni());

    let w = await A.simpanSewa({ nama: 'Rian', hp: '081234567890', stok_id: 's1', stok_kode: 'STK-S1', nama_barang: 'Gitar', tgl_mulai: hariIni(), hari: 3, biaya_custom: 300000, deposit_rencana: 0, status: 'selesai', bayar: [] }, []);
    assert.equal(w.tgl_kembali, hariIni());
    w = await A.simpanSewa(Object.assign({}, w, { status: 'aktif' }), []);
    assert.equal(w.status, 'aktif'); assert.equal(w.tgl_kembali, hariIni());
});
