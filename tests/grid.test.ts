import { describe, it, expect } from 'vitest';
import { padTo, reviewGrid } from '../src/lib/grid';

describe('padTo', () => {
  it('sube al siguiente múltiplo', () => {
    expect(padTo(1, 12)).toBe(12);
    expect(padTo(12, 12)).toBe(12);
    expect(padTo(13, 12)).toBe(24);
  });
  it('una rejilla vacía se queda vacía', () => {
    expect(padTo(0, 12)).toBe(0);
  });
});

describe('reviewGrid', () => {
  it('ninguna fila a medias en tableta (2 columnas) ni escritorio (3)', () => {
    for (let n = 1; n <= 6; n++) {
      const g = reviewGrid(n);
      const total = n + g.pad;
      expect(total % g.sm, `n=${n} tableta`).toBe(0);
      expect(total % g.lg, `n=${n} escritorio`).toBe(0);
    }
  });
});
