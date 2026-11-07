// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import swVersion from './integrations/sw-version.mjs';

// Dominio público de la app. En el VPS se sobrescribe con la variable de entorno SITE_URL.
const SITE = process.env.SITE_URL ?? 'https://cinearchive.es';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Render híbrido: por defecto SSR (para rutas dinámicas y de API); las páginas
  // editoriales se marcan con `export const prerender = true` y se sirven estáticas.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Puerto fijo en dev/preview para que la URI de redirección de OAuth (Google)
  // siempre coincida: http://localhost:4321/api/auth/callback/google
  server: { port: 4321 },
  trailingSlash: 'ignore',
  // Astro 7 cambió el valor por defecto a 'jsx', que quita los espacios entre
  // elementos en línea (enlaces seguidos, etiquetas…) y descoloca textos.
  compressHTML: true,
  // OJO: aquí NO va un bloque `i18n`. El enrutado por idioma lo lleva
  // src/pages/[...lang]/ (segmento opcional: /cines es español, /en/cines es
  // inglés) junto con src/middleware.ts, que redirige /es/* a la forma sin
  // prefijo y rechaza las secciones que no existen.
  //
  // Declarar `i18n` con prefixDefaultLocale: true activa la estrategia
  // "pathname-prefix-always-no-redirect" de Astro, cuyo middleware interno
  // devuelve 404 a TODA página sin prefijo de idioma: es decir, tumbaría la web
  // entera. Y con prefixDefaultLocale: false, Astro responde a /es/* con un 404
  // pelado en vez del 301 que nos interesa para no partir el SEO.
  // Evita que Astro "incruste" los scripts pequeños inline en el HTML: así todos
  // salen como /_astro/*.js externos y la CSP estricta (script-src 'self') los
  // permite. Sin esto, el menú móvil, el modo oscuro y los filtros no funcionan
  // en producción (sí en dev, donde no hay CSP).
  //
  // cssTarget: Vite 8 escribe por defecto las media queries con la sintaxis nueva
  // (width>=640px), que Safari no entiende hasta la 16.4: en iPhones algo viejos la
  // web perdería todo el diseño adaptable. Con estos destinos sale como antes.
  vite: { build: { assetsInlineLimit: 0, cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'] } },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', en: 'en-US', gl: 'gl-ES', eu: 'eu-ES', ca: 'ca-ES' },
      },
      // Páginas SSR públicas que la integración no ve (solo lista las estáticas).
      customPages: ['', '/en', '/gl', '/eu', '/ca'].map((p) => `${SITE}${p}/estrenos`),
      // Fuera del sitemap las páginas privadas/de auth y las que van a `noindex`
      // (la guía de estilo y la página sin conexión llevan noindex: ofrecerlas en
      // el sitemap es mandarle a Google señales contrarias).
      filter: (page) =>
        !/\/(?:account|watchlist|notifications|stats|recommendations|login|register|forgot|reset|admin|style|offline)(?:\/|$)/.test(
          page,
        ),
    }),
    // Versiona la caché del service worker con cada build (ver el fichero).
    swVersion(),
  ],
});
