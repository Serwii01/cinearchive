import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/db/client', () => ({ db: {} }));
const { hayQueGuardar, wikidataAlDia } = await import('../src/lib/films');

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const ahora = Date.parse('2026-11-08T12:00:00Z');
const hace = (ms: number) => new Date(ahora - ms);

describe('films_cache: cuándo se reescribe la fila de una ficha', () => {
  const titles = { es: 'El chico', en: 'The Kid' };

  it('si no estaba, se guarda', () => {
    expect(hayQueGuardar(undefined, { omdbNueva: false, titles }, ahora)).toBe(true);
  });

  it('si se abrió hace poco y no cambia nada, no se toca', () => {
    expect(hayQueGuardar({ fetchedAt: hace(2 * HORA), titles }, { omdbNueva: false, titles: { ...titles } }, ahora)).toBe(false);
  });

  it('se guarda si llegan notas nuevas, si cambian los títulos o si tiene más de un día', () => {
    expect(hayQueGuardar({ fetchedAt: hace(HORA), titles }, { omdbNueva: true, titles }, ahora)).toBe(true);
    expect(hayQueGuardar({ fetchedAt: hace(HORA), titles }, { omdbNueva: false, titles: { ...titles, ca: 'El noi' } }, ahora)).toBe(true);
    expect(hayQueGuardar({ fetchedAt: hace(DIA + HORA), titles }, { omdbNueva: false, titles }, ahora)).toBe(true);
  });
});

describe('localizaciones de Wikidata', () => {
  const lugares = { filming: [], narrative: [] };

  it('sirven si tienen formato actual y menos de 60 días', () => {
    expect(wikidataAlDia(lugares, hace(10 * DIA), ahora)).toBe(true);
    expect(wikidataAlDia(lugares, hace(61 * DIA), ahora)).toBe(false);
    expect(wikidataAlDia(null, hace(DIA), ahora)).toBe(false);
    expect(wikidataAlDia(lugares, null, ahora)).toBe(false);
  });

  it('la ficha ya no consulta Wikidata al pintarse: lo hace el navegador al llegar', () => {
    // Los rastreadores abrían unas 200.000 fichas al día y cada una era una
    // consulta a Wikidata. Si alguien vuelve a llamarla desde loadFilm, esto avisa.
    const src = readFileSync('src/lib/films.ts', 'utf8');
    const loadFilm = src.slice(src.indexOf('async function loadFilm'), src.indexOf('export function hayQueGuardar'));
    expect(loadFilm).not.toMatch(/getFilmLocations\(/);
    const ruta = readFileSync('src/pages/api/films/[id]/locations.astro', 'utf8');
    expect(ruta).toContain('getFilmLocationsFresh(');
    expect(ruta).toContain('rateLimit(');
  });

  it('las notas de OMDb miden su antigüedad con su propia fecha y no se piden al pintar la ficha', () => {
    const src = readFileSync('src/lib/films.ts', 'utf8');
    expect(src).toMatch(/omdbAlDia\(omdb, cached\?\.omdbFetchedAt \?\? null\)/);
    // Los robots gastaban la cuota diaria de OMDb (1.000) abriendo fichas sueltas.
    const loadFilm = src.slice(src.indexOf('async function loadFilm'), src.indexOf('export function hayQueGuardar'));
    expect(loadFilm).not.toMatch(/getOmdbByImdbId\(/);
    const ruta = readFileSync('src/pages/api/films/[id]/notes.astro', 'utf8');
    expect(ruta).toContain('getOmdbFresh(');
    expect(ruta).toContain('rateLimit(');
  });
});

describe('Caddy', () => {
  it('corta la IP de Oracle que rastreaba sin identificarse', () => {
    const caddy = readFileSync('Caddyfile', 'utf8');
    expect(caddy).toMatch(/@ips_bloqueadas remote_ip [^\n]*141\.148\.181\.241/);
    expect(caddy).toContain('respond @ips_bloqueadas 403');
  });
});
