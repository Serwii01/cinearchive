/**
 * Enlaces a fichas de película con su URL definitiva — SOLO SERVIDOR.
 *
 * La ficha redirige (301) si el slug no es exactamente el del título en el
 * idioma de la página (`titles` de films_cache; ver film/[slug].astro). Muchas
 * listas enlazaban con el título que traían a mano —el de TMDB, el del
 * catálogo, el inglés—, y cada uno de esos enlaces era una redirección: Search
 * Console contaba unas 1.700, y la app pintaba la ficha entera para acabar
 * mandando a otra URL.
 *
 * Aquí se piden de una vez los títulos guardados de las películas de una página
 * y se construye el slug con la misma regla que usa la ficha.
 */
import { inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { filmsCache } from '../db/schema';
import { filmSlug } from './slug';
import type { Titles } from './titles';
import type { Lang } from '../i18n/ui';

export type TitleMap = Map<number, Titles>;

/** Los títulos guardados de estas películas (las que no estén en caché, no salen). */
export async function savedTitles(ids: Iterable<number>): Promise<TitleMap> {
  const unicos = [...new Set([...ids].filter((id) => Number.isInteger(id) && id > 0))];
  const out: TitleMap = new Map();
  if (!unicos.length) return out;
  try {
    const rows = await db
      .select({ tmdbId: filmsCache.tmdbId, titles: filmsCache.titles })
      .from(filmsCache)
      .where(inArray(filmsCache.tmdbId, unicos));
    for (const r of rows) if (r.titles) out.set(r.tmdbId, r.titles as Titles);
  } catch {
    /* Sin base de datos, enlaces con el título que se tenga: redirigen, pero resuelven. */
  }
  return out;
}

/**
 * El slug con el que la ficha no redirige: el título guardado en ese idioma y,
 * si no lo hay, el que se tenga (el de TMDB en ese idioma, que es el que usa la
 * ficha cuando le falta el guardado). Pura.
 */
export function canonicalFilmSlug(id: number, lang: Lang, titles: TitleMap, fallback?: string | null): string {
  return filmSlug(id, titles.get(id)?.[lang] ?? fallback ?? null);
}

/** Ruta sin idioma (`film/el-padrino-238`), para pasar a localizePath. */
export const filmPathFor = (id: number, lang: Lang, titles: TitleMap, fallback?: string | null): string =>
  `film/${canonicalFilmSlug(id, lang, titles, fallback)}`;
