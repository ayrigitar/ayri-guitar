'use strict';
/* Riwayat pelanggan (dicari dari nomor HP di servis, jual, sewa) dan pengingat servis berkala di halaman Hari ini. */
const test = require('node:test'), assert = require('node:assert/strict');
const { bikinGitHub, siapkanRepo, bikinPerangkat, baca } = require('./helper');

const { L } = bikinPerangkat(siapkanRepo(bikinGitHub()));
const sv = (o) => Object.assign({ id: 's' + Math.random(), kode: 'AYR-X', nama: 'Rian', hp: '0813 2222 3333', status: 'diambil', tgl_masuk: '2026-01-02', tgl_diambil: '2026-01-10', gitar_jenis: 'Akustik', gitar_merk: 'Yamaha F310', items: [{ nama: 'Basic Setup (Akustik)', harga: 100000, qty: 1 }], bayar: [] }, o);

test('kunci HP: 0812…, +62 812…, 62-812… dianggap orang yang sama; nomor terlalu pendek diabaikan', () => {
    assert.equal(L.kunciHp('0813 2222 3333'), L.kunciHp('+62 813-2222-3333'));
    assert.equal(L.kunciHp('0813 2222 3333'), L.kunciHp('6281322223333'));
    assert.equal(L.kunciHp('3333'), '');
});

test('riwayat pelanggan: servis, beli, sewa dari nomor yang sama, terbaru dulu; batal & catatan yang sedang dibuka tidak dihitung', () => {
    const data = {
        servis: [sv({ id: 'a', tgl_masuk: '2026-01-02' }), sv({ id: 'b', tgl_masuk: '2026-06-01', status: 'batal' }), sv({ id: 'c', hp: '0899 0000 1111' }), sv({ id: 'skrg', tgl_masuk: '2026-11-01' })],
        jual: [{ id: 'j1', kode: 'JUL-1', nama: 'Rian S', hp: '+62 813 2222 3333', tgl: '2026-03-05', status: 'selesai', items: [{ nama: 'Senar Elixir', harga: 150000, qty: 1 }], bayar: [] }],
        sewa: [{ id: 'w1', kode: 'SWA-1', nama: 'Rian', hp: '081322223333', tgl_mulai: '2026-02-01', status: 'selesai', nama_barang: 'Taylor 214ce' }]
    };
    const r = L.riwayatPelanggan('0813-2222-3333', data, 'skrg');
    assert.deepEqual({ ...r.n }, { servis: 1, beli: 1, sewa: 1 });
    assert.deepEqual([...r.list.map((x) => x.jenis)], ['beli', 'sewa', 'servis'], 'terbaru dulu');
    assert.equal(r.list[0].nilai, 150000, 'nilai belanja');
    assert.equal(r.nama, 'Rian S', 'nama dari catatan terbaru');
    assert.equal(r.list[2].href, '#servis/a');
    assert.equal(L.riwayatPelanggan('0899 1234 5678', data), null, 'nomor baru: tidak ada riwayat');
    assert.equal(L.riwayatPelanggan('', data), null);
});

test('pengingat servis berkala: 5–12 bulan setelah diambil, hanya servis terakhir, sekali saja', () => {
    const lama = sv({ id: 'lama', tgl_diambil: '2026-05-01' });
    assert.ok(L.tindakServis(lama, '2026-10-05', [lama]).includes('berkala'), '±5 bulan: diingatkan');
    assert.ok(!L.tindakServis(lama, '2026-08-01', [lama]).includes('berkala'), '3 bulan: belum');
    assert.ok(!L.tindakServis(lama, '2027-06-01', [lama]).includes('berkala'), 'lewat 12 bulan: tidak lagi');
    assert.ok(!L.tindakServis(lama, '2026-10-05').includes('berkala'), 'tanpa daftar servis (pemanggil lama): tidak ada pengingat berkala');
    const baru = sv({ id: 'baru', hp: '+62 813 2222 3333', tgl_masuk: '2026-08-01', status: 'antri', tgl_diambil: null });
    assert.ok(!L.tindakServis(lama, '2026-10-05', [lama, baru]).includes('berkala'), 'sudah servis lagi: tidak diingatkan');
    const batal = Object.assign({}, baru, { status: 'batal' });
    assert.ok(L.tindakServis(lama, '2026-10-05', [lama, batal]).includes('berkala'), 'servis baru yang batal tidak dihitung');
    const sudah = Object.assign({}, lama, { tindak: { berkala: '2026-10-05' } });
    assert.ok(!L.tindakServis(sudah, '2026-10-20', [sudah]).includes('berkala'), 'sudah dikirim: tidak muncul lagi');
    assert.match(L.pesanTindak.servisBerkala(lama), /Halo Kak Rian, apa kabar gitar Akustik Yamaha F310\?/);
});

test('admin: kotak riwayat di bawah kolom HP semua formulir + kasir; pengingat berkala di Hari ini memakai daftar servis', () => {
    const kode = baca('admin.js'), cfg = baca('layanan-config.js');
    for (const p of ["'[data-f=\"nama\"]', '[data-f=\"hp\"]'", "'#jb-nama', '#jb-hp'", "'#ks-nama', '#ks-hp'"]) assert.ok(kode.includes('kotakRiwayat(' + p + ')'), p);
    assert.match(kode, /L\.tindakServis\(s, h, cache\.servis\)/);
    assert.match(kode, /jenis === 'berkala' \? L\.pesanTindak\.servisBerkala\(x\)/, 'WA berkala lalu dicatat di servis (tidak muncul lagi di perangkat lain)');
    assert.match(kode, /data-rw-isi=/, 'tombol pakai nama pelanggan lama');
    assert.match(cfg, /berkalaSetelahBulan: 5,/);
});
