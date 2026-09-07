import type { APIRoute } from 'astro';

export const prerender = true;

// Rutas que no aportan a la indexación: API, autenticación y páginas privadas.
// De cada una hay DOS formas que bloquear: la del castellano, que va sin prefijo
// (/account), y la de los otros cuatro idiomas, que sí lo llevan (/en/account,
// cubierto por el comodín `/*/…`).
const PRIVADAS = [
  'account',
  'watchlist',
  'notifications',
  'stats',
  'recommendations',
  'login',
  'register',
  'forgot',
  'reset',
  'admin',
];
const DISALLOW = ['/api/', ...PRIVADAS.flatMap((p) => [`/${p}`, `/*/${p}`])];

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
