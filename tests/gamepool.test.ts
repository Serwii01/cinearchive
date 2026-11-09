import { describe, it, expect } from 'vitest';
import { POOL, RATED, poolTitle, fotoPuzzle, fotoCheck, fotoSameSaga, fotoAnswer, notaToken, notaVerify, freshFotoSeed, titleIndex, chronoFilms, CLASICOS, paisEn } from '../src/lib/gamepool';
import { checkOrder } from '../src/lib/games';

describe('bolsa de los juegos', () => {
  it('tiene cientos de películas, cada una con fondos sin texto y cartel', () => {
    expect(POOL.length).toBeGreaterThan(1000);
    for (const f of POOL) {
      expect(f.backdrops.length, String(f.id)).toBeGreaterThanOrEqual(2);
      expect(f.poster).toMatch(/^\//);
      expect(f.year).toBeGreaterThan(1900);
    }
  });

  it('gallego, euskera y catalán caen en el castellano si no hay título propio', () => {
    const f = POOL.find((x) => !x.titles.gl && x.titles.es)!;
    expect(poolTitle(f, 'gl')).toBe(f.titles.es);
  });

  it('para la nota solo entran las que tienen muchos votos', () => {
    expect(RATED.every((f) => f.votes >= 1000)).toBe(true);
  });
});

describe('Fotograma', () => {
  it('el reto que llega al navegador no lleva la solución', () => {
    const p = fotoPuzzle('actual', { day: 10 }, 'es');
    const a = fotoAnswer('actual', { day: 10 }, 'es');
    expect(JSON.stringify(p)).not.toContain(a.title);
    expect(p.hints).toHaveLength(5);
  });

  it('la solución se puede elegir en el buscador del juego y la comprobación la acepta', () => {
    for (const day of [1, 2, 30]) {
      const a = fotoAnswer('actual', { day }, 'es');
      const e = titleIndex('actual', 'es').find((t) => t.title === a.title && t.year === a.year)!;
      expect(e, `día ${day}`).toBeDefined();
      expect(fotoCheck('actual', { day }, e.id)).toBe(true);
      expect(fotoCheck('actual', { day }, 1)).toBe(false);
    }
  });

  it('el modo clásicos solo usa películas con fotograma propio', () => {
    if (!CLASICOS.length) return;
    const p = fotoPuzzle('clasicos', { day: 3 }, 'es');
    expect(p.image).toMatch(/^\/games\/clasicos\/.+\.webp$/);
    expect(fotoAnswer('clasicos', { day: 3 }, 'es').watchFree).toBe(true);
  });
});

describe('Cronología', () => {
  it('nunca empieza ya ordenada', () => {
    for (let d = 1; d <= 60; d++) {
      const years = chronoFilms({ day: d }).map((f) => f.year);
      expect(years).toHaveLength(5);
      expect(checkOrder(years).every(Boolean), `día ${d}`).toBe(false);
    }
  });
});

describe('modo ilimitado', () => {
  it('la misma semilla da el mismo reto y otra semilla, otro', () => {
    const a = fotoAnswer('actual', { seed: 12345 }, 'es');
    expect(fotoAnswer('actual', { seed: 12345 }, 'es')).toEqual(a);
    const distintas = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => fotoAnswer('actual', { seed }, 'es').title));
    expect(distintas.size).toBeGreaterThan(4);
  });

  it('el reto ilimitado lleva su semilla y no la solución', () => {
    const p = fotoPuzzle('actual', { seed: 777 }, 'es');
    expect(p.seed).toBe(777);
    expect(p.day).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain(fotoAnswer('actual', { seed: 777 }, 'es').title);
  });

  it('una semilla no apunta al mismo índice que un día con ese número', () => {
    const iguales = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => fotoAnswer('actual', { seed: n }, 'es').title === fotoAnswer('actual', { day: n }, 'es').title);
    expect(iguales.length).toBeLessThan(3);
  });

  it('Cronología ilimitada da cinco de años distintos y desordenadas', () => {
    const years = chronoFilms({ seed: 42 }).map((f) => f.year);
    expect(new Set(years).size).toBe(5);
    expect(checkOrder(years).every(Boolean)).toBe(false);
  });
});

