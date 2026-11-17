import { describe, it, expect } from 'vitest';
import { translateAwards, clasificarOmdb, omdbEnPausa, pausarOmdb, OMDB_PAUSA_MS, getOmdbByImdbId } from '../src/lib/omdb';

describe('translateAwards', () => {
  it('el caso de «Cuentos de Tokio»: solo el total', () => {
    expect(translateAwards('3 wins total', 'es')).toBe('3 premios en total');
    expect(translateAwards('1 win total', 'es')).toBe('1 premio en total');
  });

  it('premio principal + totales', () => {
    expect(translateAwards('Won 3 Oscars. 97 wins & 140 nominations total', 'es')).toBe(
      'Ganó 3 Óscar. 97 premios y 140 nominaciones en total',
    );
    expect(translateAwards('Nominated for 2 Golden Globes. 5 wins & 12 nominations total', 'es')).toBe(
      'Nominada a 2 Globos de Oro. 5 premios y 12 nominaciones en total',
    );
    expect(translateAwards('Won 1 Oscar. 1 win & 3 nominations total', 'ca')).toBe(
      'Va guanyar 1 Oscar. 1 premi i 3 nominacions en total',
    );
  });

  it('solo nominaciones', () => {
    expect(translateAwards('2 nominations total', 'gl')).toBe('2 nomeamentos en total');
  });

  it('BAFTA y Emmy', () => {
    expect(translateAwards('Won 1 BAFTA Award. 4 wins total', 'es')).toBe('Ganó 1 BAFTA. 4 premios en total');
    expect(translateAwards('Nominated for 1 Primetime Emmy. 2 nominations total', 'eu')).toBe(
      '1 Emmy saritarako hautagaia. Guztira 2 hautagaitza',
    );
  });

  it('en inglés se deja igual', () => {
    expect(translateAwards('3 wins total', 'en')).toBe('3 wins total');
  });

  it('lo que no encaja se deja como viene, antes que inventar', () => {
    expect(translateAwards('Won 2 Palme d\'Or awards. 3 wins total', 'es')).toBe("Won 2 Palme d'Or awards. 3 wins total");
    expect(translateAwards('Something else entirely', 'es')).toBe('Something else entirely');
  });
});

describe('clasificarOmdb', () => {
  it('notas', () => {
    expect(clasificarOmdb(200, { Response: 'True', imdbRating: '8.1' }).tipo).toBe('notas');
  });
  it('no la tiene: se guarda para no volver a preguntar', () => {
    expect(clasificarOmdb(200, { Response: 'False', Error: 'Movie not found!' }).tipo).toBe('no-existe');
    expect(clasificarOmdb(200, { Response: 'False', Error: 'Incorrect IMDb ID.' }).tipo).toBe('no-existe');
  });
  it('cuota agotada o clave mala: se deja de llamar', () => {
    expect(clasificarOmdb(401, { Response: 'False', Error: 'Request limit reached!' }).tipo).toBe('agotada');
    expect(clasificarOmdb(200, { Response: 'False', Error: 'Request limit reached!' }).tipo).toBe('agotada');
    expect(clasificarOmdb(401, { Response: 'False', Error: 'Invalid API key!' }).tipo).toBe('agotada');
  });
  it('lo demás es un fallo pasajero: no se guarda', () => {
    expect(clasificarOmdb(503, null).tipo).toBe('fallo');
    expect(clasificarOmdb(200, null).tipo).toBe('fallo');
    expect(clasificarOmdb(200, { Response: 'False', Error: 'Something else' }).tipo).toBe('fallo');
  });
});

describe('pausa al agotarse la cuota', () => {
  it('dura una hora', () => {
    const t = 1_000_000;
    pausarOmdb(t);
    expect(omdbEnPausa(t + 1)).toBe(true);
    expect(omdbEnPausa(t + OMDB_PAUSA_MS - 1)).toBe(true);
    expect(omdbEnPausa(t + OMDB_PAUSA_MS)).toBe(false);
  });
  it('en pausa no se llama a OMDb', async () => {
    process.env.OMDB_API_KEY = 'x';
    const antes = globalThis.fetch;
    let llamadas = 0;
    globalThis.fetch = (async () => { llamadas++; return new Response('{}'); }) as typeof fetch;
    pausarOmdb();
    expect((await getOmdbByImdbId('tt0111161')).tipo).toBe('agotada');
    expect(llamadas).toBe(0);
    globalThis.fetch = antes;
  });
});
