/* Interaksi UI bersama (beranda & artikel): menu mobile, header kaca, tombol tema,
   animasi muncul saat di-scroll, penanda menu aktif, jam buka hari ini,
   fretboard, progres baca, dan tombol bagikan. Setiap fitur hanya aktif
   bila elemennya ada di halaman. Tidak mengubah logika theme.js / pwa.js / app.js. */
(function () {
    var root = document.documentElement;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var header = document.querySelector('.site-header');

    /* Menu mobile */
    var btn = document.getElementById('menu-btn'), menu = document.getElementById('mobile-menu');
    if (header && btn && menu) {
        var setOpen = function (open) {
            menu.classList.toggle('is-open', open);
            header.classList.toggle('menu-open', open);
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
        };
        btn.addEventListener('click', function () { setOpen(!menu.classList.contains('is-open')); });
        menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
        document.addEventListener('click', function (e) { if (menu.classList.contains('is-open') && !header.contains(e.target)) setOpen(false); });
        window.addEventListener('resize', function () { if (window.innerWidth >= 1024) setOpen(false); });
    }

    /* Header berubah jadi kaca saat halaman digulir + progres baca artikel */
    var bar = document.querySelector('.read-progress'), body = document.querySelector('[data-read-body]');
    function onScroll() {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
        if (bar && body) {
            var r = body.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
            var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
            bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    /* warna bilah status ikut tema */
    var meta = document.querySelector('meta[name="theme-color"]'), first = true, tmr;
    function syncTheme() {
        var dark = root.getAttribute('data-theme') === 'dark';
        if (meta) meta.setAttribute('content', dark ? '#12100E' : '#FAF7F2');
        if (!first && !reduce) {
            root.classList.add('theme-anim');
            clearTimeout(tmr);
            tmr = setTimeout(function () { root.classList.remove('theme-anim'); }, 450);
        }
        first = false;
    }
    syncTheme();
    new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    /* Garis waktu transkrip (canvas) ikut warna tema baru walau lagu sedang dijeda:
       picu ulang penggambaran lewat slider posisi (nilainya tidak berubah). */
    var seek = document.getElementById('seek'), trApp = document.getElementById('app');
    if (seek && document.getElementById('ctab')) {
        new MutationObserver(function () {
            setTimeout(function () {
                var au = document.getElementById('au');
                if (!trApp || trApp.hidden || (au && !au.paused)) return;
                seek.dispatchEvent(new Event('input')); seek.dispatchEvent(new Event('change'));
            }, 650);
        }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }

    var hasIO = 'IntersectionObserver' in window;

    /* Fade-in elemen saat di-scroll */
    var items = document.querySelectorAll('[data-reveal]');
    if (hasIO && !reduce) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
        }, { rootMargin: '0px 0px -8% 0px' });
        items.forEach(function (el) { io.observe(el); });
    } else {
        items.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* Penanda menu aktif sesuai bagian yang sedang dilihat (hanya tautan "#id" di halaman ini) */
    if (hasIO) {
        var links = [].filter.call(document.querySelectorAll('.nav__link, .tabbar__item'), function (l) {
            return (l.getAttribute('href') || '').charAt(0) === '#';
        });
        if (links.length) {
            var spy = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    links.forEach(function (l) {
                        var on = l.getAttribute('href') === '#' + en.target.id;
                        l.classList.toggle('is-active', on);
                        if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
                    });
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            document.querySelectorAll('main > section[id], footer[id]').forEach(function (s) { spy.observe(s); });
        }

        var chips = document.querySelectorAll('.price-tabs .chip');
        if (chips.length) {
            var chipSpy = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    chips.forEach(function (c) {
                        var on = c.getAttribute('href') === '#' + en.target.id, rail = c.parentNode;
                        c.classList.toggle('is-active', on);
                        if (on && rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: c.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' });
                    });
                });
            }, { rootMargin: '-35% 0px -60% 0px' });
            document.querySelectorAll('.price-card').forEach(function (c) { chipSpy.observe(c); });
        }
    }

    /* Tandai jam buka hari ini (zona waktu WIB) */
    try {
        var wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Jakarta' }).format(new Date());
        var day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
        document.querySelectorAll('.hours__row[data-days]').forEach(function (r) {
            if ((' ' + r.getAttribute('data-days') + ' ').indexOf(' ' + day + ' ') < 0) return;
            r.classList.add('is-today');
            var b = document.createElement('span'); b.className = 'today-badge'; b.textContent = 'Hari ini';
            r.appendChild(b);
        });
    } catch (e) {}

    /* Senar fretboard bergetar saat disentuh / dilewati kursor */
    document.querySelectorAll('.fretboard i').forEach(function (s) {
        function pluck() { s.classList.remove('is-plucked'); void s.offsetWidth; s.classList.add('is-plucked'); }
        s.addEventListener('pointerenter', pluck);
        s.addEventListener('pointerdown', pluck);
    });

    /* Teks besar yang harus muat satu baris (mis. nama chord panjang): kecilkan huruf seperlunya */
    document.querySelectorAll('[data-fit]').forEach(function (el) {
        function fit() {
            el.style.fontSize = '';
            var size = parseFloat(getComputedStyle(el).fontSize), min = size * 0.45;
            while (el.scrollWidth > el.clientWidth + 1 && size > min) { size -= 2; el.style.fontSize = size + 'px'; }
        }
        new MutationObserver(fit).observe(el, { childList: true, characterData: true, subtree: true });
        window.addEventListener('resize', fit);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
        fit();
    });

    /* Perkiraan waktu baca artikel */
    var rt = document.querySelector('[data-readtime]');
    if (rt && body) {
        var words = (body.textContent || '').trim().split(/\s+/).length;
        rt.textContent = Math.max(1, Math.round(words / 200)) + ' menit baca';
        rt.closest('[hidden]') && rt.closest('[hidden]').removeAttribute('hidden');
    }

    /* Tombol bagikan: lembar bagikan bawaan HP, atau salin tautan */
    document.querySelectorAll('[data-share]').forEach(function (b) {
        var label = b.querySelector('[data-share-label]'), text = label ? label.textContent : '';
        b.hidden = false;
        b.addEventListener('click', function () {
            var data = { title: document.title, url: location.href.split('#')[0] };
            if (navigator.share) { navigator.share(data).catch(function () {}); return; }
            if (navigator.clipboard) {
                navigator.clipboard.writeText(data.url).then(function () {
                    if (!label) return;
                    label.textContent = 'Tautan disalin';
                    setTimeout(function () { label.textContent = text; }, 2000);
                }).catch(function () {});
            }
        });
    });
})();
