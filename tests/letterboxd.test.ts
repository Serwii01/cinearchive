import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  collectFilms,
  lbFileKind,
  lbRating,
  normTitle,
  pickMatch,
  mergeFilm,
  clipNote,
  MAX_NOTE,
  type ImportFilm,
} from '../src/lib/letterboxd';

describe('parseCsv', () => {
  it('lee comillas, comillas escapadas y saltos de línea dentro de un campo', () => {
    const rows = parseCsv('Name,Year,Review\r\n"Amélie",2001,"Una ""joya"",\nde verdad"\r\nHeat,1995,\n');
    expect(rows).toEqual([
      { Name: 'Amélie', Year: '2001', Review: 'Una "joya",\nde verdad' },
      { Name: 'Heat', Year: '1995', Review: '' },
    ]);
  });
  it('quita el BOM y no se ahoga con un fichero vacío', () => {
    expect(parseCsv('﻿Name\nX')).toEqual([{ Name: 'X' }]);
    expect(parseCsv('')).toEqual([]);
  });
});

describe('lbFileKind', () => {
  it('reconoce los CSV del export y descarta las carpetas de borrados', () => {
    expect(lbFileKind('letterboxd-ana-2026/diary.csv')).toBe('diary');
    expect(lbFileKind('likes/films.csv')).toBe('likes');
    expect(lbFileKind('deleted/diary.csv')).toBeNull();
    expect(lbFileKind('profile.csv')).toBeNull();
  });
});

describe('lbRating', () => {
  it('acepta medias estrellas y rechaza lo demás', () => {
    expect(lbRating('3.5')).toBe(3.5);
    expect(lbRating('')).toBeNull();
    expect(lbRating('6')).toBeNull();
  });
});

describe('collectFilms', () => {
  const files = {
    diary:
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2026-01-05,Heat,1995,https://boxd.it/a,4,,,2026-01-04\n' +
      '2026-03-01,Heat,1995,https://boxd.it/b,4.5,Yes,,2026-03-01\n',
    ratings: 'Date,Name,Year,Letterboxd URI,Rating\n2026-03-01,Heat,1995,https://boxd.it/x,5\n',
    watchlist: 'Date,Name,Year,Letterboxd URI\n2026-02-01,Heat,1995,https://boxd.it/x\n2026-02-01,Ran,1985,https://boxd.it/y\n',
    reviews: 'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date\n2026-03-01,Heat,1995,https://boxd.it/b,4.5,Yes,"Enorme.",,2026-03-01\n',
    likes: 'Date,Name,Year,Letterboxd URI\n2026-03-01,Heat,1995,https://boxd.it/x\n',
  };
  const films = collectFilms(files);
  const heat = films.find((f) => f.name === 'Heat')!;
  const ran = films.find((f) => f.name === 'Ran')!;

  it('junta una película por título y año aunque las URI del diario sean otras', () => {
    expect(films).toHaveLength(2);
    expect(heat.viewings.map((v) => v.date)).toEqual(['2026-01-04', '2026-03-01']);
    expect(heat.viewings[1].rewatch).toBe(true);
  });
  it('la nota de ratings.csv gana a la de un visionado', () => {
    expect(heat.rating).toBe(5);
  });
  it('lo visto deja de estar pendiente', () => {
    expect(heat.watchlist).toBe(false);
    expect(ran.watchlist).toBe(true);
    expect(ran.watched).toBe(false);
  });
  it('trae reseña y corazón', () => {
    expect(heat.review).toBe('Enorme.');
    expect(heat.liked).toBe(true);
  });
  it('sin ratings.csv, la nota del último visionado que la tenga', () => {
    const [f] = collectFilms({ diary: files.diary });
    expect(f.rating).toBe(4.5);
  });
});

describe('normTitle', () => {
  it('quita acentos, signos y el «&»', () => {
    expect(normTitle('Amélie')).toBe('amelie');
    expect(normTitle('Hannah & Her Sisters')).toBe('hannah and her sisters');
    expect(normTitle('Mission: Impossible')).toBe('mission impossible');
  });
});

