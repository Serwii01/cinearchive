/**
 * «Tus directores y actores»: a quién has visto más y quién te gusta más.
 * Pura (tiene tests): recibe las películas vistas con su nota y su gente.
 *
 * «Más visto» cuenta películas, no visionados: ver tres veces la misma no es
 * conocer mejor al director. «Te gusta más» es la media de tus notas, y solo
 * entra quien tenga al menos `minRated` películas puntuadas: con una sola, un
 * cinco suelto pondría a cualquiera en cabeza.
 */

export interface Person {
  id: number;
  name: string;
}

export interface PersonFilm {
  tmdbId: number;
  rating: number | null;
  directors: Person[];
  cast: Person[];
}

export interface PersonScore extends Person {
  /** Películas vistas con esta persona. */
  count: number;
  /** De esas, cuántas tienen nota. */
  rated: number;
  /** Media de esas notas, o null si no hay ninguna. */
  avg: number | null;
}

export interface TopPeople {
  directors: PersonScore[];
  actors: PersonScore[];
  favDirectors: PersonScore[];
  favActors: PersonScore[];
}

function tally(films: PersonFilm[], pick: (f: PersonFilm) => Person[]): PersonScore[] {
  const m = new Map<number, { p: Person; films: Set<number>; sum: number; rated: number }>();
  for (const f of films) {
    for (const p of pick(f)) {
      let e = m.get(p.id);
      if (!e) m.set(p.id, (e = { p, films: new Set(), sum: 0, rated: 0 }));
      // La misma película dos veces en la lista (o dos papeles en ella) cuenta una.
      if (e.films.has(f.tmdbId)) continue;
      e.films.add(f.tmdbId);
      if (f.rating != null) {
        e.sum += f.rating;
        e.rated++;
      }
    }
  }
  return [...m.values()].map((e) => ({
    id: e.p.id,
    name: e.p.name,
    count: e.films.size,
    rated: e.rated,
    avg: e.rated ? e.sum / e.rated : null,
  }));
}

const byCount = (a: PersonScore, b: PersonScore) => b.count - a.count || (b.avg ?? 0) - (a.avg ?? 0) || a.name.localeCompare(b.name);
const byAvg = (a: PersonScore, b: PersonScore) => (b.avg ?? 0) - (a.avg ?? 0) || b.rated - a.rated || a.name.localeCompare(b.name);

export function topPeople(films: PersonFilm[], opts: { n?: number; minRated?: number } = {}): TopPeople {
  const n = opts.n ?? 8;
  const minRated = opts.minRated ?? 3;
  const dirs = tally(films, (f) => f.directors);
  const acts = tally(films, (f) => f.cast);
  // Quien solo sale en una película no es «tu» nadie: el ranking de más vistos
  // empieza en dos.
  const seen = (xs: PersonScore[]) => xs.filter((x) => x.count >= 2).sort(byCount).slice(0, n);
  const liked = (xs: PersonScore[]) => xs.filter((x) => x.rated >= minRated).sort(byAvg).slice(0, n);
  return { directors: seen(dirs), actors: seen(acts), favDirectors: liked(dirs), favActors: liked(acts) };
}
