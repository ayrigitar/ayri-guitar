/* Tema: mengikuti pengaturan terang/gelap perangkat sampai pengunjung memilih sendiri; pilihannya disimpan di browser. */
(function () {
  var KEY = 'ayri-theme', root = document.documentElement, b = null;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function apply(t) { if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme'); }
  function awal() { var s = get(); return s === 'dark' || s === 'light' ? s : (mq && mq.matches ? 'dark' : 'light'); }
  function label() {
    if (!b) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    b.textContent = dark ? '\u2600\uFE0F Mode Terang' : '\uD83C\uDF19 Mode Gelap';
    b.setAttribute('aria-label', dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
  }
  apply(awal());
  if (mq) {
    var ikuti = function () { if (!get()) { apply(mq.matches ? 'dark' : 'light'); label(); } };
    if (mq.addEventListener) mq.addEventListener('change', ikuti); else if (mq.addListener) mq.addListener(ikuti);
  }
  document.addEventListener('DOMContentLoaded', function () {
    b = document.createElement('button');
    b.type = 'button'; b.className = 'theme-toggle';
    b.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next); set(next); label();
    });
    label(); document.body.appendChild(b);
  });
})();
