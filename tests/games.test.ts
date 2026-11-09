import { describe, it, expect } from 'vitest';
import {
  madridDate,
  dayNumber,
  todayNumber,
  secondsToMidnight,
  permutation,
  dailyIndex,
  focusPoint,
  pickChronology,
  checkOrder,
  normalize,
  matchTitles,
  pickChallenger,
  attemptsBoxes,
} from '../src/lib/games';

describe('día de juego', () => {
  it('cambia a medianoche de Madrid, no de UTC', () => {
    // 23:30 UTC del 9 de noviembre = 00:30 del 10 en Madrid (UTC+1 en invierno).
    expect(madridDate(new Date('2026-11-09T23:30:00Z'))).toBe('2026-11-10');
    expect(madridDate(new Date('2026-11-09T22:30:00Z'))).toBe('2026-11-09');
  });

  it('el 9-11-2026 es el reto n.º 1', () => {
    expect(dayNumber('2026-11-09')).toBe(1);
    expect(dayNumber('2026-12-09')).toBe(31);
    expect(todayNumber(new Date('2026-11-09T12:00:00Z'))).toBe(1);
  });

  it('la caché del reto no pasa de medianoche', () => {
    expect(secondsToMidnight(new Date('2026-11-10T22:59:00Z'))).toBe(60); // 23:59 en Madrid
    expect(secondsToMidnight(new Date('2026-11-10T11:00:00Z'))).toBe(12 * 3600); // 12:00
  });
});

describe('azar con semilla', () => {
  it('la permutación es completa y siempre la misma', () => {
    const p = permutation(50, 7);
    expect([...p].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect(permutation(50, 7)).toEqual(p);
    expect(permutation(50, 8)).not.toEqual(p);
  });

  it('no repite reto hasta agotar la bolsa', () => {
    const n = 40;
    const vistos = new Set(Array.from({ length: n }, (_, d) => dailyIndex(d + 1, n, 'fotograma')));
    expect(vistos.size).toBe(n);
    expect(dailyIndex(n + 1, n, 'fotograma')).toBe(dailyIndex(1, n, 'fotograma'));
  });

  it('el punto de zoom queda lejos de los bordes', () => {
    for (let d = 1; d < 200; d++) {
      const { x, y } = focusPoint(d, 'f');
      expect(x).toBeGreaterThanOrEqual(30);
      expect(x).toBeLessThanOrEqual(70);
      expect(y).toBeGreaterThanOrEqual(30);
      expect(y).toBeLessThanOrEqual(70);
    }
  });
});

describe('Cronología', () => {
  const films = Array.from({ length: 200 }, (_, i) => ({ id: i, year: 1930 + (i % 90) }));

  it('elige cinco de años separados, igual para todo el mundo', () => {
    const a = pickChronology(films, 5);
    expect(a).toHaveLength(5);
    const years = a.map((f) => f.year).sort((x, y) => x - y);
    for (let i = 1; i < years.length; i++) expect(years[i] - years[i - 1]).toBeGreaterThanOrEqual(3);
    expect(pickChronology(films, 5)).toEqual(a);
    expect(pickChronology(films, 6)).not.toEqual(a);
  });

  it('marca qué posiciones están bien', () => {
    expect(checkOrder([1950, 1972, 1999, 2010, 2021])).toEqual([true, true, true, true, true]);
    expect(checkOrder([1972, 1950, 1999, 2010, 2021])).toEqual([false, false, true, true, true]);
  });
});

describe('buscador del juego', () => {
  const entries = [
    { id: 1, title: 'El imperio contraataca', original: 'The Empire Strikes Back', year: 1980 },
    { id: 2, title: 'Amélie', original: 'Le Fabuleux Destin d’Amélie Poulain', year: 2001 },
    { id: 3, title: 'La guerra de las galaxias', original: 'Star Wars', year: 1977 },
  ];

  it('ignora tildes, mayúsculas y signos', () => {
    expect(normalize('¡Amélie!')).toBe('amelie');
    expect(matchTitles('amelie', entries).map((e) => e.id)).toEqual([2]);
  });

  it('vale el título original y una palabra del medio', () => {
    expect(matchTitles('star wars', entries).map((e) => e.id)).toEqual([3]);
    expect(matchTitles('contraat', entries).map((e) => e.id)).toEqual([1]);
  });

  it('con menos de dos letras no sugiere nada', () => {
    expect(matchTitles('e', entries)).toEqual([]);
  });
});

describe('¿Cuál tiene mejor nota?', () => {
  const pool = [
    { id: 1, rating: 7.0 },
    { id: 2, rating: 7.1 },
    { id: 3, rating: 8.2 },
    { id: 4, rating: 5.5 },
  ];

  it('el rival nunca empata con el campeón ni repite', () => {
    const r = pickChallenger(pool, pool[0], new Set([3]), () => 0);
    expect(r.id).toBe(4);
    for (let i = 0; i < 20; i++) expect(Math.abs(pickChallenger(pool, pool[0], new Set()).rating - 7)).toBeGreaterThanOrEqual(0.2);
  });
});

describe('compartir', () => {
  it('casillas sin emojis', () => {
    expect(attemptsBoxes(2, true)).toBe('■■●···');
    expect(attemptsBoxes(6, false)).toBe('■■■■■■');
    expect(attemptsBoxes(0, true)).toBe('●·····');
    expect(/\p{Extended_Pictographic}/u.test(attemptsBoxes(3, true))).toBe(false);
  });
});
