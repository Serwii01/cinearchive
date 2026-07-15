import type { APIRoute } from 'astro';

export const prerender = true;

// Rutas que no aportan a la indexación: API, autenticación y páginas privadas. Se
// bloquea su rastreo (los comodines `/*/…` cubren los 5 prefijos de idioma). El
// contenido editorial y las fichas siguen abiertos.
const DISALLOW = [
  '/api/',
  '/*/account',
  '/*/watchlist',
  '/*/notifications',
  '/*/stats',
  '/*/recommendations',
  '/*/login',
  '/*/register',
  '/*/forgot',
  '/*/reset',
  '/*/admin',
];

/** robots.txt con los sitemaps apuntando al dominio real (de astro.config `site`). */
export const GET: APIRoute = ({ site }) => {
  const map = (p: string) => (site ? new URL(p, site).href : `/${p}`);
  const rules = DISALLOW.map((p) => `Disallow: ${p}`).join('\n');
  const body =
    `User-agent: *\n${rules}\nAllow: /\n\n` +
    `Sitemap: ${map('sitemap-index.xml')}\n` +
    `Sitemap: ${map('sitemap-films.xml')}\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
