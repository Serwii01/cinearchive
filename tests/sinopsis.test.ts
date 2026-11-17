import { describe, it, expect } from 'vitest';
import { sinopsisPropia, conSinopsisPropia } from '../src/lib/sinopsis';
import data from '../src/data/sinopsis.json';
import { pdFilms, pdCopyInfo } from '../src/lib/pdfilms';

const items = (data as { items: Record<string, Record<string, string>> }).items;

describe('sinopsis.json', () => {
  it('cada entrada es de una película de Cine abierto y trae gallego y euskera (catalán solo si TMDB no lo tiene)', () => {
    const deCine = new Set(pdFilms.map((f) => String(f.tmdbId)));
    for (const [id, s] of Object.entries(items)) {
      expect(deCine.has(id), `${id} no es de Cine abierto`).toBe(true);
      for (const l of ['gl', 'eu']) expect(s[l]?.length, `${id}.${l}`).toBeGreaterThan(80);
      for (const [l, v] of Object.entries(s)) {
        expect(['gl', 'eu', 'ca']).toContain(l);
        expect(v.length, `${id}.${l} demasiado larga`).toBeLessThan(600);
      }
    }
  });
});

describe('conSinopsisPropia', () => {
  const propias = { '19': { gl: 'Sinopse.', eu: 'Laburpena.' } };
  const peli = { id: 19, overview: 'Sinopsis en castellano.', translated: false };
  it('pone la propia en gl/eu/ca cuando TMDB no tiene, y la marca como traducida', () => {
    expect(conSinopsisPropia(peli, 'gl', propias)).toMatchObject({ overview: 'Sinopse.', translated: true });
    expect(conSinopsisPropia(peli, 'eu', propias).overview).toBe('Laburpena.');
  });
  it('la de TMDB manda, y en es/en no se toca nada', () => {
    expect(conSinopsisPropia({ ...peli, translated: true, overview: 'De TMDB.' }, 'gl', propias).overview).toBe('De TMDB.');
    expect(conSinopsisPropia(peli, 'es', propias)).toBe(peli);
    expect(conSinopsisPropia(peli, 'ca', propias)).toBe(peli);
    expect(sinopsisPropia(19, 'en', propias)).toBeNull();
  });
});

describe('Cine abierto: la copia y el contexto', () => {
  it('pdCopyInfo: calidad en tres escalones y aviso si es más de un 10 % más corta', () => {
    expect(pdCopyInfo({ runtime: 76, copy: { minutes: 51, height: 240 } })).toEqual({ minutes: 51, quality: 'low', shorter: true });
    expect(pdCopyInfo({ runtime: 94, copy: { minutes: 94, height: 720 } })).toEqual({ minutes: 94, quality: 'hd', shorter: false });
    expect(pdCopyInfo({ runtime: 80, copy: { minutes: 75, height: 480 } })?.shorter).toBe(false);
    expect(pdCopyInfo({ runtime: 80 })).toBeNull();
  });
  it('todas las películas tienen su copia apuntada', () => {
    expect(pdFilms.filter((f) => !f.copy).map((f) => f.id)).toEqual([]);
  });
  it('el contexto, si lo hay, está en los cinco idiomas', () => {
    for (const f of pdFilms.filter((x) => x.context_es)) {
      for (const l of ['en', 'gl', 'eu', 'ca'] as const) expect(f[`context_${l}`], `${f.id}.${l}`).toBeTruthy();
    }
  });
});
