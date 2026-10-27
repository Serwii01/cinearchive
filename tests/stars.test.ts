import { describe, it, expect } from 'vitest';
import { isValidRating, starParts, formatRating, nextRating, starFill } from '../src/lib/stars';

describe('isValidRating', () => {
  it('acepta de ½ en ½ entre 0,5 y 5', () => {
    for (const r of [0.5, 1, 2.5, 4.5, 5]) expect(isValidRating(r)).toBe(true);
  });
  it('rechaza el resto', () => {
    for (const r of [0, 5.5, 3.7, -1, NaN, '4', null]) expect(isValidRating(r)).toBe(false);
  });
});

describe('starParts', () => {
  it('3,5 son tres llenas, media y una apagada', () => {
    expect(starParts(3.5)).toEqual({ full: '★★★', half: true, empty: '★' });
  });
  it('las enteras no llevan media', () => {
    expect(starParts(4)).toEqual({ full: '★★★★', half: false, empty: '★' });
    expect(starParts(5)).toEqual({ full: '★★★★★', half: false, empty: '' });
  });
  it('½ sola', () => {
    expect(starParts(0.5)).toEqual({ full: '', half: true, empty: '★★★★' });
  });
});

describe('formatRating', () => {
  it('usa la coma en castellano y el punto en inglés', () => {
    expect(formatRating(3.5, 'es')).toBe('3,5');
    expect(formatRating(3.5, 'en')).toBe('3.5');
    expect(formatRating(4, 'es')).toBe('4');
  });
});

describe('nextRating', () => {
  it('pulsar, volver a pulsar y una tercera vez: n, n − ½, nada', () => {
    expect(nextRating(0, 4)).toBe(4);
    expect(nextRating(4, 4)).toBe(3.5);
    expect(nextRating(3.5, 4)).toBe(0);
  });
  it('pulsar otra estrella pone esa entera', () => {
    expect(nextRating(3.5, 2)).toBe(2);
    expect(nextRating(1.5, 5)).toBe(5);
  });
});

describe('starFill', () => {
  it('llena, media o vacía', () => {
    expect(starFill(3.5, 3)).toBe('full');
    expect(starFill(3.5, 4)).toBe('half');
    expect(starFill(3.5, 5)).toBe('empty');
  });
});
