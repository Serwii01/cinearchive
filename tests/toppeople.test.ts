import { describe, it, expect } from 'vitest';
import { topPeople, type PersonFilm } from '../src/lib/toppeople';

const ozu = { id: 1, name: 'Yasujirō Ozu' };
const kiarostami = { id: 2, name: 'Abbas Kiarostami' };
const ryu = { id: 10, name: 'Chishū Ryū' };
const hara = { id: 11, name: 'Setsuko Hara' };
const extra = { id: 12, name: 'Alguien' };

const film = (tmdbId: number, rating: number | null, directors = [ozu], cast = [ryu]): PersonFilm => ({ tmdbId, rating, directors, cast });

describe('topPeople', () => {
  it('cuenta películas por persona y ordena por cantidad', () => {
    const r = topPeople([
      film(1, 5, [ozu], [ryu, hara]),
      film(2, 4, [ozu], [ryu, hara]),
      film(3, null, [ozu], [ryu]),
      film(4, 3, [kiarostami], [extra]),
      film(5, 4, [kiarostami], []),
    ]);
    expect(r.directors.map((d) => [d.name, d.count])).toEqual([['Yasujirō Ozu', 3], ['Abbas Kiarostami', 2]]);
    expect(r.actors.map((a) => [a.name, a.count])).toEqual([['Chishū Ryū', 3], ['Setsuko Hara', 2]]);
  });

  it('quien sale en una sola película no entra en «más vistos»', () => {
    const r = topPeople([film(1, 5, [ozu], [extra]), film(2, 5, [ozu], [ryu]), film(3, 5, [kiarostami], [ryu])]);
    expect(r.directors.map((d) => d.name)).toEqual(['Yasujirō Ozu']);
    expect(r.actors.map((a) => a.name)).toEqual(['Chishū Ryū']);
  });

  it('«te gusta más» es la media y pide un mínimo de películas puntuadas', () => {
    const r = topPeople(
      [
        film(1, 5, [kiarostami]),
        film(2, 4.5, [kiarostami]),
        film(3, 4, [kiarostami]),
        film(4, 3, [ozu]),
        film(5, 4, [ozu]),
        film(6, 3.5, [ozu]),
        film(7, 5, [{ id: 3, name: 'Una sola' }]),
      ],
      { minRated: 3 },
    );
    expect(r.favDirectors.map((d) => d.name)).toEqual(['Abbas Kiarostami', 'Yasujirō Ozu']);
    expect(r.favDirectors[0].avg).toBe(4.5);
  });

  it('la misma película repetida no cuenta dos veces', () => {
    const r = topPeople([film(1, 5), film(1, 5), film(2, 3)]);
    expect(r.directors[0].count).toBe(2);
    expect(r.directors[0].rated).toBe(2);
    expect(r.directors[0].avg).toBe(4);
  });

  it('sin películas, listas vacías', () => {
    expect(topPeople([])).toEqual({ directors: [], actors: [], favDirectors: [], favActors: [] });
  });
});
