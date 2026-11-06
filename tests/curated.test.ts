import { describe, it, expect } from 'vitest';
import { curatedFilm } from '../src/lib/curated';

describe('curatedFilm', () => {
  it('sin id no hay película; con id, título traducido y ruta canónica', () => {
    expect(curatedFilm({ title: 'X', year: 2000 }, 'es')).toBeNull();
    const f = curatedFilm(
      {
        title: 'The Spirit of the Beehive',
        year: 1973,
        tmdbId: 4495,
        original_title: 'El espíritu de la colmena',
        original_language: 'es',
        translations: [{ iso_639_1: 'en', iso_3166_1: 'US', data: { title: 'The Spirit of the Beehive' } }],
      },
      'es',
    )!;
    expect(f.title).toBe('El espíritu de la colmena');
    expect(f.path).toBe('film/el-espiritu-de-la-colmena-4495');
  });
});
