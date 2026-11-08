import { describe, it, expect } from 'vitest';
import { casillasDeNotas } from '../src/lib/scores';

// Lo que devuelve OMDb para «El imperio contraataca» (recortado).
const omdb = {
  Response: 'True' as const,
  imdbRating: '8.7',
  imdbVotes: '1,428,512',
  Metascore: '82',
  Ratings: [
    { Source: 'Internet Movie Database', Value: '8.7/10' },
    { Source: 'Rotten Tomatoes', Value: '95%' },
    { Source: 'Metacritic', Value: '82/100' },
  ],
};

const casillas = (o: Partial<Parameters<typeof casillasDeNotas>[0]>) =>
  casillasDeNotas({
    voteAverage: 8.4,
    omdb: null,
    formatoNumero: (n) => n.toLocaleString('es-ES'),
    textoVotos: '{n} notas',
    etiquetaImdb: 'IMDb',
    ...o,
  });

describe('fila de notas de la ficha', () => {
  it('enseña TMDB, IMDb con sus votos, Rotten Tomatoes y Metacritic, las cuatro', () => {
    expect(casillas({ omdb })).toEqual([
      { label: 'TMDB', value: '8.4' },
      { label: 'IMDb', value: '8.7', sub: '1.428.512 notas' },
      { label: 'Rotten Tomatoes', value: '95%' },
      { label: 'Metacritic', value: '82/100' },
    ]);
  });

  it('ya no hay nota de Cine Archive', () => {
    expect(casillas({ omdb }).map((c) => c.label)).not.toContain('Cine Archive');
  });

  it('si faltan las de OMDb, tres huecos del mismo tamaño', () => {
    const r = casillas({ pendiente: true });
    expect(r.map((c) => c.label)).toEqual(['TMDB', 'IMDb', 'Rotten Tomatoes', 'Metacritic']);
    expect(r.filter((c) => c.hueco).length).toBe(3);
  });

  it('Metacritic sale del Metascore si no viene en Ratings, y «N/A» no cuenta', () => {
    const r = casillas({ omdb: { Response: 'True', imdbRating: 'N/A', Metascore: '70', Ratings: [] } });
    expect(r).toEqual([
      { label: 'TMDB', value: '8.4' },
      { label: 'Metacritic', value: '70/100' },
    ]);
  });

  it('sin votos en TMDB ni nada de OMDb, la fila queda vacía', () => {
    expect(casillas({ voteAverage: 0 })).toEqual([]);
  });
});
