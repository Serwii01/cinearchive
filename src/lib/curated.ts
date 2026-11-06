/**
 * Películas elegidas a mano en el contenido propio (atlas): en el JSON
 * van con título y año, y los scripts les añaden el id, el cartel y las
 * traducciones del título de TMDB. Aquí se convierten en lo que pinta la página.
 * Pura (tiene tests).
 */
import type { Lang } from '../i18n/ui';
import type { TmdbTranslation } from './tmdb';
import { titlesFrom } from './titles';
import { filmSlug } from './slug';

export interface RawCuratedFilm {
  title: string;
  year: number;
  tmdbId?: number;
  poster?: string | null;
  original_title?: string;
  original_language?: string;
  translations?: TmdbTranslation[];
}

export interface CuratedFilm {
  tmdbId: number;
  title: string;
  year: number;
  poster: string | null;
  /** Ruta de la ficha sin idioma (`film/<slug>`), con el slug canónico de ese idioma. */
  path: string;
}

/** La película en un idioma, o null si aún no tiene id (falta pasar el script). */
export function curatedFilm(f: RawCuratedFilm, lang: Lang): CuratedFilm | null {
  if (typeof f.tmdbId !== 'number') return null;
  // El mismo título que pone la ficha en su URL, para no enlazar a una
  // dirección que redirige.
  const title = titlesFrom({ original_title: f.original_title ?? f.title, original_language: f.original_language }, f.translations ?? [])[lang];
  return { tmdbId: f.tmdbId, title, year: f.year, poster: f.poster ?? null, path: `film/${filmSlug(f.tmdbId, title)}` };
}

/** Las que ya tienen id, en un idioma. */
export const curatedFilms = (films: RawCuratedFilm[], lang: Lang): CuratedFilm[] =>
  films.map((f) => curatedFilm(f, lang)).filter((f): f is CuratedFilm => f !== null);
