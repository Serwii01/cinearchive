import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  posterUrl,
  posterSrcset,
  backdropUrl,
  profileUrl,
  trailerKey,
  toTmdbLang,
  director,
  discoverMovies,
  TMDB_IMG,
  type TmdbMovie,
} from '../src/lib/tmdb';

describe('URLs de imágenes', () => {
  it('devuelve null si no hay ruta', () => {
    expect(posterUrl(null)).toBeNull();
    expect(posterSrcset(null)).toBeNull();
    expect(backdropUrl(null)).toBeNull();
    expect(profileUrl(null)).toBeNull();
  });

  it('compone la URL con tamaño y ruta', () => {
    expect(posterUrl('/abc.jpg', 'w342')).toBe(`${TMDB_IMG}/w342/abc.jpg`);
    expect(backdropUrl('/b.jpg', 'w1280')).toBe(`${TMDB_IMG}/w1280/b.jpg`);
    expect(profileUrl('/p.jpg')).toBe(`${TMDB_IMG}/w185/p.jpg`);
  });

  it('srcset incluye 1x y 2x', () => {
    const s = posterSrcset('/x.jpg', 'w342', 'w500');
    expect(s).toContain('/w342/x.jpg 1x');
    expect(s).toContain('/w500/x.jpg 2x');
  });
});

describe('toTmdbLang', () => {
  it('mapea el locale a la región de TMDB', () => {
    expect(toTmdbLang('en')).toBe('en-US');
    expect(toTmdbLang('es')).toBe('es-ES');
    expect(toTmdbLang('cualquiera')).toBe('es-ES');
  });
});

describe('trailerKey', () => {
  const base = { videos: { results: [] } } as unknown as TmdbMovie;

  it('devuelve null si no hay vídeos de YouTube', () => {
    expect(trailerKey(base)).toBeNull();
    expect(
      trailerKey({ videos: { results: [{ key: 'x', site: 'Vimeo', type: 'Trailer', name: '' }] } } as TmdbMovie),
    ).toBeNull();
  });

  it('prioriza el tráiler oficial de YouTube', () => {
    const movie = {
      videos: {
        results: [
          { key: 'teaser', site: 'YouTube', type: 'Teaser', name: '' },
          { key: 'oficial', site: 'YouTube', type: 'Trailer', name: '', official: true },
          { key: 'feature', site: 'YouTube', type: 'Featurette', name: '' },
        ],
      },
    } as TmdbMovie;
    expect(trailerKey(movie)).toBe('oficial');
  });
});

describe('director', () => {
  it('encuentra al director en los créditos', () => {
    const movie = {
      credits: {
        crew: [
          { job: 'Editor', name: 'Otra' },
          { job: 'Director', name: 'Agnès Varda' },
        ],
        cast: [],
      },
    } as unknown as TmdbMovie;
    expect(director(movie)).toBe('Agnès Varda');
  });

  it('devuelve null si no hay director', () => {
    expect(director({ credits: { crew: [], cast: [] } } as unknown as TmdbMovie)).toBeNull();
    expect(director({} as TmdbMovie)).toBeNull();
  });
});

describe('discoverMovies (construcción de la petición)', () => {
  const origKey = process.env.TMDB_API_KEY;
  afterEach(() => {
    process.env.TMDB_API_KEY = origKey;
    vi.unstubAllGlobals();
  });

  // Ejecuta discoverMovies con un fetch simulado y devuelve los parámetros de la URL.
  async function paramsFor(opts: Parameters<typeof discoverMovies>[0]) {
    process.env.TMDB_API_KEY = 'test-key';
    let captured = '';
    vi.stubGlobal('fetch', (url: URL) => {
      captured = url.toString();
      return Promise.resolve(
        new Response(JSON.stringify({ results: [], total_pages: 3 }), {
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    await discoverMovies(opts, 'es');
    return new URL(captured).searchParams;
  }

  it('combina géneros con coma en modo AND', async () => {
    const p = await paramsFor({ genres: [878, 27], genreMode: 'and' });
    expect(p.get('with_genres')).toBe('878,27');
  });

  it('combina géneros con barra en modo OR', async () => {
    const p = await paramsFor({ genres: [878, 27], genreMode: 'or' });
    expect(p.get('with_genres')).toBe('878|27');
  });

  it('excluye géneros, filtra por duración, nota e idioma original', async () => {
    const p = await paramsFor({
      excludeGenres: [35, 10749],
      runtimeGte: 90,
      runtimeLte: 120,
      minRating: 7,
      originalLanguage: 'ja',
    });
    expect(p.get('without_genres')).toBe('35|10749');
    expect(p.get('with_runtime.gte')).toBe('90');
    expect(p.get('with_runtime.lte')).toBe('120');
    expect(p.get('vote_average.gte')).toBe('7');
    expect(p.get('with_original_language')).toBe('ja');
  });

  it('respeta el suelo de votos y lo eleva con minVotes', async () => {
    const floor = await paramsFor({ sort: 'vote_average.desc' });
    expect(floor.get('vote_count.gte')).toBe('300'); // suelo para "mejor valoradas"
    const raised = await paramsFor({ sort: 'popularity.desc', minVotes: 500 });
    expect(raised.get('vote_count.gte')).toBe('500'); // suelo 50 elevado a 500
  });
});
