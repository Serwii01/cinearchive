import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { localizePath } from '../i18n/ui';
import { localizedEntries, urlset, xmlResponse, type SitemapUrl } from '../lib/sitemap';

export const prerender = false;

// Sitemap de las fichas de persona: quien dirige y los tres primeros del
// reparto de las películas que más gente tiene en sus listas (las mismas que
// encabezan sitemap-films.xml). Más abajo del reparto son papeles pequeños que
// nadie busca en un archivo de cine. Castellano e inglés, como las películas.

const FILMS = 1500;
const MAX = 5000;
const LANGS = ['es', 'en'] as const;

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://cinearchive.es');

  let ids: number[] = [];
  try {
    const { rows } = await db.execute(sql`
      with top as (
        select f.tmdb
        from films_cache f
        left join (select tmdb_id, count(*) as n from user_films group by tmdb_id) u on u.tmdb_id = f.tmdb_id
        order by coalesce(u.n, 0) desc, f.fetched_at desc
        limit ${FILMS}
      ), people as (
        select (p->>'id')::int as id
        from top, jsonb_array_elements(coalesce(top.tmdb->'credits'->'crew', '[]'::jsonb)) p
        where p->>'job' = 'Director'
        union
        select (p->>'id')::int
        from top, jsonb_array_elements(coalesce(top.tmdb->'credits'->'cast', '[]'::jsonb)) with ordinality as c(p, i)
        where c.i <= 3
      )
      select id from people limit ${MAX}`);
    ids = (rows as { id: number }[]).map((r) => r.id);
  } catch {
    ids = [];
  }

  const urls: SitemapUrl[] = [];
  for (const id of ids) {
    const paths: Record<string, string> = {};
    for (const lang of LANGS) paths[lang] = new URL(localizePath(lang, `person/${id}`), base).href;
    urls.push(...localizedEntries(paths, null, 'es'));
  }
  return xmlResponse(urlset(urls));
};
