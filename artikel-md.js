/* Format tulisan artikel sederhana -> HTML.
   Dipakai halaman admin untuk pratinjau dan untuk membuat halaman artikel (artikel-builder.js), jadi hasilnya selalu sama.

   Aturan menulis:
     ## Judul bagian        ### Sub-judul
     - poin daftar          1. daftar bernomor
     > kutipan / catatan    **tebal**   _miring_   [teks tautan](https://alamat)
     baris kosong = paragraf baru */
(function (root) {
    var esc = root.AYRI_UTIL.esc;
    function inline(s) {
        return esc(s)
            .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#|[a-z0-9-]+\.html)[^)\s]*)\)/gi, function (m, t, u) {
                return '<a href="' + u + '"' + (/^(https?:)?\/\//i.test(u) && !/ayrigitar\.com/i.test(u) ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
            })
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,!?;:])/g, '$1<em>$2</em>');
    }
    function keHtml(teks) {
        var out = [], para = [], list = null;
        function tutupPara() { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } }
        function tutupList() { if (list) { out.push('<' + list.tag + '>' + list.li.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + list.tag + '>'); list = null; } }
        String(teks || '').replace(/\r/g, '').split('\n').forEach(function (baris) {
            var b = baris.trim(), m;
            if (!b) { tutupPara(); tutupList(); return; }
            if ((m = /^(#{2,3})\s+(.+)$/.exec(b))) { tutupPara(); tutupList(); out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); return; }
            if ((m = /^[-*•]\s+(.+)$/.exec(b)) || (m = /^\d+[.)]\s+(.+)$/.exec(b))) {
                var tag = /^\d/.test(b) ? 'ol' : 'ul';
                tutupPara(); if (list && list.tag !== tag) tutupList();
                if (!list) list = { tag: tag, li: [] };
                list.li.push(m[1]); return;
            }
            if ((m = /^>\s?(.*)$/.exec(b))) { tutupPara(); tutupList(); out.push('<blockquote><p>' + inline(m[1]) + '</p></blockquote>'); return; }
            tutupList(); para.push(b);
        });
        tutupPara(); tutupList();
        return out.join('\n');
    }
    function teksPolos(teks) {
        return String(teks || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^#{2,3}\s+|^[-*•>]\s+|^\d+[.)]\s+/gm, '').replace(/\*\*|_/g, '').replace(/\s+/g, ' ').trim();
    }
    function slug(s) {
        var t = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' dan ')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        /* dipotong di batas kata (80 huruf), jangan di tengah kata */
        if (t.length > 80) t = (t.charAt(80) === '-' ? t.slice(0, 80) : t.slice(0, 80).replace(/-[^-]*$/, '')) || t.slice(0, 80);
        return t.replace(/-+$/, '');
    }
    /* jumlah kata (tanpa tanda format) dan perkiraan menit baca (±200 kata per menit) */
    function hitung(teks) {
        var p = teksPolos(teks), kata = p ? p.split(' ').length : 0;
        return { kata: kata, menit: kata ? Math.max(1, Math.round(kata / 200)) : 0 };
    }
    /* Tombol format editor: ubah teks di sekitar pilihan [awal, akhir).
       Hasil: ganti teks[dari, sampai) dengan sisip, lalu pilih [pilihA, pilihB) di teks baru. */
    var BUNGKUS = { tebal: ['**', 'teks tebal'], miring: ['_', 'teks miring'] };
    var AWALAN = { judul: '## ', sub: '### ', poin: '- ', nomor: '1. ', kutip: '> ' };
    var POLA_AWALAN = /^(#{2,3}\s+|[-*•]\s+|\d+[.)]\s+|>\s?)/;
    function format(teks, awal, akhir, jenis) {
        teks = String(teks || ''); awal = Math.max(0, Math.min(awal, teks.length)); akhir = Math.max(awal, Math.min(akhir, teks.length));
        var pilih = teks.slice(awal, akhir);
        if (BUNGKUS[jenis]) {
            var t = BUNGKUS[jenis][0], n = t.length;
            /* spasi di tepi pilihan dibiarkan di luar tanda (**kata** , bukan **kata **) */
            var kiri = /^\s*/.exec(pilih)[0].length, kanan = /\s*$/.exec(pilih.slice(kiri))[0].length;
            var a = awal + kiri, b = akhir - kanan, isi = teks.slice(a, b);
            if (teks.slice(a - n, a) === t && teks.slice(b, b + n) === t && (n > 1 || teks.charAt(a - n - 1) !== t)) /* sudah bertanda: dilepas */
                return { dari: a - n, sampai: b + n, sisip: isi, pilihA: a - n, pilihB: b - n };
            if (isi.length > 2 * n && isi.slice(0, n) === t && isi.slice(-n) === t)
                return { dari: a, sampai: b, sisip: isi.slice(n, -n), pilihA: a, pilihB: b - 2 * n };
            if (!isi) isi = BUNGKUS[jenis][1];
            return { dari: a, sampai: b, sisip: t + isi + t, pilihA: a + n, pilihB: a + n + isi.length };
        }
        if (jenis === 'tautan') {
            var url = /^\s*(https?:\/\/\S+|www\.\S+)\s*$/i.exec(pilih);
            if (url) { var u = /^www\./i.test(url[1]) ? 'https://' + url[1] : url[1]; return { dari: awal, sampai: akhir, sisip: '[teks tautan](' + u + ')', pilihA: awal + 1, pilihB: awal + 12 }; }
            var label = pilih.trim() || 'teks tautan', s = '[' + label + '](https://)';
            return { dari: awal, sampai: akhir, sisip: s, pilihA: awal + label.length + 3, pilihB: awal + s.length - 1 };
        }
        if (AWALAN[jenis]) {
            /* per baris yang tersentuh pilihan */
            var dari = teks.lastIndexOf('\n', awal - 1) + 1, ujung = teks.indexOf('\n', akhir > awal && teks.charAt(akhir - 1) === '\n' ? akhir - 1 : akhir);
            if (ujung < 0) ujung = teks.length;
            var baris = teks.slice(dari, ujung).split('\n');
            var cocok = function (b) { return jenis === 'nomor' ? /^\d+[.)]\s+/.test(b) : b.indexOf(AWALAN[jenis]) === 0 && !(jenis === 'judul' && /^###/.test(b)); };
            var berisi = baris.filter(function (b) { return b.trim(); }), lepas = berisi.length > 0 && berisi.every(cocok), no = 0;
            var hasil = baris.map(function (b) {
                if (!b.trim()) return b;
                var polos = b.replace(POLA_AWALAN, '');
                if (lepas) return polos;
                return (jenis === 'nomor' ? (++no) + '. ' : AWALAN[jenis]) + polos;
            }).join('\n');
            if (!berisi.length) { hasil = AWALAN[jenis]; return { dari: dari, sampai: ujung, sisip: hasil, pilihA: dari + hasil.length, pilihB: dari + hasil.length }; }
            return { dari: dari, sampai: ujung, sisip: hasil, pilihA: baris.length > 1 ? dari : dari + hasil.length, pilihB: dari + hasil.length };
        }
        return null;
    }
    root.ArtikelMd = { keHtml: keHtml, teksPolos: teksPolos, slug: slug, esc: esc, hitung: hitung, format: format };
})(this);
