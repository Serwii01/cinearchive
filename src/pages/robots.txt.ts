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
// Rastreadores que recogen la web para entrenar modelos de IA. No traen visitas
// y recorren miles de fichas (cada una cuesta una llamada a TMDB): el 7-11-2026
// la caché tenía un millón de películas. Los buscadores con IA (ChatGPT Search,
// Perplexity, Claude cuando alguien le pide una página) sí pueden entrar: esos
// traen gente. Los que no respetan robots.txt se cortan en el Caddyfile.
export const ENTRENAMIENTO = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Amazonbot',
  'cohere-ai',
  'Diffbot',
  'Omgilibot',
  'Timpibot',
];

const DISALLOW = ['/api/', ...PRIVADAS.flatMap((p) => [`/${p}`, `/*/${p}`])];

/** robots.txt con los sitemaps apuntando al dominio real (de astro.config `site`). */
export const GET: APIRoute = ({ site }) => {
  const map = (p: string) => (site ? new URL(p, site).href : `/${p}`);
  const rules = DISALLOW.map((p) => `Disallow: ${p}`).join('\n');
  const body =
    // Un solo grupo para todos: varias líneas User-agent seguidas comparten reglas.
    ENTRENAMIENTO.map((ua) => `User-agent: ${ua}\n`).join('') +
    `Disallow: /\n\n` +
    `User-agent: *\n${rules}\nAllow: /\n\n` +
    `Sitemap: ${map('sitemap-index.xml')}\n` +
    `Sitemap: ${map('sitemap-films.xml')}\n` +
    `Sitemap: ${map('sitemap-people.xml')}\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
