import { describe, it, expect } from 'vitest';
import { sortSagaParts } from '../src/lib/tmdb';

describe('sortSagaParts', () => {
  it('por orden de estreno, y las que no tienen fecha al final', () => {
    const parts = [
      { id: 3, title: 'El último caballero', release_date: '2017-06-21', poster_path: null },
      { id: 9, title: 'Sin fecha', poster_path: null },
      { id: 1, title: 'Transformers', release_date: '2007-06-27', poster_path: null },
      { id: 2, title: 'La venganza de los caídos', release_date: '2009-06-19', poster_path: null },
    ];
    expect(sortSagaParts(parts).map((p) => p.id)).toEqual([1, 2, 3, 9]);
  });
  it('no cambia la lista original', () => {
    const parts = [
      { id: 2, title: 'B', release_date: '2010-01-01', poster_path: null },
      { id: 1, title: 'A', release_date: '2000-01-01', poster_path: null },
    ];
    sortSagaParts(parts);
    expect(parts[0].id).toBe(2);
  });
});

import { sagaName, partTitle } from '../src/lib/tmdb';

describe('sagaName', () => {
  it('quita la coletilla de TMDB', () => {
    expect(sagaName('Transformers - Colección')).toBe('Transformers');
    expect(sagaName('The Godfather Collection')).toBe('The Godfather');
    expect(sagaName('Colección El Padrino')).toBe('El Padrino');
    expect(sagaName('Star Wars')).toBe('Star Wars');
  });
});

describe('partTitle', () => {
  it('quita el nombre de la saga delante', () => {
    expect(partTitle('Transformers: La venganza de los caídos', 'Transformers')).toBe('La venganza de los caídos');
    expect(partTitle('Transformers - El último caballero', 'Transformers')).toBe('El último caballero');
  });
  it('la entrega que se llama como la saga, y las que no empiezan igual, se quedan', () => {
    expect(partTitle('Transformers', 'Transformers')).toBe('Transformers');
    expect(partTitle('Bumblebee', 'Transformers')).toBe('Bumblebee');
  });
});
