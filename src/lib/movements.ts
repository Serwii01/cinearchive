/**
 * Atlas del cine: movimientos y cinematografías del mundo (src/data/movements.json)
 * y lo que hace falta para pintarlos en el mapa por décadas y cruzarlos con lo
 * que ha visto cada persona («tu mapa»). Pura (tiene tests).
 */
import data from '../data/movements.json';
import type { Lang } from '../i18n/ui';
import type { TmdbTranslation } from './tmdb';
import { titlesFrom } from './titles';
import { filmSlug } from './slug';

type Localized = Record<Lang, string>;

interface RawFilm {
  title: string;
  year: number;
  tmdbId?: number;
  poster?: string | null;
  original_title?: string;
  original_language?: string;
  translations?: TmdbTranslation[];
}

interface RawMovement {
  id: string;
  from: number;
  to: number | null;
  countries: string[];
  directors: string[];
  name: Localized;
  blurb: Localized;
  films: RawFilm[];
}

export interface MovementFilm {
  tmdbId: number;
  title: string;
  year: number;
  poster: string | null;
  /** Ruta de la ficha sin idioma (`film/<slug>`), con el slug canónico de ese idioma. */
  path: string;
}

export interface Movement {
  id: string;
  from: number;
  /** Año de cierre; null si sigue vivo. */
  to: number | null;
  countries: string[];
  directors: string[];
  name: string;
  blurb: string;
  films: MovementFilm[];
}

const RAW = data.items as RawMovement[];

/** Los movimientos en un idioma, por orden cronológico de inicio. */
export function getMovements(lang: Lang): Movement[] {
  return RAW.map((m) => ({
    id: m.id,
    from: m.from,
    to: m.to,
    countries: m.countries,
    directors: m.directors,
    name: m.name[lang],
    blurb: m.blurb[lang],
    // Sin tmdbId no hay ficha a la que enlazar: fuera hasta pasar el script.
    films: m.films
      .filter((f): f is RawFilm & { tmdbId: number } => typeof f.tmdbId === 'number')
      .map((f) => {
        // El mismo título que pone la ficha en su URL, para no enlazar a una
        // dirección que redirige.
        const title = titlesFrom(
          { original_title: f.original_title ?? f.title, original_language: f.original_language },
          f.translations ?? [],
        )[lang];
        return { tmdbId: f.tmdbId, title, year: f.year, poster: f.poster ?? null, path: `film/${filmSlug(f.tmdbId, title)}` };
      }),
  })).sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
}

// Lo puro (décadas, países, «tu mapa») vive aparte para que el script del
// navegador lo use sin cargar este JSON de movimientos.
export * from './atlasmath';
