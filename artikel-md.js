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
    root.ArtikelMd = { keHtml: keHtml, teksPolos: teksPolos, slug: slug, esc: esc };
})(this);
