/* Tema: terang = bawaan. Pilihan pengunjung disimpan di browsernya. */
(function () {
  var KEY = 'ayri-theme', root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function apply(t) { if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme'); }
  apply(get() === 'dark' ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'theme-toggle';
    function label() {
      var dark = root.getAttribute('data-theme') === 'dark';
      b.textContent = dark ? '\u2600\uFE0F Mode Terang' : '\uD83C\uDF19 Mode Gelap';
      b.setAttribute('aria-label', dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    }
    b.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next); set(next); label();
    });
    label(); document.body.appendChild(b);
  });
})();
