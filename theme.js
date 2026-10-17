/* Tema: selalu mengikuti pengaturan terang/gelap perangkat (HP atau PC), tanpa tombol. */
(function () {
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function apply() { if (mq && mq.matches) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme'); }
  /* pilihan lama dari tombol tema tidak dipakai lagi */
  try { localStorage.removeItem('ayri-theme'); } catch (e) {}
  apply();
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', apply); else if (mq.addListener) mq.addListener(apply); }
})();
