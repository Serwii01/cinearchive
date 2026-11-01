import { describe, expect, it } from 'vitest';
import {
  activeIn,
  countryCounts,
  decadeOf,
  decadesOf,
  getMovements,
  missingMovements,
  movementsByCountry,
  mineLevel,
} from '../src/lib/movements';
import world from '../src/data/worldcountries.json';
import data from '../src/data/movements.json';

describe('movimientos del atlas', () => {
  const es = getMovements('es');

  it('todos tienen nombre y entradilla en los cinco idiomas', () => {
    for (const m of data.items) {
      for (const l of ['es', 'en', 'gl', 'eu', 'ca'] as const) {
        expect(m.name[l], `${m.id} · name.${l}`).toBeTruthy();
        expect(m.blurb[l], `${m.id} · blurb.${l}`).toBeTruthy();
      }
    }
  });

  it('los ids no se repiten y los años tienen sentido', () => {
    expect(new Set(data.items.map((m) => m.id)).size).toBe(data.items.length);
    for (const m of data.items) if (m.to !== null) expect(m.to, m.id).toBeGreaterThanOrEqual(m.from);
  });

  it('cada país de un movimiento está en el mapa', () => {
    const isos = new Set(world.countries.map((c) => c.iso));
    for (const m of data.items) for (const iso of m.countries) expect(isos.has(iso), `${m.id} · ${iso}`).toBe(true);
  });

  it('salen en orden cronológico y con sus películas enlazadas', () => {
    expect(es.map((m) => m.from)).toEqual([...es.map((m) => m.from)].sort((a, b) => a - b));
    const colmena = es.find((m) => m.id === 'nuevo-cine-espanol')!.films.find((f) => f.tmdbId === 4495)!;
    expect(colmena.title).toBe('El espíritu de la colmena');
    expect(colmena.path).toBe('film/el-espiritu-de-la-colmena-4495');
  });

  it('el título de cada película cambia con el idioma', () => {
    const nv = (lang: 'es' | 'en') => getMovements(lang).find((m) => m.id === 'nouvelle-vague')!.films.find((f) => f.tmdbId === 147)!.title;
    expect(nv('en')).toBe('The 400 Blows');
    expect(nv('es')).not.toBe('The 400 Blows');
  });
});

describe('décadas', () => {
  it('decadeOf redondea hacia abajo', () => {
    expect(decadeOf(1959)).toBe(1950);
    expect(decadeOf(1960)).toBe(1960);
  });

  it('decadesOf va de la primera década a la del último año, con los vivos hasta hoy', () => {
    expect(decadesOf([{ from: 1919, to: 1933 }, { from: 1996, to: null }], 2026)).toEqual([1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]);
    expect(decadesOf([])).toEqual([]);
  });

  it('activeIn: un movimiento cuenta en una década si toca alguno de sus años', () => {
    const nv = { from: 1958, to: 1968 };
    expect(activeIn(nv, 1950)).toBe(true);
    expect(activeIn(nv, 1960)).toBe(true);
    expect(activeIn(nv, 1970)).toBe(false);
    expect(activeIn({ from: 2009, to: null }, 2020, 2026)).toBe(true);
  });
});

describe('países', () => {
  it('movementsByCountry agrupa: Francia tiene dos movimientos', () => {
    const fr = movementsByCountry(getMovements('es')).get('FR')!.map((m) => m.id);
    expect(fr).toEqual(['realismo-poetico', 'nouvelle-vague']);
  });

  it('countryCounts cuenta cada país una vez por película, también en coproducciones', () => {
    const counts = countryCounts([
      [{ iso_3166_1: 'FR' }, { iso_3166_1: 'DZ' }],
      [{ iso_3166_1: 'FR' }, { iso_3166_1: 'FR' }],
      [],
    ]);
    expect(counts).toEqual({ FR: 2, DZ: 1 });
  });

  it('missingMovements: los de países de los que no has visto nada', () => {
    const ms = [
      { id: 'a', countries: ['FR'] },
      { id: 'b', countries: ['CZ', 'SK'] },
      { id: 'c', countries: ['KR'] },
    ];
    expect(missingMovements(ms, { FR: 3, SK: 1, KR: 0 }).map((m) => m.id)).toEqual(['c']);
  });
});

describe('tu mapa', () => {
  it('mineLevel: escalones de 0 a 4', () => {
    expect([0, 1, 2, 4, 5, 14, 15, 300].map(mineLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
});
