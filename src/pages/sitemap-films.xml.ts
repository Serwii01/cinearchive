import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { filmSlug } from '../lib/slug';
import { backfillTitles } from '../lib/films';
import { localizePath } from '../i18n/ui';
import { localizedEntries, urlset, xmlResponse, type SitemapUrl } from '../lib/sitemap';

export const prerender = false;

// Sitemap de las fichas de película (SSR). @astrojs/sitemap solo incluye rutas
// estáticas, así que estas páginas dinámicas (una por película cacheada) se
// listan aquí. Se referencia desde robots.txt.
//
// Van primero las películas que más gente tiene en sus listas: son las que
// alguien busca, y si hay que cortar por el tope, se corta por las que no.
// Solo castellano e inglés: en gallego, euskera y catalán la ficha sin
// sinopsis traducida lleva noindex, y un sitemap no debe ofrecer páginas que
// luego piden no indexarse. Las traducidas las encuentra Google por el
// hreflang de la propia página.
//
// El slug sale del título en cada idioma (columna `titles`). Las fichas
// guardadas antes de que existiera esa columna se quedan fuera hasta que se
// completen (lib/films.ts lo hace al listarlas): con el título de la ficha
// guardada, que está en el idioma de la última visita, la URL de los demás
// idiomas era una redirección. El id final garantiza que la URL resuelve.

const LANGS = ['es', 'en'] as const;
const MAX = 2500; // películas; 5.000 URLs, la décima parte del límite de un sitemap

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://cinearchive.es');

  let rows: { tmdbId: number; es: string | null; en: string | null; fetchedAt: Date }[] = [];
  try {
    const res = await db.execute(sql`
      select f.tmdb_id as "tmdbId",
             f.titles->>'es' as es,
             f.titles->>'en' as en,
             f.fetched_at as "fetchedAt"
      from films_cache f
      left join (select tmdb_id, count(*) as n from user_films group by tmdb_id) u on u.tmdb_id = f.tmdb_id
      where f.titles is not null
      order by coalesce(u.n, 0) desc, f.fetched_at desc
      limit ${MAX}`);
    rows = res.rows as typeof rows;
  } catch {
    rows = []; // ante un fallo de BD, devolvemos un sitemap vacío (no rompemos el crawl)
  }

  // Las que faltan por títulos entran en las siguientes visitas del rastreador.
  backfillTitles();

  const urls: SitemapUrl[] = [];
  for (const row of rows) {
    const paths: Record<string, string> = {};
    for (const lang of LANGS) {
      paths[lang] = new URL(localizePath(lang, `film/${filmSlug(row.tmdbId, row[lang])}`), base).href;
    }
    urls.push(...localizedEntries(paths, new Date(row.fetchedAt), 'es'));
  }
  return xmlResponse(urlset(urls));
};
