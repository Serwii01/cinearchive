import { describe, it, expect } from 'vitest';
import {
  posterUrl,
  posterSrcset,
  backdropUrl,
  profileUrl,
  trailerKey,
  toTmdbLang,
  director,
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
