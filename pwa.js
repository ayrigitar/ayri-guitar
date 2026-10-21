/* Pendaftaran service worker + tombol "Pasang di HP". */
(function () {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
    }
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone || /AyriApp\//.test(navigator.userAgent);
    if (standalone) return;
    /* HP Android: tawarkan juga APK (aplikasi Android buatan sendiri, tidak lewat Play Store) */
    if (/Android/i.test(navigator.userAgent)) { var apk = document.querySelectorAll('[data-apk]'); for (var a = 0; a < apk.length; a++) apk[a].style.display = ''; }
    var btns = document.querySelectorAll('[data-install]'), hints = document.querySelectorAll('[data-install-ios]'), ev = null;
    function show(list, on) { for (var i = 0; i < list.length; i++) list[i].style.display = on ? '' : 'none'; }
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); ev = e; show(btns, true); });
    window.addEventListener('appinstalled', function () { ev = null; show(btns, false); show(hints, false); });
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function () {
        if (!ev) return; ev.prompt();
        ev.userChoice.then(function () { ev = null; show(btns, false); });
    });
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) show(hints, true);
})();
