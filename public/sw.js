/**
 * Service worker de Cine Archive.
 *
 * Existe por dos motivos: para que Android ofrezca instalar la web (Chrome no
 * enseña el botón sin un service worker con manejador de `fetch`) y para que,
 * sin conexión, salga una página del sitio en vez del dinosaurio.
 *
 * REGLA QUE NO SE TOCA: **no se guarda HTML**. La web es SSR y las páginas
 * cambian según quién las pida —si hay sesión, el menú, la cuenta y las listas
 * son de esa persona—. Una página guardada en caché podría enseñarse luego a
 * otra persona en el mismo dispositivo, o enseñar datos viejos como si fueran
 * de ahora. Las navegaciones van SIEMPRE a la red; si la red falla, se sirve
 * /offline, que es una página estática sin nada personal.
 *
 * Lo único que se guarda es lo inmutable: los recursos con hash de Astro, las
 * fuentes y los iconos. Esos no caducan nunca porque cambian de nombre cuando
 * cambian de contenido.
 */

// Al cambiar esta versión se tira la caché anterior entera. Conviene subirla
// cuando cambie lo que se guarda o cómo se guarda.
const VERSION = 'v1';
const CACHE = `cine-archive-${VERSION}`;
const OFFLINE = '/offline';

/** Lo mínimo para poder enseñar algo sin conexión. */
const PRECARGA = [OFFLINE, '/icons/icon-192.png', '/favicon.svg'];

/** Rutas cuyo contenido no cambia sin cambiar de nombre: caché primero. */
const INMUTABLE = /^\/(?:_astro|fonts|icons|covers)\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll falla entero si un solo recurso falla; aquí se añaden de uno en
      // uno para que un icono que falte no deje al service worker sin instalar.
      .then((cache) => Promise.allSettled(PRECARGA.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo lecturas y solo de este dominio. Las peticiones a TMDB o a Internet
  // Archive se dejan pasar sin tocarlas.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // La API nunca se guarda: son datos vivos (sesión, visitas, búsquedas).
  if (url.pathname.startsWith('/api/')) return;

  // Navegaciones: red siempre. Si no hay red, la página de cortesía.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE).then((r) => r ?? Response.error())));
    return;
  }

  // Recursos inmutables: caché primero y, si no está, red (y se guarda).
  if (INMUTABLE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (guardado) =>
          guardado ??
          fetch(request).then((respuesta) => {
            // Solo se guardan respuestas completas y correctas: un 206 o un
            // error cacheado sería peor que no tener nada.
            if (respuesta.ok && respuesta.status === 200) {
              const copia = respuesta.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copia));
            }
            return respuesta;
          }),
      ),
    );
  }

  // Todo lo demás (imágenes de portada servidas por la app, og.png, etc.) pasa
  // a la red sin intervención.
});
