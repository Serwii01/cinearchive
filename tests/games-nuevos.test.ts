import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  REPARTO, repartoPuzzle, repartoCheck, repartoSameSaga, repartoAnswer, freshRepartoSeed,
  anyoFilms, anyoCard, chronoFilms, poolFilm, POOL,
} from '../src/lib/gamepool';
import { yearPoints, ANYO_SIZE, ANYO_MAX_POINTS, MAX_ATTEMPTS } from '../src/lib/games';

describe('Reparto', () => {
  it('tiene cientos de películas, todas con seis nombres legibles y sin animación ni documentales', () => {
    expect(REPARTO.length).toBeGreaterThan(1000);
    for (const f of REPARTO) {
      expect(f.reparto!.length).toBeGreaterThanOrEqual(MAX_ATTEMPTS);
      expect(f.genres).not.toContain(16);
      expect(f.genres).not.toContain(99);
      for (const n of f.reparto!) expect(n, `${f.id}: ${n}`).not.toMatch(/[぀-鿿Ѐ-ӿ]/);
    }
  });

  it('el reto da los seis nombres del sexto al protagonista y no dice qué película es', () => {
    const p = repartoPuzzle({ day: 3 });
    expect(p.cast).toHaveLength(MAX_ATTEMPTS);
    expect(Object.keys(p).sort()).toEqual(['cast', 'day']);
    const f = REPARTO.find((x) => repartoCheck({ day: 3 }, x.id))!;
    expect(p.cast[MAX_ATTEMPTS - 1]).toBe(f.reparto![0]);
    expect(p.cast[0]).toBe(f.reparto![MAX_ATTEMPTS - 1]);
    expect(repartoAnswer({ day: 3 }, 'es').title).toBeTruthy();
  });

  it('el mismo día es el mismo reto para todos, y otro día es otra película', () => {
    expect(repartoPuzzle({ day: 7 })).toEqual(repartoPuzzle({ day: 7 }));
    expect(repartoPuzzle({ day: 7 }).cast).not.toEqual(repartoPuzzle({ day: 8 }).cast);
  });

  it('avisa si se falla con otra película de la misma saga', () => {
    for (let day = 1; day < 400; day++) {
      const f = REPARTO.find((x) => repartoCheck({ day }, x.id))!;
      if (!f.collection) continue;
      const otra = POOL.find((x) => x.collection === f.collection && x.id !== f.id);
      if (!otra) continue;
      expect(repartoSameSaga({ day }, otra.id)).toBe(true);
      expect(repartoSameSaga({ day }, f.id)).toBe(false);
      return;
    }
    throw new Error('ningún reto con saga');
  });

  it('el ilimitado no repite una película ya jugada', () => {
    const vistas = Array.from({ length: 50 }, () => freshRepartoSeed([]));
    const pelis = new Set(vistas.map((seed) => repartoPuzzle({ seed }).cast.join('|')));
    const nueva = repartoPuzzle({ seed: freshRepartoSeed(vistas) }).cast.join('|');
    expect(pelis.has(nueva)).toBe(false);
  });
});

describe('¿En qué año?', () => {
  it('puntos: diez si se clava, uno menos por año de diferencia, nunca negativos', () => {
    expect(yearPoints(1994, 1994)).toBe(ANYO_MAX_POINTS);
    expect(yearPoints(1991, 1994)).toBe(7);
    expect(yearPoints(1997, 1994)).toBe(7);
    expect(yearPoints(1950, 1994)).toBe(0);
  });

  it('cinco películas de años distintos, y no las mismas que la Cronología de ese día', () => {
    const cinco = anyoFilms({ day: 5 });
    expect(cinco).toHaveLength(ANYO_SIZE);
    expect(new Set(cinco.map((f) => f.year)).size).toBe(ANYO_SIZE);
    const crono = new Set(chronoFilms({ day: 5 }).map((f) => f.id));
    expect(cinco.filter((f) => crono.has(f.id)).length).toBeLessThan(ANYO_SIZE);
  });

  it('las tarjetas no llevan el año', () => {
    const f = anyoFilms({ day: 9 })[0];
    const c = anyoCard(f, 'es', 0);
    expect(JSON.stringify(c)).not.toContain(`"year"`);
    expect(poolFilm(f.id)).toBeTruthy();
  });

  it('la API comprueba el día y el año antes de contestar', () => {
    const api = readFileSync('src/pages/api/games/anyo.ts', 'utf8');
    expect(api).toContain('day !== hoy && day !== hoy - 1');
    expect(api).toContain('rateLimit(');
  });
});

describe('¿En qué año?: director legible', () => {
  it('no enseña directores en otro alfabeto', () => {
    const f = POOL.find((x) => x.director && /[぀-鿿]/.test(x.director))!;
    expect(anyoCard(f, 'es', 0).director).toBeNull();
  });
});
