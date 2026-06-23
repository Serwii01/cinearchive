/**
 * "Película del día" para la portada (SOLO SERVIDOR).
 * Se elige de las tendencias de TMDB de forma determinista por fecha (cambia cada
 * día) y se cachea en memoria por idioma para no repetir la llamada en cada visita.
 */
import { trendingDay, backdropUrl, posterUrl, type TmdbTrending } from './tmdb';

export interface FilmOfDay {
  tmdbId: number;
  title: string;
  overview: string;
  year: string;
  backdrop: string | null;
  poster: string | null;
  voteAverage: number;
}

const cache = new Map<string, { day: number; data: FilmOfDay }>();

/** Día absoluto (UTC) desde epoch: cambia una vez al día. */
function dayNumber(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export async function getFilmOfDay(locale: string): Promise<FilmOfDay | null> {
  const day = dayNumber();
  const cached = cache.get(locale);
  if (cached && cached.day === day) return cached.data;

  try {
    const results = await trendingDay(locale);
    const withImage = results.filter((r: TmdbTrending) => r.backdrop_path);
    if (withImage.length === 0) return null;

    // Selección determinista del día (rota por la lista cada jornada).
    const pick = withImage[day % withImage.length];
    const data: FilmOfDay = {
      tmdbId: pick.id,
      title: pick.title,
      overview: pick.overview,
      year: pick.release_date ? pick.release_date.slice(0, 4) : '',
      backdrop: backdropUrl(pick.backdrop_path, 'w1280'),
      poster: posterUrl(pick.poster_path, 'w500'),
      voteAverage: pick.vote_average,
    };
    cache.set(locale, { day, data });
    return data;
  } catch {
    return null;
  }
}
