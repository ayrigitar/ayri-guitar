'use strict';
/* Sewa gitar: tarif, deposit, penutupan sewa (potongan deposit), penyimpanan, dan unit yang sedang disewa. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, stokContoh, hariIni } = require('./helper');

async function mulai(o) {
    o = o || {};
    const gh = siapkanRepo(bikinGitHub(), { data: o.data, owner: o.owner, situs: o.situs });
    const d = bikinPerangkat(gh);
    await d.masuk();
    return { gh, d, A: d.A, L: d.L };
}
const sewaContoh = (L, ekstra) => Object.assign({
    nama: 'Rian', hp: '081234567890', stok_id: 's1', stok_kode: 'STK-S1', nama_barang: 'Gitar Akustik Yamaha F310', tgl_mulai: hariIni(), hari: 3,
    biaya_custom: 300000, deposit_rencana: 500000, status: 'aktif', bayar: []
}, ekstra || {});

test('tarif sewa standar: 100/150/175 ribu, lalu +25 ribu per hari, 7 hari 300 ribu, sesudahnya +25 ribu', async () => {
    const { L } = await mulai();
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 10, 14].map((h) => L.tarifSewa(h)), [100000, 150000, 175000, 200000, 225000, 250000, 300000, 325000, 375000, 475000]);
    assert.equal(L.tarifSewa(0), 0);
});

test('deposit awal: 50% dari biaya sewa, dibulatkan 5 ribu; unit di bawah 2 juta memakai tarif standar', async () => {
    const { L } = await mulai();
    assert.equal(L.depositAwal(100000), 50000);
    assert.equal(L.depositAwal(300000), 150000);
    assert.equal(L.depositAwal(175000), 90000);
    assert.equal(L.tarifStandarUnit({ harga_jual: 1999000 }), true);
    assert.equal(L.tarifStandarUnit({ harga_jual: 2000000 }), false, '2 juta ke atas: isi manual');
    assert.match(L.ringkasTarifSewa(), /1 hari Rp100\.000, 2 hari Rp150\.000, 3 hari Rp175\.000, lalu \+Rp25\.000 per hari; 7 hari Rp300\.000/);
});

test('hitung sewa: telat dihitung tambahan hari, harga custom ikut, kembali lebih awal tidak mengurangi', async () => {
    const { L } = await mulai();
    const mulaiTgl = L.tambahHari(hariIni(), -5);
    const w = sewaContoh(L, { tgl_mulai: mulaiTgl, hari: 3, biaya_custom: null });
    assert.equal(L.infoSewa(w).hariTelat, 2);
    assert.equal(L.hitungSewa(w).hari, 5, 'sudah 5 hari dipakai, dipesan 3');
    assert.equal(L.hitungSewa(w).tarif, 225000, 'tarif standar 5 hari');
    /* harga custom 3 hari = 300 ribu: hari lebihnya ditambah selisih tarif standar (225 - 175 = 50 ribu) */
    assert.equal(L.hitungSewa(sewaContoh(L, { tgl_mulai: mulaiTgl, hari: 3, biaya_custom: 300000 })).tarif, 350000);
    const awal = sewaContoh(L, { tgl_mulai: mulaiTgl, hari: 3, status: 'selesai', tgl_kembali: L.tambahHari(mulaiTgl, 1) });
    assert.equal(L.hitungSewa(awal).hari, 3, 'kembali hari ke-1, tetap ditagih 3 hari');
    assert.equal(L.batasSewa(w), L.tambahHari(mulaiTgl, 3));
});

test('penutupan sewa: kekurangan dan ganti rugi diambil dari deposit, sisanya dikembalikan', async () => {
    const { L } = await mulai();
    const bayar = [{ jumlah: 300000, jenis: 'sewa' }, { jumlah: 500000, jenis: 'deposit' }];
    let w = sewaContoh(L, { bayar, status: 'selesai', tgl_kembali: L.tambahHari(hariIni(), 0), ganti_rugi: 150000 });
    let h = L.hitungSewa(w);
    assert.deepEqual([h.tagihan, h.potongDeposit, h.harusKembali, h.masihHutang], [450000, 150000, 350000, 0]);
    /* ganti rugi melebihi deposit: penyewa masih berhutang selisihnya */
    w = Object.assign({}, w, { ganti_rugi: 900000 });
    h = L.hitungSewa(w);
    assert.deepEqual([h.potongDeposit, h.harusKembali, h.masihHutang], [500000, 0, 400000]);
    /* setelah penutupan dicatat (potong + kembali) hitungannya tetap sama dan deposit tidak tersisa */
    const tutup = sewaContoh(L, { status: 'selesai', tgl_kembali: hariIni(), ganti_rugi: 150000, bayar: bayar.concat([{ jumlah: 150000, jenis: 'deposit_potong' }, { jumlah: 350000, jenis: 'deposit_kembali' }]) });
    h = L.hitungSewa(tutup);
    assert.deepEqual([h.ditahan, h.potongDeposit, h.harusKembali, h.masihHutang, h.kurang], [0, 0, 0, 0, 0]);
});

