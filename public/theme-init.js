// Aplica el tema guardado ANTES de pintar, para evitar parpadeo (FOUC).
// Script clásico y externo (no inline) → compatible con una CSP estricta.
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (e) {}
})();
