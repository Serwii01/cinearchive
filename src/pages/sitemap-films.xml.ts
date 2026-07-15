import type { APIRoute } from 'astro';
import { sql, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { filmsCache } from '../db/schema';
import { filmSlug } from '../lib/slug';
import { languages, localizePath } from '../i18n/ui';

export const prerender = false;

// Sitemap de las fichas de película (SSR). @astrojs/sitemap solo incluye rutas
// estáticas, así que estas páginas dinámicas (una por película cacheada, en los 5
// idiomas) se listan aquí. El slug se deriva del título; el id final garantiza que
// la URL siempre resuelve. Se referencia desde robots.txt.

const LANGS = Object.keys(languages);
const MAX = 5000; // tope prudente para no generar un XML gigante

const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://cinearchive.es');

  let rows: { tmdbId: number; title: string | null; fetchedAt: Date }[] = [];
  try {
    rows = await db
      .select({
        tmdbId: filmsCache.tmdbId,
        title: sql<string | null>`${filmsCache.tmdb}->>'title'`,
        fetchedAt: filmsCache.fetchedAt,
      })
      .from(filmsCache)
      .orderBy(desc(filmsCache.fetchedAt))
      .limit(MAX);
  } catch {
    rows = []; // ante un fallo de BD, devolvemos un sitemap vacío (no rompemos el crawl)
  }

  const urls: string[] = [];
  for (const row of rows) {
    const slug = filmSlug(row.tmdbId, row.title);
    const lastmod = new Date(row.fetchedAt).toISOString();
    for (const lang of LANGS) {
      const loc = new URL(localizePath(lang, `film/${slug}`), base).href;
      urls.push(`  <url><loc>${xmlEscape(loc)}</loc><lastmod>${lastmod}</lastmod></url>`);
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join('\n') +
    (urls.length ? '\n' : '') +
    `</urlset>\n`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
