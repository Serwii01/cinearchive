/**
 * "Película del día" para la portada (SOLO SERVIDOR).
 *
 * Se elige de forma determinista por fecha (cambia cada día) y con VARIEDAD DE
 * ÉPOCAS: cada día rota a una década distinta (1930s → 2020s) y se toma una
 * película solvente de esa década. Así la portada no queda anclada a los estrenos
 * del año en curso (antes salía de "tendencias de hoy", casi siempre del año actual).
 *
 * Garantiza además:
 *   - La MISMA película en español y en inglés: el id del día se fija una sola vez
 *     (compartido entre idiomas) y luego se localiza por idioma.
 *   - SIN películas infantiles: se descartan las comedias familiares (Familia +
 *     Comedia: Minions, Mi villano favorito…), pero SÍ pasa la animación de autor
 *     (El viaje de Chihiro es Familia + Fantasía, sin comedia; el anime adulto ni
 *     lleva Familia).
 * Se cachea en memoria por idioma para no repetir la llamada en cada visita.
 */
import { discoverMovies, getMovie, backdropUrl, posterUrl, type TmdbSearchResult } from './tmdb';

export interface FilmOfDay {
  tmdbId: number;
  title: string;
  overview: string;
  year: string;
  backdrop: string | null;
  poster: string | null;
  voteAverage: number;
}

// "Infantil" = comedia familiar (10751 Familia + 35 Comedia). Así caen Minions y
// compañía, pero NO la animación de autor (Chihiro = Familia + Fantasía, sin comedia).
const FAMILY = 10751;
const COMEDY = 35;
const isKids = (r: { genre_ids?: number[] }) => {
  const g = r.genre_ids ?? [];
  return g.includes(FAMILY) && g.includes(COMEDY);
};

// Décadas por las que rota la película del día. Cubren desde el cine clásico hasta
// hoy, para que la recomendación no se limite al año en curso.
const DECADES = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

type PickLike = {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
};

const cache = new Map<string, { day: number; data: FilmOfDay }>();
// Id elegido para el día, compartido por todos los idiomas (misma peli en ES/EN).
let chosen: { day: number; id: number } | null = null;

/** Día absoluto (UTC) desde epoch: cambia una vez al día. */
function dayNumber(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function toFilmOfDay(p: PickLike): FilmOfDay {
  return {
    tmdbId: p.id,
    title: p.title,
    overview: p.overview,
    year: p.release_date ? p.release_date.slice(0, 4) : '',
    backdrop: backdropUrl(p.backdrop_path, 'w1280'),
    poster: posterUrl(p.poster_path, 'w500'),
    voteAverage: p.vote_average,
  };
}

/**
 * Reúne las candidatas del día: una década (rotando) y una página (rotando cada
 * vez que se completa una vuelta de décadas), ordenadas por nota con un mínimo de
 * votos para asegurar calidad. Con imagen y sin infantiles. Si esa combinación
 * viene vacía (décadas antiguas con pocas fichas), cae a popularidad, página 1.
 */
async function buildPool(locale: string, day: number): Promise<TmdbSearchResult[]> {
  const decade = DECADES[day % DECADES.length];
  const page = 1 + (Math.floor(day / DECADES.length) % 5); // 1..5

  const primary = await discoverMovies({ decade, sort: 'vote_average.desc', page }, locale);
  let candidates = primary.results.filter((r) => r.backdrop_path && !isKids(r));

  if (candidates.length === 0) {
    const alt = await discoverMovies({ decade, sort: 'popularity.desc', page: 1 }, locale);
    candidates = alt.results.filter((r) => r.backdrop_path && !isKids(r));
  }
  return candidates;
}

export async function getFilmOfDay(locale: string): Promise<FilmOfDay | null> {
  const day = dayNumber();
  const cached = cache.get(locale);
  if (cached && cached.day === day) return cached.data;

  try {
    const candidates = await buildPool(locale, day);
    if (candidates.length === 0) return null;

    // Fija el id del día UNA sola vez. Orden por id (estable) para que la elección
    // no dependa del orden con que TMDB devuelva los resultados.
    if (!chosen || chosen.day !== day) {
      const sorted = [...candidates].sort((a, b) => a.id - b.id);
      chosen = { day, id: sorted[day % sorted.length].id };
    }

    // Localiza la película elegida en el idioma pedido. Si no aparece en este
    // conjunto (pudo variar entre idiomas), pide su ficha para localizarla igual.
    const inList = candidates.find((r) => r.id === chosen!.id);
    const data = inList ? toFilmOfDay(inList) : toFilmOfDay(await getMovie(chosen.id, locale));

    cache.set(locale, { day, data });
    return data;
  } catch {
    return null;
  }
}
