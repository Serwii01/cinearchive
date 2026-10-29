import { describe, it, expect } from 'vitest';
import { addDays, cinemaFriday, releaseWindows, dedupeLists, toReleaseFilms } from '../src/lib/releases';

describe('cinemaFriday', () => {
  it('es el mismo día si es viernes y el anterior si no', () => {
    expect(cinemaFriday('2026-10-30')).toBe('2026-10-30'); // viernes
    expect(cinemaFriday('2026-10-29')).toBe('2026-10-23'); // jueves: aún es la semana del 23
    expect(cinemaFriday('2026-11-01')).toBe('2026-10-30'); // domingo
  });
});

describe('addDays', () => {
  it('cruza meses, años y el cambio de hora', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('releaseWindows', () => {
  it('semanas de viernes a jueves sin huecos ni solapes', () => {
    const w = releaseWindows('2026-10-29');
    expect(w.thisWeek).toEqual({ from: '2026-10-23', to: '2026-10-29' });
    expect(w.nextWeek).toEqual({ from: '2026-10-30', to: '2026-11-05' });
    expect(w.later).toEqual({ from: '2026-11-06', to: '2026-12-03' });
    expect(w.earlier).toEqual({ from: '2026-09-25', to: '2026-10-22' });
  });
});

describe('dedupeLists', () => {
  it('deja cada película en la primera lista donde sale', () => {
    const out = dedupeLists([[{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }], [{ id: 1 }]]);
    expect(out).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }], []]);
  });
});

describe('toReleaseFilms', () => {
  it('descarta lo que no tiene cartel o fecha', () => {
    const base = { title: 'T', original_title: 'T', overview: '', vote_average: 0 };
    const out = toReleaseFilms([
      { ...base, id: 1, poster_path: '/a.jpg', release_date: '2026-10-30', genre_ids: [18] },
      { ...base, id: 2, poster_path: null, release_date: '2026-10-30' },
      { ...base, id: 3, poster_path: '/c.jpg' },
    ]);
    expect(out.map((f) => f.id)).toEqual([1]);
    expect(out[0]).toMatchObject({ date: '2026-10-30', genreIds: [18] });
    expect(out[0].poster).toContain('/w342/a.jpg');
  });
});
