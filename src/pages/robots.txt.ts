import type { APIRoute } from 'astro';

export const prerender = true;

/** robots.txt con la URL del sitemap apuntando al dominio real (de astro.config `site`). */
export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site).href : '/sitemap-index.xml';
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