describe('pickMatch', () => {
  const c = (id: number, title: string, date: string, original = title) => ({
    id, title, original_title: original, release_date: date, poster_path: null,
  });
  it('título y año iguales: exacta', () => {
    expect(pickMatch('Heat', 1995, [c(1, 'Heat', '1986-03-01'), c(949, 'Heat', '1995-12-15')])).toEqual({ id: 949, confidence: 'exact' });
  });
  it('vale el título original y un año de diferencia', () => {
    expect(pickMatch('Les Quatre Cents Coups', 1959, [c(147, 'The 400 Blows', '1960-01-01', 'Les Quatre Cents Coups')]))
      .toEqual({ id: 147, confidence: 'exact' });
  });
  it('título distinto pero año cercano: probable', () => {
    expect(pickMatch('Birdman', 2014, [c(194662, 'Birdman or (The Unexpected Virtue of Ignorance)', '2014-10-17')]))
      .toEqual({ id: 194662, confidence: 'likely' });
  });
  it('nada que se parezca', () => {
    expect(pickMatch('Heat', 1995, [c(1, 'Other', '1970-01-01')])).toEqual({ id: null, confidence: 'none' });
    expect(pickMatch('Heat', 1995, [])).toEqual({ id: null, confidence: 'none' });
  });
});

describe('clipNote', () => {
  it('deja las cortas y recorta las largas por palabra con «…»', () => {
    expect(clipNote('hola')).toEqual({ text: 'hola', clipped: false });
    const long = 'palabra '.repeat(400);
    const r = clipNote(long);
    expect(r.clipped).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(MAX_NOTE);
    expect(r.text.endsWith('palabra…')).toBe(true);
  });
});

describe('mergeFilm', () => {
  const inc = (o: Partial<ImportFilm> = {}): ImportFilm => ({
    tmdbId: 1, watched: true, watchlist: false, liked: false, rating: 4, review: 'Bien', viewings: [], ...o,
  });
  const opts = { likesAsFavorites: false };

  it('una película nueva entra con todo', () => {
    const p = mergeFilm(null, inc({ viewings: [{ date: '2026-02-01', rating: 4, rewatch: false }] }), opts)!;
    expect(p).toMatchObject({ status: 'seen', rating: 4, note: 'Bien', favorite: false });
    expect(p.reviewedAt?.toISOString()).toBe('2026-02-01T12:00:00.000Z');
  });
  it('lo que ya hay gana: no pisa nota, reseña ni fecha', () => {
    const prev = { status: 'seen' as const, favorite: false, rating: 2.5, note: 'Mía', reviewedAt: new Date('2025-01-01T12:00:00Z') };
    expect(mergeFilm(prev, inc(), opts)).toMatchObject({ rating: 2.5, note: 'Mía', reviewedAt: prev.reviewedAt });
  });
  it('rellena huecos y sube de pendiente a vista', () => {
    const prev = { status: 'want' as const, favorite: false, rating: null, note: null, reviewedAt: null };
    expect(mergeFilm(prev, inc(), opts)).toMatchObject({ status: 'seen', rating: 4, note: 'Bien' });
  });
  it('no baja de vista a pendiente', () => {
    const prev = { status: 'seen' as const, favorite: true, rating: null, note: null, reviewedAt: null };
    expect(mergeFilm(prev, inc({ watched: false, watchlist: true, rating: null, review: null }), opts)).toMatchObject({ status: 'seen', favorite: true });
  });
  it('los corazones solo hacen favorita si se pide', () => {
    expect(mergeFilm(null, inc({ liked: true }), opts)!.favorite).toBe(false);
    expect(mergeFilm(null, inc({ liked: true }), { likesAsFavorites: true })!.favorite).toBe(true);
  });
  it('solo watchlist: pendiente', () => {
    expect(mergeFilm(null, inc({ watched: false, watchlist: true, rating: null, review: null }), opts)).toMatchObject({ status: 'want' });
  });
  it('nada útil: no se escribe nada', () => {
    expect(mergeFilm(null, inc({ watched: false, rating: null, review: null }), opts)).toBeNull();
  });
});