describe('pistas de clásicos', () => {
  it('el país se traduce, también en coproducciones', () => {
    expect(paisEn('Francia', 'en')).toBe('France');
    expect(paisEn('Italia / EE. UU.', 'ca')).toBe('Itàlia / EUA');
    expect(paisEn('Francia', 'es')).toBe('Francia');
  });
});

describe('sin pistas escondidas en la imagen', () => {
  it('la URL del fotograma de clásicos no lleva el nombre de la película', () => {
    for (let day = 1; day <= 40; day++) {
      const p = fotoPuzzle('clasicos', { day }, 'es');
      expect(p.image, `día ${day}`).toMatch(/^\/games\/clasicos\/[0-9a-f]{16}\.webp$/);
    }
  });
});

describe('Fotograma: misma saga', () => {
  it('avisa si la película probada es de la saga de la solución, y solo entonces', () => {
    const ref = { day: 10 };
    const solucion = POOL.find((f) => fotoCheck('actual', ref, f.id))!;
    const [hermana, otra] = POOL.filter((f) => f.id !== solucion.id);
    const antes = [solucion.collection, hermana.collection, otra.collection];
    try {
      solucion.collection = hermana.collection = -1;
      otra.collection = -2;
      expect(fotoSameSaga('actual', ref, hermana.id)).toBe(true);
      expect(fotoSameSaga('actual', ref, otra.id)).toBe(false);
      expect(fotoSameSaga('actual', ref, 999_999_999)).toBe(false);
      // En clásicos no hay sagas.
      expect(fotoSameSaga('clasicos', ref, hermana.id)).toBe(false);
      // Sin saga, nunca.
      solucion.collection = null;
      expect(fotoSameSaga('actual', ref, hermana.id)).toBe(false);
    } finally {
      [solucion.collection, hermana.collection, otra.collection] = antes;
    }
  });

  it('el buscador encuentra la película por el título de otro idioma', () => {
    const f = POOL.find((x) => x.titles.en && x.titles.es && x.titles.en !== x.titles.es && x.titles.en !== x.original)!;
    const e = titleIndex('actual', 'es').find((t) => t.id === f.id)!;
    expect(e.aka).toContain(f.titles.en);
  });
});

describe('¿Cuál tiene mejor nota?: racha firmada', () => {
  it('el vale auténtico da su racha', () => {
    expect(notaVerify(notaToken(11, 12, 7), 11, 12)).toBe(7);
  });

  it('no vale para otra pareja, cambiado a mano ni caducado', () => {
    const v = notaToken(11, 12, 7);
    expect(notaVerify(v, 11, 13)).toBeNull();
    expect(notaVerify(v.replace('.7.', '.300.'), 11, 12)).toBeNull();
    expect(notaVerify('basura', 11, 12)).toBeNull();
    const viejo = notaToken(11, 12, 7, Date.now() - 25 * 3600 * 1000);
    expect(notaVerify(viejo, 11, 12)).toBeNull();
  });
});

describe('Fotograma ilimitado: sin repetir', () => {
  const pelicula = (mode: 'actual' | 'clasicos', seed: number) => fotoAnswer(mode, { seed }, 'es').title;

  it('no vuelve a dar una película de las semillas ya jugadas', () => {
    const vistas: number[] = [];
    const titulos = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const s = freshFotoSeed('clasicos', vistas);
      const t = pelicula('clasicos', s);
      expect(titulos.has(t), t).toBe(false);
      titulos.add(t);
      vistas.push(s);
    }
  });

  it('cuando casi se han visto todas, sigue dando retos', () => {
    const vistas = Array.from({ length: 2000 }, (_, i) => i + 1);
    expect(() => freshFotoSeed('clasicos', vistas)).not.toThrow();
  });
});
