// Modo oscuro y menú del móvil. Lo mismo que hacen ThemeToggle.astro y
// Header.astro en la web, sin dependencias.
(function () {
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');

  var pintar = function () {
    var oscuro = root.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('[data-theme-toggle] [data-icon]').forEach(function (el) {
      el.textContent = oscuro ? '☀' : '☾';
    });
    if (meta) meta.setAttribute('content', oscuro ? '#0D0D0D' : '#FAFAFA');
  };
  pintar();

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var oscuro = root.getAttribute('data-theme') !== 'dark';
      if (oscuro) root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
      try {
        localStorage.setItem('theme', oscuro ? 'dark' : 'light');
      } catch (e) {}
      pintar();
    });
  });

  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('menu-movil');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
      var icon = toggle.querySelector('[data-icon]');
      if (icon) icon.textContent = menu.hidden ? '☰' : '✕';
    });
  }
})();
