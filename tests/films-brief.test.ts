import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/db/client', () => ({ db: {} }));
const { BRIEF_KEYS } = await import('../src/lib/films');

/** Los campos `m.algo` que lee una función del código fuente. */
function camposDe(src: string, firma: string): string[] {
  const ini = src.indexOf(firma);
  expect(ini, firma).toBeGreaterThan(-1);
  const cuerpo = src.slice(ini, src.indexOf('\n}\n', ini));
  return [...new Set([...cuerpo.matchAll(/\bm\.(\w+)/g)].map((x) => x[1]))];
}

describe('resumen de película recortado en Postgres', () => {
  // getFilmsBrief ya no trae la ficha entera: si briefFromTmdb o titlesFrom
  // leen un campo que no está en BRIEF_KEYS, saldría vacío sin ningún error.
  it('trae todo lo que lee briefFromTmdb', () => {
    const src = readFileSync('src/lib/films.ts', 'utf8');
    for (const c of camposDe(src, 'function briefFromTmdb(')) {
      if (c === 'credits') continue; // va aparte: dirección y reparto
      expect(BRIEF_KEYS, c).toContain(c);
    }
  });

  it('trae todo lo que lee titlesFrom (para completar títulos que falten)', () => {
    const src = readFileSync('src/lib/titles.ts', 'utf8');
    for (const c of camposDe(src, 'export function titlesFrom(')) expect(BRIEF_KEYS, c).toContain(c);
  });

  it('getFilmsBrief no vuelve a pedir la ficha entera', () => {
    const src = readFileSync('src/lib/films.ts', 'utf8');
    const ini = src.indexOf('export async function getFilmsBrief(');
    const cuerpo = src.slice(ini, src.indexOf('\n}\n', ini));
    expect(cuerpo).toContain('tmdb: BRIEF_FIELDS');
    expect(cuerpo).not.toMatch(/\.select\(\)\s*\.from\(filmsCache\)/);
  });
});

describe('conexiones a Postgres', () => {
  it('no se cierran a los 10 s (abrirlas cuesta CPU)', () => {
    const src = readFileSync('src/db/client.ts', 'utf8');
    expect(src).toMatch(/min: 2/);
    expect(src).toMatch(/idleTimeoutMillis: 5 \* 60 \* 1000/);
    expect(src).toMatch(/max: 10/); // el reparto de las 25 de Postgres (CLAUDE.md)
  });

  it('Postgres suma el tiempo de cada consulta', () => {
    const compose = readFileSync('docker-compose.yml', 'utf8');
    expect(compose).toContain('-c shared_preload_libraries=pg_stat_statements');
  });
});
