/**
 * Atlas del cine: movimientos y cinematografías del mundo (src/data/movements.json)
 * y lo que hace falta para pintarlos en el mapa por décadas y cruzarlos con lo
 * que ha visto cada persona («tu mapa»). Pura (tiene tests).
 */
import data from '../data/movements.json';
import type { Lang } from '../i18n/ui';
import { curatedFilms, type CuratedFilm, type RawCuratedFilm } from './curated';

type Localized = Record<Lang, string>;

interface RawMovement {
  id: string;
  from: number;
  to: number | null;
  countries: string[];
  directors: string[];
  name: Localized;
  blurb: Localized;
  films: RawCuratedFilm[];
}

export type MovementFilm = CuratedFilm;

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
    films: curatedFilms(m.films, lang),
  })).sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
}

// Lo puro (décadas, países, «tu mapa») vive aparte para que el script del
// navegador lo use sin cargar este JSON de movimientos.
export * from './atlasmath';
