/* Membuat halaman artikel-<slug>.html dari template (scripts/artikel-template.html),
   kartu artikel untuk beranda, dan entri sitemap. Dipakai halaman admin saat menerbitkan artikel. */
(function (root) {
    var md = root.ArtikelMd, esc = md.esc;
    var PENANDA = '<meta name="generator" content="ayri-artikel">';
    /* alamat halaman jadi nama berkas (artikel-<slug>.html) dan tautan: hanya huruf kecil, angka, tanda minus */
    function slugAman(a) { if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(a && a.slug || ''))) throw new Error('Alamat halaman artikel tidak valid: hanya huruf kecil, angka, dan tanda minus.'); return a.slug; }
    function jalurAman(p) { return /^foto\/artikel\/[a-z0-9]+\.(webp|jpg)$/.test(String(p || '')); }
    function fotoValid(a) { return (Array.isArray(a.foto) ? a.foto : []).filter(function (f) { return f && jalurAman(f.path); }); }
    function bulan(ts) { return new Date(ts || Date.now()).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }); }
    function tanggal(ts) { return new Date(ts || Date.now()).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); } /* YYYY-MM-DD */
    function deskripsi(a) {
        var d = String(a.ringkasan || '').trim() || md.teksPolos(a.isi);
        return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
    }
    function halaman(tpl, a, situs) {
        var url = situs + 'artikel-' + slugAman(a) + '.html', foto = fotoValid(a), desk = deskripsi(a);
        var ld = {
            '@context': 'https://schema.org', '@type': 'Article', headline: a.judul.slice(0, 110), description: desk, inLanguage: 'id',
            datePublished: a.terbit_at || undefined, dateModified: a.updated_at || a.terbit_at || undefined, mainEntityOfPage: url,
            image: foto.length ? foto.map(function (f) { return situs + f.path; }) : undefined,
            author: { '@type': 'Organization', name: 'Toko Gitar AYRI', url: situs },
            publisher: { '@type': 'Organization', name: 'Toko Gitar AYRI', url: situs }
        };
        function fig(f, kelas, lazy) {
            return '                <figure class="' + kelas + '"><img src="' + esc(f.path) + '" alt="' + esc(f.alt || a.judul) + '"' + (lazy ? ' loading="lazy"' : '') + ' decoding="async">' +
                (f.alt ? '<figcaption>' + esc(f.alt) + '</figcaption>' : '') + '</figure>';
        }
        var isi = {
            JUDUL: esc(a.judul),
            JUDUL_PENDEK: esc(a.judul.length > 42 ? a.judul.slice(0, 40).replace(/\s+\S*$/, '') + '…' : a.judul),
            DESKRIPSI: esc(desk),
            URL: esc(url),
            TAG: esc(a.tag || 'Hasil Servis'),
            BULAN: esc(bulan(a.terbit_at)),
            /* artikel tanpa foto memakai gambar pratinjau umum artikel, supaya tetap rapi saat dibagikan di WhatsApp */
            OG_IMAGE: foto.length ? '    <meta property="og:image" content="' + esc(situs + foto[0].path) + '">\n    <meta name="twitter:card" content="summary_large_image">'
                : '    <meta property="og:image" content="' + esc(situs + 'og/artikel.jpg') + '">\n    <meta property="og:image:width" content="1200">\n    <meta property="og:image:height" content="630">\n    <meta name="twitter:card" content="summary_large_image">',
            LDJSON: JSON.stringify(ld, null, 2).replace(/</g, '\\u003c'),
            SAMPUL: foto.length ? fig(foto[0], 'article-photo container container--article', false) : '',
            ISI: md.keHtml(a.isi).split('\n').map(function (l) { return '                ' + l; }).join('\n'),
            GALERI: foto.length > 1 ? '                <div class="article-gallery">\n' + foto.slice(1).map(function (f) { return fig(f, 'article-gallery__item', true); }).join('\n') + '\n                </div>' : '',
            WA_TEKS: esc('?text=' + encodeURIComponent('Halo AYRI, saya baca artikel "' + a.judul + '" dan mau konsultasi gitar saya'))
        };
        return tpl.replace(/\{\{([A-Z_]+)\}\}/g, function (m, k) { return k in isi ? isi[k] : m; });
    }
    function kartu(a) {
        var foto = fotoValid(a)[0];
        var thumb = foto ? '<img src="' + esc(foto.path) + '" alt="" loading="lazy" decoding="async">' : '<svg class="nut" viewBox="0 0 240 64"><use href="#nut" fill="url(#g-bone)"/></svg>';
        return '                <a href="artikel-' + esc(slugAman(a)) + '.html" class="article-card" data-reveal>\n' +
            '                    <div class="article-card__thumb" aria-hidden="true">' + thumb + '</div>\n' +
            '                    <div class="article-card__body">\n' +
            '                        <span class="tag">' + esc(a.tag || 'Hasil Servis') + '</span>\n' +
            '                        <h3 class="article-card__title">' + esc(a.judul) + '</h3>\n' +
            '                        <p class="article-card__excerpt">' + esc(deskripsi(a)) + '</p>\n' +
            '                        <span class="article-card__more" aria-hidden="true">Baca artikel <svg class="ic"><use href="#i-arrow"/></svg></span>\n' +
            '                    </div>\n                </a>';
    }
    function entriSitemap(a, situs) { return '  <url>\n    <loc>' + esc(situs + 'artikel-' + slugAman(a) + '.html') + '</loc>\n    <lastmod>' + tanggal(a.updated_at || a.terbit_at) + '</lastmod>\n  </url>'; }
    function gantiBlok(teks, isiBaru, namaFile) {
        var re = /(<!-- ARTIKEL-OTOMATIS:MULAI[^>]*-->)[\s\S]*?(\r?\n[ \t]*<!-- ARTIKEL-OTOMATIS:SELESAI -->)/;
        if (!re.test(teks)) throw new Error('Penanda ARTIKEL-OTOMATIS tidak ditemukan di ' + namaFile);
        return teks.replace(re, function (m, a, b) { return a + (isiBaru ? '\n' + isiBaru : '') + b; });
    }
    root.ArtikelBuilder = { PENANDA: PENANDA, halaman: halaman, kartu: kartu, entriSitemap: entriSitemap, gantiBlok: gantiBlok };
})(this);
