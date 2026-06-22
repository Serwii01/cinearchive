// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// Dominio público de la app. En el VPS se sobrescribe con la variable de entorno SITE_URL.
const SITE = process.env.SITE_URL ?? 'https://cine-archive.example.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Render híbrido: por defecto SSR (para rutas dinámicas y de API); las páginas
  // editoriales se marcan con `export const prerender = true` y se sirven estáticas.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'ignore',
  redirects: {
    '/': '/es',
  },
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', en: 'en-US' },
      },
    }),
  ],
});
