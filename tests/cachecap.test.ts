import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/db/client', () => ({ db: {} }));
const { decidirPoda, MAX_SUELTAS, UMBRAL_A_FONDO } = await import('../src/lib/cachecap');

describe('poda de films_cache', () => {
  it('con la tabla enorme (como el 7-11-2026), a fondo', () => {
    expect(decidirPoda(1_016_576, 3_000)).toBe('a-fondo');
    expect(decidirPoda(UMBRAL_A_FONDO + 1, 0)).toBe('a-fondo');
  });

  it('si sobran películas sin dueño, poda normal', () => {
    expect(decidirPoda(MAX_SUELTAS + 5_001, 5_000)).toBe('normal');
  });

  it('las películas con dueño no cuentan para el tope', () => {
    // 30.000 filas, pero 15.000 son de usuarios: quedan 15.000 sueltas, bajo el tope.
    expect(decidirPoda(30_000, 15_000)).toBe('nada');
    expect(decidirPoda(MAX_SUELTAS, 0)).toBe('nada');
  });

  it('el tope deja margen bajo el umbral, para que la poda normal baste', () => {
    expect(MAX_SUELTAS).toBeLessThan(UMBRAL_A_FONDO / 2);
  });

  it('nunca borra lo que usa alguien', () => {
    const src = readFileSync('src/lib/cachecap.ts', 'utf8');
    for (const t of ['user_films', 'user_list_films', 'user_viewings', 'extra_films']) expect(src).toContain(`select tmdb_id from ${t}`);
    // Toda consulta que borra o vacía lleva la condición de dueño.
    expect(src.match(/not in \$\{conDueno\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('se arranca con la app en producción', () => {
    const mw = readFileSync('src/middleware.ts', 'utf8');
    expect(mw).toMatch(/startCacheCap\(\)/);
  });
});
