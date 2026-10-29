import { describe, it, expect } from 'vitest';
import { goalProgress, isValidTarget } from '../src/lib/goal';

describe('goalProgress', () => {
  it('a mitad de año, 50 de 100 va al día', () => {
    // 2 de julio de 2026 = día 183 de 365.
    const g = goalProgress(100, 50, 2026, new Date(Date.UTC(2026, 6, 2)));
    expect(g.expected).toBe(50);
    expect(g.diff).toBe(0);
    expect(g.pct).toBe(50);
    expect(g.complete).toBe(false);
    expect(g.left).toBe(50);
    expect(g.perWeek).toBeGreaterThan(1.8);
    expect(g.perWeek).toBeLessThan(2.1);
  });

  it('por delante y por detrás', () => {
    const d = new Date(Date.UTC(2026, 6, 2));
    expect(goalProgress(100, 60, 2026, d).diff).toBe(10);
    expect(goalProgress(100, 40, 2026, d).diff).toBe(-10);
  });

  it('superar la meta no pasa del 100 %', () => {
    const g = goalProgress(10, 14, 2026, new Date(Date.UTC(2026, 3, 1)));
    expect(g.pct).toBe(100);
    expect(g.complete).toBe(true);
    expect(g.left).toBe(0);
    expect(g.perWeek).toBe(0);
  });

  it('un año ya cerrado espera la meta entera y no pide ritmo', () => {
    const g = goalProgress(52, 40, 2025, new Date(Date.UTC(2026, 1, 1)));
    expect(g.expected).toBe(52);
    expect(g.diff).toBe(-12);
    expect(g.perWeek).toBe(0);
  });

  it('un año que aún no empieza no espera nada', () => {
    const g = goalProgress(52, 0, 2027, new Date(Date.UTC(2026, 11, 20)));
    expect(g.expected).toBe(0);
    expect(g.perWeek).toBe(1);
  });
});

describe('isValidTarget', () => {
  it('enteros de 1 a 3650', () => {
    expect(isValidTarget(1)).toBe(true);
    expect(isValidTarget(3650)).toBe(true);
    expect(isValidTarget(0)).toBe(false);
    expect(isValidTarget(3651)).toBe(false);
    expect(isValidTarget(2.5)).toBe(false);
    expect(isValidTarget('10')).toBe(false);
  });
});