test('simpan sewa: kode SWA, tersimpan di repo bersama tanpa mengubah stok, unit yang disewa tidak bisa disewa lagi', async () => {
    const { gh, A, L } = await mulai({ data: { 'stok.json': JSON.stringify([stokContoh('s1', 1)]) } });
    const s = A.daftar('stok')[0];
    assert.equal(L.bisaDisewa(s, A.daftar('sewa')), true);
    const r = await A.simpanSewa(sewaContoh(L, { bayar: [{ id: 'b1', tgl: hariIni(), jumlah: 300000, jenis: 'sewa', metode: 'tunai' }, { id: 'b2', tgl: hariIni(), jumlah: 500000, jenis: 'deposit', metode: 'tunai' }] }), []);
    assert.match(r.kode, /^SWA-[A-Z0-9]{6}$/);
    assert.equal(gh.json('ayri-toko-data', 'sewa.json').length, 1);
    assert.equal(gh.json('ayri-toko-data', 'stok.json')[0].jumlah, 1, 'stok tidak berkurang');
    assert.equal(L.bisaDisewa(A.daftar('stok')[0], A.daftar('sewa')), false, 'sedang disewa');
    assert.equal(L.sewaAktifStok('s1', A.daftar('sewa')).id, r.id);
    /* selesai: unit bisa disewa lagi */
    const r2 = await A.simpanSewa(Object.assign({}, r, { status: 'selesai', tgl_kembali: hariIni() }), []);
    assert.equal(r2.id, r.id);
    assert.equal(gh.json('ayri-toko-data', 'sewa.json').length, 1);
    assert.equal(L.bisaDisewa(A.daftar('stok')[0], A.daftar('sewa')), true);
    await A.hapusSewa(r2);
    assert.equal(gh.json('ayri-toko-data', 'sewa.json').length, 0);
});

test('gitar baru, aksesoris, atau stok habis tidak bisa disewakan', async () => {
    const { L } = await mulai();
    assert.equal(L.bisaDisewa(stokContoh('a', 1, { kondisi: 'baru' }), []), false);
    assert.equal(L.bisaDisewa(stokContoh('b', 1, { kategori: 'aksesoris' }), []), false);
    assert.equal(L.bisaDisewa(stokContoh('c', 0), []), false);
    assert.equal(L.bisaDisewa(stokContoh('d', 1, { status: 'ditarik' }), []), false);
    assert.equal(L.bisaDisewa(stokContoh('e', 1), []), true);
});

test('pesan WA sewa memuat batas kembali, deposit, dan ketentuan; pengingat membedakan telat', async () => {
    const { L } = await mulai();
    const w = sewaContoh(L, { kode: 'SWA-ABC123', bayar: [{ jumlah: 300000, jenis: 'sewa' }, { jumlah: 500000, jenis: 'deposit' }] });
    const m = L.pesanSewa.mulai(w);
    assert.match(m, /SWA-ABC123/); assert.match(m, /Ketentuan:\n1\. /); assert.match(m, /SETUJU/);
    assert.ok(m.includes(L.tglPanjang(L.batasSewa(w))), 'tanggal batas kembali ada di ketentuan');
    assert.ok(m.includes(L.rupiah(500000)), 'deposit disebut');
    const telat = sewaContoh(L, { kode: 'SWA-ABC123', tgl_mulai: L.tambahHari(hariIni(), -5) });
    assert.match(L.pesanSewa.pengingat(telat), /terlambat 2 hari/);
    assert.equal(L.perluIngatSewa(telat), true);
    assert.equal(L.perluIngatSewa(Object.assign({}, telat, { pengingat: [hariIni()] })), false, 'sudah diingatkan hari ini');
    assert.equal(L.perluIngatSewa(sewaContoh(L, { hari: 10 })), false, 'masih lama');
});

test('struk sewa 58 mm memuat kode, batas kembali, deposit', async () => {
    const { L } = await mulai();
    const teks = L.strukSewa(sewaContoh(L, { kode: 'SWA-ABC123', bayar: [{ jumlah: 300000, jenis: 'sewa' }, { jumlah: 500000, jenis: 'deposit' }] })).map((x) => x.t).join('\n');
    assert.match(teks, /BUKTI SEWA GITAR/); assert.match(teks, /SWA-ABC123/); assert.match(teks, /Deposit diterima/);
});
