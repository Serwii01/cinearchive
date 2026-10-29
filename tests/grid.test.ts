import { describe, it, expect } from 'vitest';
import { padTo, reviewGrid, fillers } from '../src/lib/grid';

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

describe('fillers', () => {
  // Cuántas casillas de relleno se ven en cada pantalla.
  const visible = (cls: string[], bp: 'base' | 'sm' | 'md' | 'lg') =>
    cls.filter((c) => {
      const tokens = c.split(' ');
      const at = (b: string) => tokens.find((t) => (b === 'base' ? !t.includes(':') : t.startsWith(b + ':')));
      const order = ['base', 'sm', 'md', 'lg'];
      let shown = false;
      for (const b of order.slice(0, order.indexOf(bp) + 1)) {
        const t = at(b);
        if (t) shown = t.endsWith('block');
      }
      return shown;
    }).length;

  it('cierra solo la fila que queda a medias en cada pantalla', () => {
    // 5 carteles en 4 / 6 / 12 columnas: faltan 3, 1 y 7.
    const f = fillers(5, { base: 4, sm: 6, lg: 12 });
    expect(visible(f, 'base')).toBe(3);
    expect(visible(f, 'sm')).toBe(1);
    expect(visible(f, 'lg')).toBe(7);
  });

  it('nunca deja una fila entera de relleno', () => {
    for (let n = 1; n <= 30; n++) {
      const f = fillers(n, { base: 2, sm: 3, lg: 6 });
      expect(visible(f, 'base')).toBeLessThan(2);
      expect(visible(f, 'sm')).toBeLessThan(3);
      expect(visible(f, 'lg')).toBeLessThan(6);
    }
  });

  it('no añade nada si la rejilla ya cierra o está vacía', () => {
    expect(fillers(12, { base: 4, sm: 6, lg: 12 })).toEqual([]);
    expect(fillers(0, { base: 2, lg: 6 })).toEqual([]);
  });

  it('una pantalla sin columnas propias hereda las de la anterior', () => {
    const f = fillers(1, { base: 1, lg: 3 });
    expect(visible(f, 'base')).toBe(0);
    expect(visible(f, 'md')).toBe(0);
    expect(visible(f, 'lg')).toBe(2);
  });
});
