import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { estadoDisco, MIN_LIBRE } from '../src/lib/disk';

const GB = 1024 ** 3;

describe('aviso de disco', () => {
  it('como el 7-11-2026 (17 de 58 GB libres) aún va bien', () => {
    expect(estadoDisco(17 * GB, 58 * GB)).toBe('ok');
  });

  it('avisa por debajo del 15 % libre', () => {
    expect(MIN_LIBRE).toBe(0.15);
    expect(estadoDisco(8 * GB, 58 * GB)).toBe('low');
    expect(estadoDisco(0, 58 * GB)).toBe('low');
  });

  it('sin datos no se inventa nada', () => {
    expect(estadoDisco(5, 0)).toBe('unknown');
    expect(estadoDisco(Number.NaN, 58 * GB)).toBe('unknown');
  });

  it('/api/health lo cuenta y la vigilancia lo mira', () => {
    expect(readFileSync('src/pages/api/health.ts', 'utf8')).toMatch(/disk/);
    expect(readFileSync('.github/workflows/vigilancia.yml', 'utf8')).toContain('"disk":"low"');
  });
});
