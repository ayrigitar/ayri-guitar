/* Pembantu mode aplikasi: tinggi header, tombol tema ringkas, laci (bottom sheet). */
(function () {
  function hdr() { var n = document.querySelector('nav.fixed'); document.documentElement.style.setProperty('--hdr', (n ? n.offsetHeight : 64) + 'px'); }
  hdr(); window.addEventListener('resize', hdr); window.addEventListener('load', hdr);
  document.addEventListener('DOMContentLoaded', function () {
    hdr(); document.body.classList.add('app-page');
    var b = document.querySelector('.theme-toggle'), s = document.getElementById('themeslot');
    if (b && s) {
      s.appendChild(b);
      var short = function () { var t = document.documentElement.getAttribute('data-theme') === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'; if (b.textContent !== t) b.textContent = t; };
      new MutationObserver(short).observe(b, { childList: true, characterData: true, subtree: true }); short();
    }
  });
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'); if (o) { var d = document.getElementById(o.getAttribute('data-open')); if (d) d.hidden = false; return; }
    var c = e.target.closest('[data-close]'); if (c) { var p = c.closest('.drawer'); if (p) p.hidden = true; return; }
    if (e.target.classList && e.target.classList.contains('drawer')) e.target.hidden = true;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') [].forEach.call(document.querySelectorAll('.drawer'), function (d) { d.hidden = true; }); });
})();
