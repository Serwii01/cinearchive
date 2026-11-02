import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import data from '../src/data/fonoteca.json';
import { composerByPerson, fonotecaCount, getComposers, getMilestones, getRecordings, getScores } from '../src/lib/fonoteca';
import { curatedFilm } from '../src/lib/curated';

const LANGS = ['es', 'en', 'gl', 'eu', 'ca'] as const;

describe('fonoteca: contenido', () => {
  it('todo lleva su texto en los cinco idiomas', () => {
    const texts = [
      ...data.recordings.map((r) => ['grabación ' + r.id, r.blurb] as const),
      ...data.scores.map((s) => ['partitura ' + s.id, s.blurb] as const),
      ...data.composers.map((c) => ['compositor ' + c.id, c.blurb] as const),
      ...data.milestones.map((m) => ['hito ' + m.year, m.text] as const),
    ];
    for (const [what, t] of texts) for (const l of LANGS) expect((t as Record<string, string>)[l], `${what} · ${l}`).toBeTruthy();
  });

  it('solo hay grabaciones y partituras de dominio público en EE. UU.', () => {
    // Grabaciones: publicadas hace 100 años o más. Partituras: 1930 o antes.
    const lastRecording = new Date().getFullYear() - 101;
    for (const r of data.recordings) expect(r.year, r.id).toBeLessThanOrEqual(lastRecording);
    for (const s of data.scores) expect(s.year, s.id).toBeLessThanOrEqual(1930);
  });

  it('cada grabación y cada partitura tiene su miniatura en public/fonoteca', () => {
    for (const { id } of [...data.recordings, ...data.scores]) {
      expect(existsSync(join('public', 'fonoteca', `${id}.jpg`)), id).toBe(true);
    }
  });

  it('los ids no se repiten ni llevan puntos (romperían la URL)', () => {
    const ids = [...data.recordings, ...data.scores].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).not.toContain('.');
    expect(new Set(data.composers.map((c) => c.id)).size).toBe(data.composers.length);
  });
});

describe('fonoteca: lo que pinta la página', () => {
  it('compositores por año de nacimiento, con su id de TMDB y sus películas enlazadas', () => {
    const cs = getComposers('es');
    expect(cs.map((c) => c.born)).toEqual([...cs.map((c) => c.born)].sort((a, b) => a - b));
    for (const c of cs) {
      expect(c.tmdbId, c.id).toBeTypeOf('number');
      expect(c.films.length, c.id).toBeGreaterThan(0);
      for (const f of c.films) expect(f.path).toMatch(/^film\/.+-\d+$/);
    }
  });

  it('el título de cada película va en el idioma de la página', () => {
    const rota = (lang: 'es' | 'en') => getComposers(lang).find((c) => c.id === 'nino-rota')!.films.find((f) => f.tmdbId === 238)!.title;
    expect(rota('en')).toBe('The Godfather');
    expect(rota('es')).toBe('El padrino');
  });

  it('hitos en orden y enlazados a su película', () => {
    const ms = getMilestones('es');
    expect(ms.map((m) => m.year)).toEqual([...ms.map((m) => m.year)].sort((a, b) => a - b));
    for (const m of ms) expect(m.film, String(m.year)).not.toBeNull();
  });

  it('cuenta las piezas que se pueden escuchar o leer', () => {
    expect(fonotecaCount()).toBe(getRecordings('es').length + getScores('es').length);
  });

  it('composerByPerson encuentra al compositor por su id de TMDB', () => {
    const herrmann = getComposers('es').find((c) => c.id === 'bernard-herrmann')!;
    expect(composerByPerson(herrmann.tmdbId!)).toEqual({ id: 'bernard-herrmann', name: 'Bernard Herrmann' });
    expect(composerByPerson(-1)).toBeNull();
  });
});

describe('curatedFilm', () => {
  it('sin id no hay película; con id, título traducido y ruta canónica', () => {
    expect(curatedFilm({ title: 'X', year: 2000 }, 'es')).toBeNull();
    const f = curatedFilm(
      {
        title: 'The Spirit of the Beehive',
        year: 1973,
        tmdbId: 4495,
        original_title: 'El espíritu de la colmena',
        original_language: 'es',
        translations: [{ iso_639_1: 'en', iso_3166_1: 'US', data: { title: 'The Spirit of the Beehive' } }],
      },
      'es',
    )!;
    expect(f.title).toBe('El espíritu de la colmena');
    expect(f.path).toBe('film/el-espiritu-de-la-colmena-4495');
  });
});
