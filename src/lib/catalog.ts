/**
 * Catálogo de la filmoteca: combina las fichas curadas estáticas (src/data/films.json)
 * con las añadidas desde el panel de administración (tabla extra_films en la BD).
 */
import filmsData from '../data/films.json';
import { db } from '../db/client';
import { extraFilms } from '../db/schema';
import { desc } from 'drizzle-orm';
import type { Lang } from '../i18n/ui';

export interface CatalogFilm {
  title: string;
  original_title: string;
  director: string | null;
  year: number;
  country: string;
  runtime_min: number;
  tmdbId?: number; // presente solo en las añadidas desde el panel
  /** Título en cada idioma de la web, de las traducciones de TMDB (scripts/fetch-film-titles.mjs). */
  titles?: Partial<Record<Lang, string>>;
}

/**
 * Título para mostrar en un idioma. Gallego, euskera y catalán caen al
 * castellano cuando TMDB no tiene traducción (es lo que verían en una sala), y
 * todos al título de referencia del catálogo.
 */
export function localTitle(f: Pick<CatalogFilm, 'title' | 'titles'>, lang: Lang): string {
  const t = f.titles;
  if (!t) return f.title;
  return t[lang] ?? (lang === 'en' ? undefined : t.es) ?? f.title;
}

export async function getCatalog(): Promise<CatalogFilm[]> {
  const base: CatalogFilm[] = (filmsData.films as Record<string, unknown>[]).map((f) => ({
    title: String(f.title),
    original_title: String(f.original_title),
    director: (f.director as string) ?? null,
    year: Number(f.year) || 0,
    country: String(f.country ?? ''),
    runtime_min: Number(f.runtime_min) || 0,
    tmdbId: typeof f.tmdbId === 'number' ? f.tmdbId : undefined,
    titles: (f.titles as CatalogFilm['titles']) ?? undefined,
  }));

  let extras: CatalogFilm[] = [];
  try {
    const rows = await db.select().from(extraFilms).orderBy(desc(extraFilms.addedAt));
    extras = rows.map((r) => ({
      title: r.title,
      original_title: r.originalTitle,
      director: r.director,
      year: r.year ?? 0,
      country: r.country ?? '',
      runtime_min: r.runtimeMin ?? 0,
      tmdbId: r.tmdbId,
    }));
  } catch {
    /* BD no disponible: se muestra solo el catálogo estático */
  }

  return [...extras, ...base];
}
