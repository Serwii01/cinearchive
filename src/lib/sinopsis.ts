import data from '../data/sinopsis.json';
import type { TmdbMovie } from './tmdb';
import type { Lang } from '../i18n/ui';

/**
 * Sinopsis propias en gallego, euskera y catalán (src/data/sinopsis.json) para
 * fichas a las que TMDB no se las da.
 *
 * POR QUÉ. Una ficha en gl/eu/ca sin sinopsis traducida enseña la castellana y
 * lleva noindex (sería una copia de la ficha en castellano). Con estas, las
 * películas de Cine abierto que más trabajamos —las del cineclub y las de «La
 * crítica de su época»— existen de verdad en esos idiomas y Google las indexa.
 */
type Propias = Record<string, Partial<Record<'gl' | 'eu' | 'ca', string>>>;
const PROPIAS = (data as { items: Propias }).items;

export function sinopsisPropia(tmdbId: number, lang: Lang, propias: Propias = PROPIAS): string | null {
  if (lang !== 'gl' && lang !== 'eu' && lang !== 'ca') return null;
  return propias[String(tmdbId)]?.[lang]?.trim() || null;
}

/**
 * La ficha con la sinopsis propia puesta, solo si TMDB no trae la suya en ese
 * idioma (la de TMDB manda: la puede corregir cualquiera). Pura.
 */
export function conSinopsisPropia<T extends Pick<TmdbMovie, 'id' | 'overview' | 'translated'>>(
  movie: T,
  lang: Lang,
  propias: Propias = PROPIAS,
): T {
  if (movie.translated) return movie;
  const propia = sinopsisPropia(movie.id, lang, propias);
  return propia ? { ...movie, overview: propia, translated: true } : movie;
}

/** Cuántas hay por idioma (para el test y para /admin si hace falta). */
export const totalPropias = (propias: Propias = PROPIAS) => Object.keys(propias).length;
