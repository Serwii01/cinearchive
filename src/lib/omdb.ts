/**
 * Cliente de OMDb — SOLO SERVIDOR.
 * Clave en process.env.OMDB_API_KEY (sin PUBLIC_). Plan gratuito = 1000 req/día,
 * por eso los resultados se cachean en films_cache (ver lib/films.ts).
 */

const BASE = 'https://www.omdbapi.com/';

export interface OmdbData {
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
  Ratings?: { Source: string; Value: string }[];
  Rated?: string;
  Awards?: string;
  BoxOffice?: string;
  Production?: string;
  Response: 'True' | 'False';
  Error?: string;
}

export async function getOmdbByImdbId(imdbId: string): Promise<OmdbData | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return null;
  const url = new URL(BASE);
  url.searchParams.set('apikey', key);
  url.searchParams.set('i', imdbId);
  url.searchParams.set('tomatoes', 'true');
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as OmdbData;
    return data.Response === 'True' ? data : null;
  } catch {
    return null;
  }
}
