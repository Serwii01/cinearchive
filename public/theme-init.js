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

  // Cabecera sin saltos: si la última vez había sesión (y perfil), se dice ya,
  // antes de pintar, para que el CSS enseñe «Para ti / Mi cuenta» en vez de
  // «Entrar» y reserve el hueco de la campana y la foto. Solo es un «sí»: lo
  // escriben AuthNav y la cabecera tras preguntar al servidor, que manda.
  try {
    if (localStorage.getItem('cine:auth') === '1') document.documentElement.setAttribute('data-auth', 'user');
    if (localStorage.getItem('cine:perfil') === '1') document.documentElement.setAttribute('data-perfil', '1');
  } catch (e) {}

  // La barra del navegador (y la de estado de la app instalada) sigue al tema
  // de la web. Se vigila el atributo en vez de avisar desde cada sitio que
  // cambia el tema (el botón, las preferencias de la cuenta…): así ninguno se
  // queda fuera. Los colores son --c-background de cada tema (global.css).
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  var pintar = function () {
    var oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
    meta.setAttribute('content', oscuro ? '#0D0D0D' : '#FAFAFA');
  };
  pintar();
  new MutationObserver(pintar).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
})();
