// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

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
  redirects: {
    '/': '/es',
  },
  i18n: {
    locales: ['es', 'en', 'gl', 'eu', 'ca'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  // Evita que Astro "incruste" los scripts pequeños inline en el HTML: así todos
  // salen como /_astro/*.js externos y la CSP estricta (script-src 'self') los
  // permite. Sin esto, el menú móvil, el modo oscuro y los filtros no funcionan
  // en producción (sí en dev, donde no hay CSP).
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', en: 'en-US', gl: 'gl-ES', eu: 'eu-ES', ca: 'ca-ES' },
      },
    }),
  ],
});
