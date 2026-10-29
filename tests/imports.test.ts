import { describe, it, expect } from 'vitest';
import { collectImdb, collectTrakt, detectSource, isImdbCsv, tenToStars } from '../src/lib/imports';
import { lbFileKind } from '../src/lib/letterboxd';

const RATINGS = [
  'Const,Your Rating,Date Rated,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors',
  'tt0047478,10,2024-02-01,Seven Samurai,Shichinin no samurai,https://www.imdb.com/title/tt0047478/,Movie,8.6,207,1954,"Action, Drama",360000,1954-04-26,Akira Kurosawa',
  'tt0903747,9,2024-02-02,Breaking Bad,Breaking Bad,https://www.imdb.com/title/tt0903747/,TV Series,9.5,49,2008,Drama,2000000,2008-01-20,',
  'tt0110912,7,2024-02-03,Pulp Fiction,Pulp Fiction,https://www.imdb.com/title/tt0110912/,movie,8.9,154,1994,Crime,2000000,1994-10-14,Quentin Tarantino',
].join('\n');

const WATCHLIST = [
  'Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors,Your Rating,Date Rated',
  '1,tt0080684,2024-01-01,2024-01-01,,The Empire Strikes Back,,https://www.imdb.com/title/tt0080684/,Movie,8.7,124,1980,Action,1000000,1980-05-21,Irvin Kershner,,',
  '2,tt0047478,2024-01-01,2024-01-01,,Seven Samurai,,https://www.imdb.com/title/tt0047478/,Movie,8.6,207,1954,Action,360000,1954-04-26,Akira Kurosawa,,',
].join('\n');

describe('tenToStars', () => {
  it('de 1–10 a estrellas de ½ en ½', () => {
    expect(tenToStars(10)).toBe(5);
    expect(tenToStars('7')).toBe(3.5);
    expect(tenToStars(1)).toBe(0.5);
    expect(tenToStars(0)).toBeNull();
    expect(tenToStars('')).toBeNull();
    expect(tenToStars(7.5)).toBeNull();
  });
});

describe('IMDb', () => {
  it('reconoce el CSV por la columna Const', () => {
    expect(isImdbCsv(RATINGS)).toBe(true);
    expect(isImdbCsv(WATCHLIST)).toBe(true);
    expect(isImdbCsv('Date,Name,Year,Letterboxd URI\n')).toBe(false);
  });

  it('notas y watchlist, sin series, y lo puntuado no queda pendiente', () => {
    const films = collectImdb([RATINGS, WATCHLIST]);
    const by = new Map(films.map((f) => [f.imdbId, f]));
    expect(by.has('tt0903747')).toBe(false); // serie
    expect(by.get('tt0047478')).toMatchObject({ watched: true, watchlist: false, rating: 5, name: 'Seven Samurai', year: 1954 });
    expect(by.get('tt0110912')).toMatchObject({ watched: true, rating: 3.5 });
    expect(by.get('tt0080684')).toMatchObject({ watched: false, watchlist: true, rating: null });
    // IMDb no tiene diario: puntuar no es un visionado con fecha.
    expect(films.every((f) => f.viewings.length === 0)).toBe(true);
  });
});

describe('Trakt', () => {
  const movie = (tmdb: number, title: string, year: number) => ({ title, year, ids: { trakt: 1, slug: 'x', imdb: 'tt0000001', tmdb } });
  const files = [
    {
      name: 'watched-history.json',
      text: JSON.stringify([
        { id: 1, watched_at: '2025-03-04T21:00:00.000Z', action: 'watch', type: 'movie', movie: movie(346, 'Seven Samurai', 1954) },
        { id: 2, watched_at: '2026-01-10T20:00:00.000Z', action: 'watch', type: 'movie', movie: movie(346, 'Seven Samurai', 1954) },
        { id: 3, watched_at: '2026-01-11T20:00:00.000Z', action: 'watch', type: 'episode', episode: {}, show: {} },
      ]),
    },
    { name: 'ratings-movies.json', text: JSON.stringify([{ rated_at: '2026-01-10T22:00:00.000Z', rating: 9, type: 'movie', movie: movie(346, 'Seven Samurai', 1954) }]) },
    {
      name: 'lists-watchlist.json',
      text: JSON.stringify([
        { rank: 1, listed_at: '2025-01-01T00:00:00.000Z', type: 'movie', movie: movie(1891, 'The Empire Strikes Back', 1980) },
        { rank: 2, listed_at: '2025-01-01T00:00:00.000Z', type: 'movie', movie: movie(346, 'Seven Samurai', 1954) },
      ]),
    },
    { name: 'lists-favoritas.json', text: JSON.stringify([{ listed_at: '2025-01-01T00:00:00.000Z', type: 'movie', movie: movie(999, 'Otra lista', 2000) }]) },
    { name: 'roto.json', text: '{no es json' },
  ];

  it('historial con fechas, notas de 1–10 y watchlist; el id de TMDB viaja', () => {
    const films = collectTrakt(files);
    const by = new Map(films.map((f) => [f.tmdbId, f]));
    expect(by.get(346)).toMatchObject({ watched: true, watchlist: false, rating: 4.5 });
    expect(by.get(346)!.viewings.map((v) => v.date)).toEqual(['2025-03-04', '2026-01-10']);
    expect(by.get(1891)).toMatchObject({ watched: false, watchlist: true });
    // Una lista que no es la watchlist no hace pendiente nada.
    expect(by.get(999)).toMatchObject({ watched: false, watchlist: false });
  });
});

describe('detectSource', () => {
  const lb = (n: string) => lbFileKind(n) != null;
  it('por lo que trae cada fichero', () => {
    expect(detectSource([{ name: 'diary.csv', text: 'Date,Name\n' }, { name: 'ratings.csv', text: 'Date,Name,Year,Letterboxd URI,Rating\n' }], lb)).toBe('letterboxd');
    // ratings.csv también se llama así en IMDb: decide la cabecera.
    expect(detectSource([{ name: 'ratings.csv', text: RATINGS }], lb)).toBe('imdb');
    expect(detectSource([{ name: 'history.json', text: '[]' }], lb)).toBe('trakt');
    expect(detectSource([{ name: 'foto.csv', text: 'a,b\n' }], lb)).toBeNull();
  });
});
