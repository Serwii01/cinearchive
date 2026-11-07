import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  pdFilms,
  pdRelated,
  pdIsoDuration,
  pdVideoLd,
  pdFilmPath,
  pdIsShort,
  pdLicenseUrl,
  PD_TAGS,
  type PdFilm,
} from '../src/lib/pdfilms';

const LANGS = ['es', 'en', 'gl', 'eu', 'ca'] as const;

describe('Cine abierto: los datos', () => {
  it('cada película tiene su sinopsis en los 5 idiomas', () => {
    const faltan = pdFilms.flatMap((f) =>
      LANGS.filter((l) => !String((f as unknown as Record<string, unknown>)[`blurb_${l}`] ?? '').trim()).map((l) => `${f.id}:${l}`),
    );
    expect(faltan).toEqual([]);
  });

  it('sin identificadores repetidos', () => {
    expect(new Set(pdFilms.map((f) => f.id)).size).toBe(pdFilms.length);
  });

  it('cada una tiene al menos un tipo, y todos son de la lista', () => {
    for (const f of pdFilms) {
      expect(f.tags.length, f.id).toBeGreaterThan(0);
      for (const tag of f.tags) expect(PD_TAGS, `${f.id}: ${tag}`).toContain(tag);
    }
  });

  it('cada tipo tiene texto en los 5 idiomas', () => {
    const ui = readFileSync('src/i18n/ui.ts', 'utf8');
    for (const tag of PD_TAGS) expect(ui.split(`'cinema.tag.${tag}':`).length - 1, tag).toBe(5);
  });

  it('dice si es muda o sonora, y la fecha de Internet Archive (la pide Google)', () => {
    for (const f of pdFilms) {
      expect(typeof f.sound, f.id).toBe('boolean');
      expect(f.published ?? '', f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.runtime, f.id).toBeGreaterThan(0);
    }
  });

  it('las de antes de 1927 son mudas (salvo error de datos)', () => {
    expect(pdFilms.filter((f) => f.year < 1927 && f.sound).map((f) => f.id)).toEqual([]);
  });

  it('enlaza con TMDB sin repetir ficha', () => {
    const ids = pdFilms.map((f) => f.tmdbId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hay imprescindibles para «Por dónde empezar», pero no demasiados', () => {
    const n = pdFilms.filter((f) => f.essential).length;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(16);
  });
});

describe('Cine abierto: la lógica', () => {
  const peli = (o: Partial<PdFilm>): PdFilm =>
    ({ id: 'x', title: 'X', original_title: 'X', director: 'Nadie', year: 1950, country: 'EE. UU.', runtime: 90, lang: 'en', blurb_es: '', blurb_en: '', tags: ['drama'], sound: true, ...o }) as PdFilm;

  it('«Si te gusta esta» antepone al mismo director y no se repite a sí misma', () => {
    const base = peli({ id: 'a', director: 'Buster Keaton, Clyde Bruckman', tags: ['comedy'], year: 1926, sound: false });
    const otras = [
      base,
      peli({ id: 'misma-epoca', tags: ['comedy'], year: 1925, sound: false }),
      peli({ id: 'keaton', director: 'Buster Keaton', tags: ['drama'], year: 1923, sound: false }),
      peli({ id: 'lejana', tags: ['horror'], year: 2010 }),
    ];
    const r = pdRelated(base, 3, otras).map((f) => f.id);
    expect(r[0]).toBe('keaton');
    expect(r).not.toContain('a');
    expect(r.at(-1)).toBe('lejana');
  });

  it('con los datos reales siempre da cuatro distintas', () => {
    for (const f of pdFilms) {
      const r = pdRelated(f, 4);
      expect(r.length, f.id).toBe(4);
      expect(new Set(r.map((x) => x.id)).size, f.id).toBe(4);
    }
  });

  it('duración en ISO 8601', () => {
    expect(pdIsoDuration(94)).toBe('PT1H34M');
    expect(pdIsoDuration(60)).toBe('PT1H');
    expect(pdIsoDuration(8)).toBe('PT8M');
    expect(pdIsoDuration(0)).toBe('PT0M');
  });

  it('corto es menos de 40 minutos', () => {
    expect(pdIsShort(peli({ runtime: 39 }))).toBe(true);
    expect(pdIsShort(peli({ runtime: 40 }))).toBe(false);
  });

  it('datos estructurados: película con su vídeo entero', () => {
    const f = peli({ id: 'Nosferatu', title: 'Nosferatu', original_title: 'Nosferatu, eine Symphonie des Grauens', year: 1922, runtime: 94, published: '2010-01-02', language: 'en' });
    const ld = pdVideoLd(f, { pageUrl: 'https://cinearchive.es/cinema/Nosferatu', thumbUrl: 'https://cinearchive.es/cinema/Nosferatu.webp', description: 'D' }) as Record<string, any>;
    expect(ld['@type']).toBe('Movie');
    expect(ld.alternateName).toBe('Nosferatu, eine Symphonie des Grauens');
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.video['@type']).toBe('VideoObject');
    expect(ld.video.uploadDate).toBe('2010-01-02');
    expect(ld.video.embedUrl).toBe('https://archive.org/embed/Nosferatu');
    expect(ld.video.duration).toBe('PT1H34M');
    // Sin fecha no se promete el vídeo (Google lo exige).
    expect((pdVideoLd(peli({}), { pageUrl: 'u', thumbUrl: 't', description: 'd' }) as Record<string, unknown>).video).toBeUndefined();
  });

  it('solo pone URL de licencia cuando se sabe exacta', () => {
    expect(pdLicenseUrl(undefined)).toContain('publicdomain/mark');
    expect(pdLicenseUrl('cc0')).toContain('publicdomain/zero');
    expect(pdLicenseUrl('cc-by')).toBeNull();
  });

  it('la ficha completa lleva el slug con el id de TMDB', () => {
    expect(pdFilmPath(peli({ tmdbId: 653, title: 'Nosferatu' }))).toBe('film/nosferatu-653');
    expect(pdFilmPath(peli({}))).toBeNull();
  });
});
