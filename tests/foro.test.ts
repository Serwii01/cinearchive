import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/db/client', () => ({ db: {} }));
const { validateThread, cleanText, isForumCategory, TITLE_MAX, BODY_MAX } = await import('../src/lib/forum');
const { threadPath, parseThreadId } = await import('../src/lib/forumpaths');
const { madridToUtc, madridDay, sessionAt, sessionByKey, sessionState, upcomingSessions, playheadSeconds, CINECLUB_FILMS, BEFORE_MIN, AFTER_MIN } = await import('../src/lib/cineclub');
const { pickVideo } = await import('../src/lib/iavideo');
const { diaValido, ventanaDelDia } = await import('../src/lib/releases');

describe('foro: hilos', () => {
  it('valida categoría, título y mensaje', () => {
    expect(validateThread({ category: 'general', title: 'Hitchcock y el suspense', body: 'Hablemos.' })).toBeNull();
    expect(validateThread({ category: 'spam', title: 'Hola qué tal', body: 'x' })).toBe('category');
    expect(validateThread({ category: 'general', title: 'Ho', body: 'x' })).toBe('title');
    expect(validateThread({ category: 'general', title: 'x'.repeat(TITLE_MAX + 1), body: 'x' })).toBe('title');
    expect(validateThread({ category: 'general', title: 'Dos\nlíneas', body: 'x' })).toBe('title');
    expect(validateThread({ category: 'general', title: 'Bien puesto', body: '   ' })).toBe('body');
    expect(validateThread({ category: 'general', title: 'Bien puesto', body: 'x'.repeat(BODY_MAX + 1) })).toBe('body');
    expect(isForumCategory('cineclub')).toBe(true);
  });

  it('limpia el texto: sin espacios de sobra ni montones de líneas en blanco', () => {
    expect(cleanText('  hola  \r\n\r\n\r\n\r\nadiós  ')).toBe('hola\n\nadiós');
  });

  it('la URL de un hilo lleva el título y se lee el id aunque cambie', () => {
    expect(threadPath(12, '¿Mejor película de 1927?')).toBe('foro/12-mejor-pelicula-de-1927');
    expect(parseThreadId('12-mejor-pelicula-de-1927')).toBe(12);
    expect(parseThreadId('12')).toBe(12);
    expect(parseThreadId('cineclub')).toBeNull();
  });

  it('escribir pide perfil y tiene límite; ocultar solo el autor o un administrador', () => {
    const comun = readFileSync('src/pages/api/forum/_comun.ts', 'utf8');
    expect(comun).toContain("json(400, { error: 'need_profile' })");
    expect(readFileSync('src/pages/api/forum/threads.ts', 'utf8')).toContain('rateLimit(`forum:thread:');
    const lib = readFileSync('src/lib/forum.ts', 'utf8');
    expect(lib).toMatch(/by\.admin \? undefined : eq\(forumThreads\.userId, by\.userId\)/);
    expect(lib).toMatch(/by\.admin \? undefined : eq\(forumPosts\.userId, by\.userId\)/);
  });
});

