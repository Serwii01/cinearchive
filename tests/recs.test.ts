import { describe, it, expect } from 'vitest';
import { affinity, score, selectBalanced, type Candidate } from '../src/lib/recs';
import type { TmdbSearchResult } from '../src/lib/tmdb';

const film = (id: number, genre_ids: number[], vote_average = 7): TmdbSearchResult => ({
  id,
  title: `Peli ${id}`,
  original_title: `Peli ${id}`,
  poster_path: '/p.jpg',
  overview: '',
  vote_average,
  vote_count: 500,
  genre_ids,
});

const cand = (id: number, kind: Candidate['reason']['kind'], label: string, strength: number, genres: number[] = [18], vote = 7): Candidate => ({
  film: film(id, genres, vote),
  reason: { kind, label },
  strength,
});

describe('affinity', () => {
  it('normaliza al género de más peso: nada pasa de 1', () => {
    const w = new Map([[80, 40], [18, 10]]);
    expect(affinity([80], w)).toBe(1);
    expect(affinity([18], w)).toBeCloseTo(0.25);
  });

  it('promedia entre los géneros de la película en vez de sumarlos', () => {
    // Antes se sumaban pesos sin tope y una película con cinco géneros ganaba
    // siempre a una con uno solo, fuera cual fuera el gusto del usuario.
    const w = new Map([[80, 10], [18, 10], [53, 10]]);
    expect(affinity([80, 18, 53], w)).toBe(1);
    expect(affinity([80], w)).toBe(1);
  });

  it('los géneros valorados bajo restan', () => {
    const w = new Map([[18, 10], [27, -6]]);
    expect(affinity([27], w)).toBeLessThan(0);
    expect(affinity([18, 27], w)).toBeLessThan(affinity([18], w));
  });

  it('sin géneros o sin pesos, cero', () => {
    expect(affinity(undefined, new Map([[18, 5]]))).toBe(0);
    expect(affinity([18], new Map())).toBe(0);
  });
});

describe('score', () => {
  it('a igual motivo, gana la mejor valorada', () => {
    const w = new Map<number, number>();
    expect(score(cand(1, 'genre', 'Drama', 0.5, [18], 8.5), w)).toBeGreaterThan(score(cand(2, 'genre', 'Drama', 0.5, [18], 6), w));
  });

  it('un director favorito pesa más que un género favorito', () => {
    const w = new Map([[18, 3]]);
    expect(score(cand(1, 'director', 'Varda', 1, [18]), w)).toBeGreaterThan(score(cand(2, 'genre', 'Drama', 0.55, [18]), w));
  });
});

describe('selectBalanced', () => {
  it('reparte por turnos: cada motivo coloca uno antes de que nadie repita', () => {
    const cs = [
      ...Array.from({ length: 10 }, (_, i) => cand(100 + i, 'genre', 'Crimen', 0.55, [80], 9)),
      ...Array.from({ length: 3 }, (_, i) => cand(200 + i, 'director', 'Ozu', 1, [18], 7)),
      ...Array.from({ length: 3 }, (_, i) => cand(300 + i, 'film', 'El padrino', 0.7, [80], 7)),
    ];
    // Pesos que harían ganar a Crimen en cualquier suma ingenua.
    const w = new Map([[80, 40], [18, 3]]);
    const out = selectBalanced(cs, w, 6);
    const motivos = new Set(out.map((c) => c.reason.label));
    expect(motivos).toEqual(new Set(['Crimen', 'Ozu', 'El padrino']));
    // Dos por motivo en las seis primeras, no seis de Crimen.
    for (const label of motivos) expect(out.filter((c) => c.reason.label === label)).toHaveLength(2);
  });

  it('dentro de cada motivo, va de mejor a peor', () => {
    const cs = [cand(1, 'genre', 'Drama', 0.5, [18], 5), cand(2, 'genre', 'Drama', 0.5, [18], 9), cand(3, 'genre', 'Drama', 0.5, [18], 7)];
    expect(selectBalanced(cs, new Map(), 3).map((c) => c.film.id)).toEqual([2, 3, 1]);
  });

  it('no repite una película que llega por dos motivos', () => {
    const cs = [cand(7, 'film', 'A', 0.7), cand(7, 'director', 'B', 1), cand(8, 'genre', 'C', 0.5)];
    const out = selectBalanced(cs, new Map(), 10);
    expect(out.map((c) => c.film.id).sort()).toEqual([7, 8]);
  });

  it('respeta el tope y agota los grupos cortos sin bloquearse', () => {
    const cs = [...Array.from({ length: 20 }, (_, i) => cand(i, 'genre', 'Drama', 0.5)), cand(99, 'director', 'Varda', 1)];
    const out = selectBalanced(cs, new Map(), 8);
    expect(out).toHaveLength(8);
    expect(out[0].reason.label).toBe('Varda'); // el grupo más fuerte abre
  });

  it('con una lista vacía devuelve vacío', () => {
    expect(selectBalanced([], new Map(), 5)).toEqual([]);
  });
});
