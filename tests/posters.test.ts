import { describe, it, expect } from 'vitest';
import { posterSet, posterAt } from '../src/lib/posters';

describe('posterSet', () => {
  it('ofrece los cuatro anchos con descriptor w, venga del tamaño que venga', () => {
    const set = posterSet('https://image.tmdb.org/t/p/w185/abc.jpg');
    expect(set).toBe(
      'https://image.tmdb.org/t/p/w185/abc.jpg 185w, https://image.tmdb.org/t/p/w342/abc.jpg 342w, ' +
        'https://image.tmdb.org/t/p/w500/abc.jpg 500w, https://image.tmdb.org/t/p/w780/abc.jpg 780w',
    );
    expect(posterSet('https://image.tmdb.org/t/p/original/abc.jpg')).toBe(set);
    expect(posterSet('https://image.tmdb.org/t/p/w92/abc.jpg')).toBe(set);
  });

  it('deja en paz lo que no es un cartel de TMDB', () => {
    expect(posterSet(null)).toBeUndefined();
    expect(posterSet(undefined)).toBeUndefined();
    expect(posterSet('/covers/variety-1964-04.webp')).toBeUndefined();
  });
});

describe('posterAt', () => {
  it('cambia solo el ancho', () => {
    expect(posterAt('https://image.tmdb.org/t/p/w185/abc.jpg', 342)).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
  });
});
