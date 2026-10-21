'use strict';
/* PIN admin, token hanya di memori, pembatasan percobaan salah, ganti PIN, cadangan terenkripsi. */
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { bikinGitHub, siapkanRepo, bikinPerangkat, servisContoh, tidur } = require('./helper');

const baru = () => { const gh = siapkanRepo(bikinGitHub()); return { gh, d: bikinPerangkat(gh) }; };

test('PIN kurang dari 6 karakter ditolak saat memasang token', async () => {
    const { d } = baru();
    await assert.rejects(d.A.pasangToken(d.token, '1234'), /minimal 6/);
    assert.equal(d.A.adaToken(), false);
    assert.equal(d.A.terbuka(), false);
});

test('token disimpan terenkripsi (v2, 600 ribu putaran) dan tidak pernah disalin ke sessionStorage', async () => {
    const { d } = baru();
    await d.A.pasangToken(d.token, 'abcd1234');
    const blob = JSON.parse(d.mem['ayri-admin-token']);
    assert.equal(blob.v, 2); assert.equal(blob.it, 600000);
    assert.deepEqual(Object.keys(d.sesi), []);
    assert.equal(JSON.stringify(d.mem).includes(d.token), false);
    assert.equal(d.A.terbuka(), true);
    await d.A.kunci(); assert.equal(d.A.terbuka(), false);
    await d.A.buka('abcd1234'); assert.equal(d.A.terbuka(), true);
    assert.deepEqual(Object.keys(d.sesi), []);
});

test('salah PIN 5 kali berturut-turut mengunci; setelah masa kunci habis bisa dibuka lagi', async () => {
    const { d } = baru();
    await d.A.pasangToken(d.token, 'rahasia1'); await d.A.kunci();
    for (let i = 1; i <= 4; i++) await assert.rejects(d.A.buka('salah' + i), new RegExp('Sisa percobaan: ' + (5 - i)));
    await assert.rejects(d.A.buka('salah5'), /Terlalu banyak percobaan/);
    await assert.rejects(d.A.buka('rahasia1'), /Terlalu banyak PIN yang salah/, 'PIN yang benar pun ditolak selama dikunci');
    const g = JSON.parse(d.mem['ayri-pin-gagal']); g.sampai = Date.now() - 1000; d.mem['ayri-pin-gagal'] = JSON.stringify(g);
    await d.A.buka('rahasia1');
    assert.equal(d.A.terbuka(), true);
    assert.equal(d.mem['ayri-pin-gagal'], undefined, 'hitungan salah dihapus setelah berhasil');
});

test('blob lama (200 ribu putaran, PIN 4 angka) tetap bisa dibuka lalu ditingkatkan otomatis', async () => {
    const { d } = baru();
    const garam = crypto.randomBytes(16), iv = crypto.randomBytes(12), kunci = crypto.pbkdf2Sync('ayri-pin|1234', garam, 200000, 32, 'sha256');
    const c = crypto.createCipheriv('aes-256-gcm', kunci, iv), ct = Buffer.concat([c.update(d.token, 'utf8'), c.final()]);
    d.mem['ayri-admin-token'] = JSON.stringify({ v: 1, g: garam.toString('base64'), d: Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64'), dibuat: '2026-01-01' });
    await d.A.buka('1234');
    assert.equal(d.A.terbuka(), true);
    for (let i = 0; i < 40 && JSON.parse(d.mem['ayri-admin-token']).v !== 2; i++) await tidur(150);
    assert.equal(JSON.parse(d.mem['ayri-admin-token']).v, 2, 'blob ditingkatkan ke versi 2');
    await d.A.kunci(); await d.A.buka('1234'); assert.equal(d.A.terbuka(), true);
});

test('ganti PIN: PIN lama tidak berlaku lagi, PIN pendek ditolak, harus sedang terbuka', async () => {
    const { d } = baru();
    await d.A.pasangToken(d.token, 'rahasia1');
    await assert.rejects(d.A.gantiPin('123'), /minimal 6/);
    await d.A.gantiPin('barupin99'); await d.A.kunci();
    await assert.rejects(d.A.gantiPin('barupin00'), /terkunci/);
    await assert.rejects(d.A.buka('rahasia1'), /PIN salah/);
    await d.A.buka('barupin99'); assert.equal(d.A.terbuka(), true);
});

test('cadangan terenkripsi: tidak terbaca tanpa sandi, utuh dengan sandi yang benar', async () => {
    const { d } = baru(); await d.masuk();
    await d.A.simpanServis(servisContoh('Budi Rahasia', '081234567890'), []);
    await assert.rejects(d.A.cadanganTerenkripsi('abc'), /minimal 6/);
    const enc = await d.A.cadanganTerenkripsi('sandi-cadangan');
    assert.equal(/Budi Rahasia|081234567890/.test(enc), false, 'nama dan nomor HP tidak boleh terlihat');
    const j = JSON.parse(await d.A.bukaCadangan(enc, 'sandi-cadangan'));
    assert.equal(j.servis[0].nama, 'Budi Rahasia');
    await assert.rejects(d.A.bukaCadangan(enc, 'sandi-salah'), /Sandi salah/);
    await assert.rejects(d.A.bukaCadangan('{"bukan":"cadangan"}', 'x'), /bukan cadangan/);
});
