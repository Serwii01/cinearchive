import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  posterUrl,
  posterSrcset,
  backdropUrl,
  profileUrl,
  trailerKey,
  toTmdbLang,
  director,
  slimMovie,
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

describe('slimMovie', () => {
  // Una ficha como la devuelve TMDB de verdad: con todo lo que no se usa.
  const gorda = () =>
    ({
      id: 238,
      imdb_id: 'tt0068646',
      title: 'El padrino',
      original_title: 'The Godfather',
      overview: 'Don Vito…',
      tagline: 'Una oferta',
      release_date: '1972-03-14',
      runtime: 175,
      budget: 6000000,
      revenue: 245066411,
      original_language: 'en',
      poster_path: '/p.jpg',
      backdrop_path: '/b.jpg',
      vote_average: 8.7,
      vote_count: 20000,
      genres: [{ id: 18, name: 'Drama' }],
      production_countries: [{ iso_3166_1: 'US', name: 'United States of America' }],
      production_companies: [{ id: 4, name: 'Paramount', logo_path: '/x.png', origin_country: 'US' }],
      // Lo que TMDB manda y nadie lee:
      adult: false,
      homepage: 'https://…',
      popularity: 123.4,
      spoken_languages: [{ iso_639_1: 'en', name: 'English' }],
      status: 'Released',
      belongs_to_collection: { id: 230, name: 'The Godfather Collection' },
      credits: {
        cast: Array.from({ length: 40 }, (_, i) => ({
          id: i, name: `Actor ${i}`, character: `Rol ${i}`, profile_path: null,
          adult: false, gender: 2, known_for_department: 'Acting', original_name: `Actor ${i}`, popularity: 1, cast_id: i, credit_id: `c${i}`, order: i,
        })),
        crew: [
          { id: 1, job: 'Director', name: 'Francis Ford Coppola', department: 'Directing', credit_id: 'x' },
          { id: 2, job: 'Screenplay', name: 'Mario Puzo', department: 'Writing', credit_id: 'y' },
          ...Array.from({ length: 700 }, (_, i) => ({ id: 100 + i, job: 'Grip', name: `Técnico ${i}`, department: 'Crew', credit_id: `z${i}` })),
        ],
      },
      keywords: { keywords: [{ id: 1, name: 'mafia' }] },
      recommendations: {
        results: Array.from({ length: 20 }, (_, i) => ({
          id: 1000 + i, title: `Rec ${i}`, original_title: `Rec ${i}`, release_date: '1990-01-01', poster_path: '/r.jpg',
          backdrop_path: null, overview: 'x'.repeat(300), vote_average: 7, vote_count: 10, genre_ids: [18], popularity: 5, adult: false, video: false, original_language: 'en',
        })),
      },
      similar: { results: [] },
      videos: {
        results: [
          { key: 'v1', site: 'Vimeo', type: 'Trailer', name: 'no' },
          { key: 'mk', site: 'YouTube', type: 'Featurette', name: 'making of' },
          { key: 'tr', site: 'YouTube', type: 'Trailer', name: 'Tráiler', official: true, iso_639_1: 'es', size: 1080 },
          { key: 'te', site: 'YouTube', type: 'Teaser', name: 'Teaser', official: false },
        ],
      },
      'watch/providers': { results: { ES: {}, US: {} } },
    }) as unknown as TmdbMovie;

  it('quita lo que la web no lee', () => {
    const s = slimMovie(gorda()) as unknown as Record<string, unknown>;
    for (const k of ['adult', 'homepage', 'popularity', 'spoken_languages', 'status', 'belongs_to_collection', 'watch/providers']) {
      expect(k in s, k).toBe(false);
    }
    expect((s.production_companies as { logo_path?: string }[])[0].logo_path).toBeUndefined();
  });

  it('deja el reparto en 10 y el equipo solo con los oficios que se enseñan', () => {
    const s = slimMovie(gorda());
    expect(s.credits!.cast).toHaveLength(10);
    expect(Object.keys(s.credits!.cast[0]).sort()).toEqual(['character', 'id', 'name', 'profile_path']);
    expect(s.credits!.crew.map((c) => c.job)).toEqual(['Director', 'Screenplay']);
    // Lo que la web lee del equipo sigue dando lo mismo.
    expect(director(s)).toBe('Francis Ford Coppola');
  });

  it('recorta similares a 12 y les quita la sinopsis', () => {
    const s = slimMovie(gorda());
    expect(s.recommendations!.results).toHaveLength(12);
    expect(s.recommendations!.results[0].overview).toBe('');
    expect(s.recommendations!.results[0].poster_path).toBe('/r.jpg');
    expect('popularity' in s.recommendations!.results[0]).toBe(false);
  });

  it('conserva los vídeos que trailerKey puede elegir, en su orden', () => {
    const s = slimMovie(gorda());
    expect(s.videos!.results.map((v) => v.key)).toEqual(['tr', 'te']);
    expect(trailerKey(s)).toBe(trailerKey(gorda()));
  });

  it('conserva los campos de la ficha', () => {
    const s = slimMovie(gorda());
    expect(s).toMatchObject({
      id: 238, imdb_id: 'tt0068646', title: 'El padrino', tagline: 'Una oferta', budget: 6000000, revenue: 245066411,
      runtime: 175, vote_average: 8.7, vote_count: 20000, original_language: 'en',
      genres: [{ id: 18, name: 'Drama' }], keywords: { keywords: [{ id: 1, name: 'mafia' }] },
    });
  });

  it('es pura e idempotente', () => {
    const g = gorda();
    const copia = JSON.stringify(g);
    const una = slimMovie(g);
    expect(JSON.stringify(g)).toBe(copia); // no toca la entrada
    expect(JSON.stringify(slimMovie(una))).toBe(JSON.stringify(una)); // segunda pasada, igual
  });

  it('pesa una fracción de la original', () => {
    const g = gorda();
    const ratio = JSON.stringify(slimMovie(g)).length / JSON.stringify(g).length;
    expect(ratio).toBeLessThan(0.1);
  });
});