describe('cineclub: calendario', () => {
  it('pasa la hora de Madrid a UTC en invierno y en verano', () => {
    expect(new Date(madridToUtc('2026-11-20', '22:00')).toISOString()).toBe('2026-11-20T21:00:00.000Z');
    expect(new Date(madridToUtc('2027-07-02', '22:00')).toISOString()).toBe('2027-07-02T20:00:00.000Z');
    expect(madridDay(Date.parse('2026-11-20T23:30:00Z'))).toBe('2026-11-21');
  });

  it('hay sesión los viernes a las 22:00 y los domingos a las 18:00, y no otros días', () => {
    expect(sessionAt('2026-11-20', '22:00')?.key).toBe('2026-11-20-2200');
    expect(sessionAt('2026-11-22', '18:00')).not.toBeNull();
    expect(sessionAt('2026-11-21', '22:00')).toBeNull();
    expect(sessionByKey('2026-11-20-2200')?.film.id).toBe(sessionAt('2026-11-20', '22:00')?.film.id);
    expect(sessionByKey('nada')).toBeNull();
  });

  it('solo largos y mediometrajes, y no repite película en semanas seguidas', () => {
    expect(CINECLUB_FILMS.every((f) => f.runtime >= 40)).toBe(true);
    const ids = upcomingSessions(Date.parse('2026-11-18T10:00:00Z'), 8).map((s) => s.film.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('estado de la sala y segundo en que va la película', () => {
    const s = sessionAt('2026-11-20', '22:00')!;
    expect(sessionState(s, s.startsAt - (BEFORE_MIN + 1) * 60000)).toBe('upcoming');
    expect(sessionState(s, s.startsAt - 60000)).toBe('open');
    expect(sessionState(s, s.startsAt + 60000)).toBe('playing');
    expect(sessionState(s, s.endsAt + 60000)).toBe('after');
    expect(sessionState(s, s.endsAt + (AFTER_MIN + 1) * 60000)).toBe('over');
    expect(playheadSeconds(s, s.startsAt + 90_000)).toBe(90);
    expect(playheadSeconds(s, s.startsAt - 5000)).toBe(0);
  });

  it('la lista de próximas incluye la que está en marcha y va en orden', () => {
    const s = sessionAt('2026-11-20', '22:00')!;
    const lista = upcomingSessions(s.startsAt + 10 * 60000, 3);
    expect(lista[0].key).toBe(s.key);
    expect(lista.map((x) => x.startsAt)).toEqual([...lista].map((x) => x.startsAt).sort((a, b) => a - b));
  });
});

describe('cineclub: vídeo de Internet Archive', () => {
  it('elige el MP4 de más calidad y lee su duración', () => {
    const v = pickVideo('Intolerance1916', [
      { name: 'Intolerance (1916).ogv', format: 'Ogg Video', length: '12687.89' },
      { name: 'Intolerance_512kb.mp4', format: '512Kb MPEG4', length: '12687.9' },
      { name: 'Intolerance (1916).mp4', format: 'MPEG4', length: '12687.9' },
    ]);
    expect(v?.url).toBe('https://archive.org/download/Intolerance1916/Intolerance%20(1916).mp4');
    expect(v?.length).toBe(12688);
    expect(pickVideo('x', [{ name: 'a.ogv', format: 'Ogg Video' }])).toBeNull();
  });

  it('la CSP deja reproducir vídeo de archive.org', () => {
    expect(readFileSync('Caddyfile', 'utf8')).toContain("media-src 'self' https://archive.org https://*.archive.org");
  });
});

describe('¿Qué echaban el día que…?', () => {
  it('acepta fechas reales entre 1920 y hoy', () => {
    expect(diaValido('1984-05-12', '2026-11-16')).toBe('1984-05-12');
    expect(diaValido('1984-02-30', '2026-11-16')).toBeNull();
    expect(diaValido('1900-01-01', '2026-11-16')).toBeNull();
    expect(diaValido('2030-01-01', '2026-11-16')).toBeNull();
    expect(diaValido('ayer', '2026-11-16')).toBeNull();
  });

  it('mira las cuatro semanas anteriores al día', () => {
    expect(ventanaDelDia('1984-05-12')).toEqual({ from: '1984-04-15', to: '1984-05-12' });
  });
});

describe('exportar la cuenta', () => {
  it('incluye lo escrito en el foro y en el chat del cineclub', async () => {
    const { shapeExport } = await import('../src/lib/account');
    const out = shapeExport({
      user: { name: 'A' }, profile: null, preferences: null, films: [], lists: [], listFilms: [], following: [], followers: [], badges: [], providers: [],
      forum: { threads: [{ id: 1, category: 'general', title: 'Hola', body: 'Texto', userId: 'x' }], posts: [{ threadId: 1, body: 'R' }], chat: [{ session: '2026-11-20-2200', body: 'Hola' }] },
    });
    expect(out.forum.threads[0]).toEqual({ id: 1, category: 'general', title: 'Hola', body: 'Texto' });
    expect(out.forum.replies).toHaveLength(1);
    expect(out.forum.cineclubChat[0]).toEqual({ session: '2026-11-20-2200', body: 'Hola' });
  });
});
