import { describe, it, expect } from 'vitest';
import { looksLikeCinema, isCinema, isClosed, dedupe, inSpain, type Cinema } from '../src/lib/cinemas';

const cine = (over: Partial<Cinema>): Cinema => ({
  id: 'node/1',
  name: 'Cine',
  lat: 40,
  lon: -3,
  address: null,
  operator: null,
  website: null,
  distanceKm: 0,
  ...over,
});

/**
 * El caso que motivó todo esto: el multicine del CC Los Arcos (Sevilla, 41007)
 * está en OSM como `amenity=theatre` con el nombre "Multicines", así que no
 * aparecía buscando solo `amenity=cinema`.
 */
describe('looksLikeCinema', () => {
  it('reconoce el caso de Los Arcos', () => {
    expect(looksLikeCinema('Multicines')).toBe(true);
  });

  it('reconoce nombres y cadenas habituales', () => {
    for (const n of [
      'Cine Doré',
      'Cines Van Dyck',
      'Multicines Los Arcos',
      'Cinema Truffaut',
      'Yelmo Cines Vialia',
      'Kinépolis Madrid',
      'Cinesa La Maquinista',
      'Filmoteca de Catalunya',
      'IMAX Madrid',
    ]) {
      expect(looksLikeCinema(n), n).toBe(true);
    }
  });

  it('NO confunde los teatros de verdad', () => {
    for (const n of [
      'Teatro Lope de Vega',
      'Sala Cero',
      'La Imperdible',
      'Teatro Jardines de La Buhaira',
      'Auditorio',
      'Gran Teatro Falla',
    ]) {
      expect(looksLikeCinema(n), n).toBe(false);
    }
  });

  it('exige palabra completa, no una coincidencia suelta', () => {
    // "Cinegética" o "Cinemática" contienen "cine"/"cinema" pero no son salas.
    expect(looksLikeCinema('Asociación Cinegética')).toBe(false);
    expect(looksLikeCinema('Escuela Cinematográfica')).toBe(false);
  });

  it('ignora acentos y mayúsculas', () => {
    expect(looksLikeCinema('CINÉPOLIS')).toBe(true);
    expect(looksLikeCinema('cinépolis')).toBe(true);
  });
});

describe('isClosed', () => {
  it('descarta lo marcado como fuera de servicio', () => {
    expect(isClosed({ amenity: 'cinema', disused: 'yes' })).toBe(true);
    expect(isClosed({ amenity: 'cinema', opening_hours: 'closed' })).toBe(true);
    expect(isClosed({ 'disused:amenity': 'cinema' })).toBe(true);
    expect(isClosed({ 'was:amenity': 'cinema' })).toBe(true);
  });

  it('no descarta una sala normal', () => {
    expect(isClosed({ amenity: 'cinema', name: 'Cine Doré' })).toBe(false);
    expect(isClosed({ amenity: 'cinema', opening_hours: 'Mo-Su 16:00-23:00' })).toBe(false);
  });
});

describe('isCinema', () => {
  it('acepta cualquier amenity=cinema, tenga nombre o no', () => {
    expect(isCinema({ amenity: 'cinema', name: 'Cine Doré' })).toBe(true);
    // Sin nombre sigue siendo un cine: antes se descartaba y desaparecía del mapa.
    expect(isCinema({ amenity: 'cinema' })).toBe(true);
  });

  it('rescata el cine mal etiquetado como teatro', () => {
    expect(isCinema({ amenity: 'theatre', name: 'Multicines' })).toBe(true);
  });

  it('deja fuera los teatros de verdad', () => {
    expect(isCinema({ amenity: 'theatre', name: 'Teatro Lope de Vega' })).toBe(false);
    expect(isCinema({ amenity: 'theatre' })).toBe(false); // teatro sin nombre
  });

  it('deja fuera cualquier otra cosa', () => {
    expect(isCinema({ amenity: 'restaurant', name: 'Cine Bar' })).toBe(false);
    expect(isCinema({})).toBe(false);
  });

  it('un cine cerrado no cuenta, aunque el nombre encaje', () => {
    expect(isCinema({ amenity: 'cinema', name: 'Cine Ideal', disused: 'yes' })).toBe(false);
  });
});

describe('dedupe', () => {
  it('une el mismo cine mapeado como nodo y como edificio', () => {
    const out = dedupe([
      cine({ id: 'node/1', name: 'Cine Doré', lat: 40.4125, lon: -3.6994 }),
      cine({ id: 'way/2', name: 'Cine Doré', lat: 40.4126, lon: -3.6995, address: 'Santa Isabel 3' }),
    ]);
    expect(out).toHaveLength(1);
    // Se conserva la ficha con más datos.
    expect(out[0].address).toBe('Santa Isabel 3');
  });

  it('absorbe el duplicado sin nombre que está en el mismo sitio', () => {
    const out = dedupe([
      cine({ id: 'node/1', name: 'Cine Doré', lat: 40.4125, lon: -3.6994 }),
      cine({ id: 'node/2', name: null, lat: 40.4126, lon: -3.6994 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Cine Doré');
  });

  it('NO une dos salas distintas que están lejos', () => {
    const out = dedupe([
      cine({ id: 'node/1', name: 'Cine Doré', lat: 40.4125, lon: -3.6994 }),
      cine({ id: 'node/2', name: 'Cine Doré', lat: 41.3874, lon: 2.1686 }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('NO une dos salas distintas del mismo centro comercial', () => {
    const out = dedupe([
      cine({ id: 'node/1', name: 'Yelmo Lagoh', lat: 37.35, lon: -5.98 }),
      cine({ id: 'node/2', name: 'Cinesur Nervión', lat: 37.3501, lon: -5.9801 }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('mantiene el orden de entrada y no pierde salas', () => {
    const entrada = [
      cine({ id: 'a', name: 'A', lat: 40, lon: -3 }),
      cine({ id: 'b', name: 'B', lat: 41, lon: -3 }),
      cine({ id: 'c', name: 'C', lat: 42, lon: -3 }),
    ];
    expect(dedupe(entrada).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('inSpain', () => {
  it('acepta península, Canarias y Baleares', () => {
    expect(inSpain(40.4168, -3.7038)).toBe(true); // Madrid
    expect(inSpain(28.1235, -15.4363)).toBe(true); // Las Palmas
    expect(inSpain(39.5696, 2.6502)).toBe(true); // Palma
  });

  it('rechaza fuera del país', () => {
    expect(inSpain(48.8566, 2.3522)).toBe(false); // París
    expect(inSpain(0, 0)).toBe(false);
  });
});
