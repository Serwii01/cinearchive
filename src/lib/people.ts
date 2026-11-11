/**
 * Capa de acceso a personas (SOLO SERVIDOR): envuelve getPerson de TMDB con una
 * caché en memoria por (idioma, id), igual que recs.ts/stats.ts. No expone claves.
 */
import { getPerson, posterUrl, toTmdbLang, type TmdbPerson, type TmdbPersonCredit } from './tmdb';
import { registerCache } from './cache-registry';
import { latinNames } from './personnames';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const MAX = 500;
const cache = new Map<string, { at: number; data: TmdbPerson }>();
/** Peticiones en marcha: dos visitas a la vez a la misma persona hacen una sola a TMDB. */
const enCurso = new Map<string, Promise<TmdbPerson>>();

registerCache({
  id: 'people',
  label: 'Fichas de persona',
  ttlMs: TTL_MS,
  maxKeys: MAX,
  size: () => cache.size,
  clear: () => cache.clear(),
});

export async function getPersonCached(id: number, locale: string): Promise<TmdbPerson> {
  // La clave es el idioma que se pide a TMDB, no el de la web: castellano,
  // gallego, euskera y catalán piden lo mismo (es-ES), y con la clave por idioma
  // de la web un rastreador que abría a alguien en los cinco idiomas provocaba
  // cinco peticiones idénticas, con toda su filmografía (cientos de créditos).
  const key = `${toTmdbLang(locale)}:${id}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  let pendiente = enCurso.get(key);
  if (!pendiente) {
    pendiente = cargaPersona(id, locale, key).finally(() => enCurso.delete(key));
    enCurso.set(key, pendiente);
  }
  return pendiente;
}

async function cargaPersona(id: number, locale: string, key: string): Promise<TmdbPerson> {
  const data = await getPerson(id, locale);
  // «芥川龍之介» → Ryunosuke Akutagawa, con el original debajo del título.
  const latin = (await latinNames([data], 1)).get(id);
  if (latin) {
    data.original_name = data.name;
    data.name = latin;
  }
  if (cache.size >= MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), data });
  return data;
}

export interface FilmographyEntry {
  id: number;
  title: string;
  year: string;
  poster: string | null;
  role: string; // personaje o cargo
}

function toEntry(c: TmdbPersonCredit, role: string): FilmographyEntry {
  return {
    id: c.id,
    title: c.title ?? '',
    year: c.release_date ? c.release_date.slice(0, 4) : '',
    poster: posterUrl(c.poster_path, 'w185'),
    role,
  };
}

/** Ordena por año (desc), elimina duplicados por película y descarta sin título. */
function clean(entries: FilmographyEntry[], limit = 30): FilmographyEntry[] {
  const seen = new Set<number>();
  return entries
    .filter((e) => e.title)
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .slice(0, limit);
}

/** Películas dirigidas por la persona (job = Director). */
export function directedFilms(person: TmdbPerson): FilmographyEntry[] {
  return clean(
    person.movie_credits.crew
      .filter((c) => c.job === 'Director')
      .map((c) => toEntry(c, 'Director')),
  );
}

/** Películas en las que ha actuado (orden por relevancia y año). */
export function actedFilms(person: TmdbPerson): FilmographyEntry[] {
  return clean(person.movie_credits.cast.map((c) => toEntry(c, c.character ?? '')));
}
