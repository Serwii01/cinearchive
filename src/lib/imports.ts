/**
 * Importar desde IMDb y Trakt — la parte pura (navegador, servidor y tests).
 * Ambos acaban en la misma lista de películas que Letterboxd (LbFilm), así
 * que la vista previa, el guardado y la regla de «lo de aquí gana» son los
 * mismos para los tres.
 *
 *  - IMDb exporta CSV sueltos: ratings.csv (tus notas, de 1 a 10) y la
 *    watchlist. Cada fila trae el id de IMDb («tt0047478»), con el que TMDB
 *    encuentra la película sin adivinar por el título.
 *  - Trakt da JSON (su exportación o herramientas de copia de seguridad como
 *    trakt-backup): historial con fecha, notas de 1 a 10 y watchlist. Cada
 *    película ya trae el id de TMDB.
 */
import { parseCsv, type LbFilm } from './letterboxd';

export type ImportSource = 'letterboxd' | 'imdb' | 'trakt';

/** Nota de 1 a 10 a estrellas de ½ en ½: un 7 son tres estrellas y media. */
export function tenToStars(n: unknown): number | null {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 10 ? v / 2 : null;
}

const toYear = (s: unknown) => {
  const n = Number(s);
  return Number.isInteger(n) && n > 1870 && n < 3000 ? n : null;
};
const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);

/* ------------------------------------------------------------------ *
 * IMDb
 * ------------------------------------------------------------------ */

/** ¿Es un CSV de IMDb? Lo delata la columna «Const» con el id. */
export function isImdbCsv(text: string): boolean {
  const head = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  return /(^|,)"?Const"?(,|$)/.test(head);
}

// Series, episodios, videojuegos y pódcast no son películas. Se comparan sin
// espacios ni mayúsculas: el formato viejo dice «TV Series» y el nuevo «tvSeries».
const NOT_FILMS = new Set(['tvseries', 'tvepisode', 'tvminiseries', 'videogame', 'podcastseries', 'podcastepisode', 'tvshort']);

/**
 * Junta uno o varios CSV de IMDb. Con nota = vista y puntuada; en la
 * watchlist sin nota = pendiente. IMDb no tiene diario: «Date Rated» es
 * cuándo se puntuó, no cuándo se vio, así que no crea visionados.
 */
export function collectImdb(texts: string[]): LbFilm[] {
  const map = new Map<string, LbFilm>();
  for (const text of texts) {
    for (const r of parseCsv(text)) {
      const id = (r.Const ?? '').trim();
      if (!/^tt\d+$/.test(id)) continue;
      const type = (r['Title Type'] ?? '').replace(/\s+/g, '').toLowerCase();
      if (NOT_FILMS.has(type)) continue;
      let f = map.get(id);
      if (!f) {
        const name = (r.Title || r['Original Title'] || id).trim();
        f = { key: id, imdbId: id, name, year: toYear(r.Year), watched: false, watchlist: false, liked: false, rating: null, review: null, viewings: [] };
        map.set(id, f);
      }
      const rating = tenToStars(r['Your Rating']);
      if (rating != null) {
        f.rating = rating;
        f.watched = true;
      } else if ('Position' in r) {
        // Solo el CSV de la watchlist (o de una lista) tiene «Position».
        f.watchlist = true;
      }
    }
  }
  for (const f of map.values()) if (f.watched) f.watchlist = false;
  return [...map.values()];
}

/* ------------------------------------------------------------------ *
 * Trakt
 * ------------------------------------------------------------------ */

interface TraktMovie {
  title?: string;
  year?: number;
  ids?: { tmdb?: number | null; imdb?: string | null };
}
interface TraktItem {
  type?: string;
  movie?: TraktMovie;
  rating?: number;
  rated_at?: string;
  watched_at?: string;
  last_watched_at?: string;
  plays?: number;
  listed_at?: string;
}

/**
 * Junta los JSON de Trakt. Se reconoce cada cosa por sus campos, no por el
 * nombre del fichero (cada herramienta los llama a su manera), salvo la
 * watchlist: un elemento con `listed_at` puede estar en cualquier lista, y
 * solo los de la watchlist son «pendientes».
 */
export function collectTrakt(files: { name: string; text: string }[]): LbFilm[] {
  const map = new Map<string, LbFilm>();
  for (const file of files) {
    let data: unknown;
    try {
      data = JSON.parse(file.text);
    } catch {
      continue;
    }
    if (!Array.isArray(data)) continue;
    const isWatchlist = /watchlist/i.test(file.name);
    for (const it of data as TraktItem[]) {
      const m = it?.movie;
      if (!m || (it.type && it.type !== 'movie')) continue;
      const tmdbId = Number(m.ids?.tmdb) || null;
      const imdbId = m.ids?.imdb && /^tt\d+$/.test(m.ids.imdb) ? m.ids.imdb : null;
      const key = tmdbId ? `tmdb:${tmdbId}` : imdbId ?? `${(m.title ?? '').toLowerCase()}|${m.year ?? ''}`;
      if (!tmdbId && !imdbId && !m.title) continue;
      let f = map.get(key);
      if (!f) {
        f = {
          key,
          ...(tmdbId ? { tmdbId } : {}),
          ...(imdbId ? { imdbId } : {}),
          name: m.title ?? key,
          year: toYear(m.year),
          watched: false,
          watchlist: false,
          liked: false,
          rating: null,
          review: null,
          viewings: [],
        };
        map.set(key, f);
      }
      if (it.rating != null && it.rated_at) {
        const r = tenToStars(it.rating);
        if (r != null) { f.rating = r; f.watched = true; }
      }
      if (isDay(it.watched_at)) {
        f.watched = true;
        const date = it.watched_at.slice(0, 10);
        if (!f.viewings.some((v) => v.date === date)) f.viewings.push({ date, rating: null, rewatch: false });
      }
      if (it.plays || it.last_watched_at) f.watched = true;
      if (it.listed_at && isWatchlist) f.watchlist = true;
    }
  }
  for (const f of map.values()) {
    f.viewings.sort((a, b) => a.date.localeCompare(b.date));
    if (f.watched) f.watchlist = false;
  }
  return [...map.values()];
}

/* ------------------------------------------------------------------ *
 * ¿De dónde viene lo que ha subido?
 * ------------------------------------------------------------------ */

/**
 * Qué es cada fichero: un CSV de Letterboxd (por su nombre), uno de IMDb (por
 * su cabecera) o un JSON de Trakt. Devuelve el origen que más ficheros aporta.
 */
export function detectSource(files: { name: string; text: string }[], isLetterboxd: (name: string) => boolean): ImportSource | null {
  let lb = 0, imdb = 0, trakt = 0;
  for (const f of files) {
    const n = f.name.toLowerCase();
    if (n.endsWith('.json')) trakt++;
    else if (n.endsWith('.csv') && isImdbCsv(f.text)) imdb++;
    else if (isLetterboxd(f.name)) lb++;
  }
  const max = Math.max(lb, imdb, trakt);
  if (max === 0) return null;
  return lb === max ? 'letterboxd' : imdb === max ? 'imdb' : 'trakt';
}
