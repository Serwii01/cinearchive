import { describe, it, expect } from 'vitest';
import { computeYear, type YearViewing, type YearFilmInfo } from '../src/lib/yearreview';
import { groupByMonth, monthLabel } from '../src/lib/diary';

const info = new Map<number, YearFilmInfo>([
  [1, { runtime: 120, director: 'Kurosawa', genreIds: [18], decade: 1950, year: '1954' }],
  [2, { runtime: 90, director: 'Varda', genreIds: [18, 35], decade: 1960, year: '1962' }],
  [3, { runtime: 60, director: 'Kurosawa', genreIds: [28], decade: 1980, year: '1985' }],
]);
const v = (tmdbId: number, watchedOn: string, rating: number | null = null, rewatch = false): YearViewing => ({
  tmdbId, watchedOn, rating, rewatch,
});

describe('computeYear', () => {
  const rows = [
    v(1, '2026-03-02', 4),
    v(2, '2026-03-03', 5),
    v(3, '2026-03-04', 3.5),
    v(1, '2026-07-10', 4.5, true),
    v(2, '2025-12-31', 1), // de otro año: fuera
  ];
  const r = computeYear(2026, rows, info);

  it('cuenta visionados, películas, revisionados y horas por visionado', () => {
    expect(r.viewings).toBe(4);
    expect(r.films).toBe(3);
    expect(r.rewatches).toBe(1);
    expect(r.hours).toBe(Math.round((120 + 90 + 60 + 120) / 60));
  });
  it('meses y el más cinéfilo', () => {
    expect(r.byMonth[2]).toBe(3);
    expect(r.byMonth[6]).toBe(1);
    expect(r.topMonth).toBe(2);
  });
  it('la racha de días seguidos', () => {
    expect(r.streak).toEqual({ days: 3, from: '2026-03-02', to: '2026-03-04' });
  });
  it('primera, última y la más antigua', () => {
    expect(r.first?.tmdbId).toBe(1);
    expect(r.last?.watchedOn).toBe('2026-07-10');
    expect(r.oldest).toEqual({ tmdbId: 1, year: 1954 });
  });
  it('mejor puntuadas sin repetir, con la nota más alta del año', () => {
    expect(r.topRated).toEqual([
      { tmdbId: 2, rating: 5 },
      { tmdbId: 1, rating: 4.5 },
      { tmdbId: 3, rating: 3.5 },
    ]);
  });
  it('un revisionado no cuenta dos veces en directores ni géneros', () => {
    expect(r.topDirectors[0]).toEqual({ label: 'Kurosawa', count: 2 });
    expect(r.topGenres[0]).toEqual({ id: 18, count: 2 });
  });
  it('día de la semana: lunes = 0', () => {
    // El 2 de marzo de 2026 es lunes.
    expect(r.byWeekday[0]).toBe(1);
  });
  it('un año vacío', () => {
    const e = computeYear(2020, rows, info);
    expect(e).toMatchObject({ viewings: 0, films: 0, topMonth: null, streak: null, first: null });
  });
});

describe('diario', () => {
  it('agrupa por mes conservando el orden', () => {
    const g = groupByMonth([{ watchedOn: '2026-03-09' }, { watchedOn: '2026-03-01' }, { watchedOn: '2026-02-20' }]);
    expect(g.map((m) => [m.month, m.items.length])).toEqual([['2026-03', 2], ['2026-02', 1]]);
  });
  it('rotula el mes con mayúscula', () => {
    expect(monthLabel('2026-03', 'es')).toBe('Marzo de 2026');
    expect(monthLabel('2026-03', 'en')).toBe('March 2026');
  });
});
