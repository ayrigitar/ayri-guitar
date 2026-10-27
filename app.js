/* Pembantu mode aplikasi: tinggi header dan laci (bottom sheet). */
(function () {
  function hdr() { var n = document.querySelector('nav.fixed'); document.documentElement.style.setProperty('--hdr', (n ? n.offsetHeight : 64) + 'px'); }
  hdr(); window.addEventListener('resize', hdr); window.addEventListener('load', hdr);
  document.addEventListener('DOMContentLoaded', function () {
    hdr(); document.body.classList.add('app-page');
  });
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'); if (o) { var d = document.getElementById(o.getAttribute('data-open')); if (d) d.hidden = false; return; }
    var c = e.target.closest('[data-close]'); if (c) { var p = c.closest('.drawer'); if (p) p.hidden = true; return; }
    if (e.target.classList && e.target.classList.contains('drawer')) e.target.hidden = true;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') [].forEach.call(document.querySelectorAll('.drawer'), function (d) { d.hidden = true; }); });
})();

/* Penyesuaian otomatis: tinggi layar nyata, jendela aplikasi (standalone), teks besar. */
(function () {
  var MIN = { tuner: ['#tm', 170], chords: ['#dia', 130], metronom: ['#vis', 120], transkrip: ['.tr-now', 90] };
  var page = (location.pathname.split('/').pop() || '').replace('.html', ''), raf = 0, busy = false;
  function setH() { var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight; document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px'); }
  if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) document.documentElement.classList.add('standalone');
  function fit() {
    var m = document.querySelector('main.app'); if (!m || m.classList.contains('gulir')) return; busy = true;
    m.classList.remove('fit1', 'fit2', 'fit3'); var cfg = MIN[page];
    function squeezed() { var lf = page === 'chords' && m.querySelector('.chleft'); if (lf && lf.offsetParent !== null && lf.scrollHeight > lf.clientHeight + 1) return true; var n = cfg && m.querySelector(cfg[0]); if (n && n.offsetParent !== null && n.getBoundingClientRect().height < cfg[1]) return true; return m.scrollHeight > m.clientHeight + 1; }
    for (var l = 1; l <= 3 && squeezed(); l++) m.classList.add('fit' + l);
    setTimeout(function () { busy = false; }, 0);
  }
  function sched() { if (busy) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); }
  /* ganti-ganti class tiap ketukan/denyut (penanda ketukan, lampu LED, dsb.) tidak mengubah ukuran apa pun: wadahnya diberi data-fitskip supaya tidak memicu hitung ulang tiap ketukan */
  function hanyaTampilan(r) { return r.type === 'attributes' && r.attributeName === 'class' && r.target.closest && !!r.target.closest('[data-fitskip]'); }
  setH(); window.addEventListener('resize', function () { setH(); sched(); }); window.addEventListener('orientationchange', function () { setTimeout(function () { setH(); sched(); }, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { setH(); sched(); });
  document.addEventListener('DOMContentLoaded', function () {
    var m = document.querySelector('main.app'); if (!m) return; setH(); sched();
    new MutationObserver(function (recs) { if (recs.every(function (r) { return r.target === m || hanyaTampilan(r); })) return; sched(); }).observe(m, { subtree: true, attributes: true, attributeFilter: ['hidden', 'class'], childList: true });
    window.addEventListener('load', function () { setH(); sched(); });
  });
})();
