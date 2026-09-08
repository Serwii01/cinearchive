import { describe, it, expect } from 'vitest';
import {
  clasificarLugar,
  parsePoint,
  agrupar,
  esFormatoActual,
  hayMapa,
  type FilmLocations,
} from '../src/lib/wikidata';

describe('parsePoint', () => {
  it('lee el WKT de Wikidata con la LONGITUD primero', () => {
    // Este es el error clásico: Point(lon lat), no Point(lat lon). Invertirlo
    // manda Long Beach al océano Índico.
    expect(parsePoint('Point(-118.195555555 33.768055555)')).toEqual({
      lon: -118.195555555,
      lat: 33.768055555,
    });
  });

  it('acepta enteros y espacios de más', () => {
    expect(parsePoint('Point( -93.0  42.0 )')).toEqual({ lon: -93, lat: 42 });
  });

  it('devuelve null si falta o no es un punto', () => {
    expect(parsePoint(undefined)).toBeNull();
    expect(parsePoint('')).toBeNull();
    expect(parsePoint('Polygon((0 0, 1 1))')).toBeNull();
  });

  it('rechaza coordenadas fuera del planeta', () => {
    expect(parsePoint('Point(0 200)')).toBeNull();
    expect(parsePoint('Point(-999 0)')).toBeNull();
  });
});

describe('clasificarLugar', () => {
  it('un sitio concreto es exacto', () => {
    expect(clasificarLugar(['metro bridge'])).toBe('exacto');
    expect(clasificarLugar(['museo'])).toBe('exacto');
    expect(clasificarLugar(['base aérea', 'aeropuerto'])).toBe('exacto');
    expect(clasificarLugar(['estación de esquí'])).toBe('exacto');
  });

  it('un municipio es ciudad', () => {
    expect(clasificarLugar(['gran ciudad', 'ciudad de California'])).toBe('ciudad');
    expect(clasificarLugar(['megaciudad', 'metrópoli'])).toBe('ciudad');
  });

  it('una demarcación entera es región y no se pinta', () => {
    expect(clasificarLugar(['país', 'estado nación'])).toBe('region');
    expect(clasificarLugar(['estado de los Estados Unidos'])).toBe('region');
    expect(clasificarLugar(['provincia de España'])).toBe('region');
    expect(clasificarLugar(['provincia de Canadá'])).toBe('region');
  });

  it('Tokio es una ciudad aunque también sea una prefectura', () => {
    // El orden de comprobación importa: primero ciudad, luego demarcación.
    expect(clasificarLugar(['prefectura de Japón', 'megaciudad'])).toBe('ciudad');
  });

  it('sin tipo se asume ciudad: se pinta, pero sin presumir de exacto', () => {
    expect(clasificarLugar([])).toBe('ciudad');
  });
});

describe('agrupar', () => {
  const fila = (rel: string, name: string, coord?: string, tipo?: string) => ({
    rel: { value: rel },
    locLabel: { value: name },
    ...(coord ? { coord: { value: coord } } : {}),
    ...(tipo ? { tipoLabel: { value: tipo } } : {}),
  });

  it('junta las filas repetidas del mismo lugar (una por cada tipo)', () => {
    const r = agrupar([
      fila('f', 'Long Beach', 'Point(-118.19 33.76)', 'gran ciudad'),
      fila('f', 'Long Beach', 'Point(-118.19 33.76)', 'ciudad de California'),
      fila('f', 'Long Beach', 'Point(-118.19 33.76)', 'ciudad chárter'),
    ]);
    expect(r.filming).toHaveLength(1);
    expect(r.filming[0]).toMatchObject({ name: 'Long Beach', kind: 'ciudad', lat: 33.76 });
  });

  it('separa rodaje de narración', () => {
    const r = agrupar([
      fila('f', 'Long Beach', 'Point(-118.19 33.76)', 'gran ciudad'),
      fila('n', 'Iowa', 'Point(-93.0 42.0)', 'estado de los Estados Unidos'),
    ]);
    expect(r.filming.map((p) => p.name)).toEqual(['Long Beach']);
    expect(r.narrative.map((p) => p.name)).toEqual(['Iowa']);
  });

  it('el mismo nombre en ambas listas no se mezcla', () => {
    const r = agrupar([
      fila('f', 'Nueva York', 'Point(-74 40.7)', 'gran ciudad'),
      fila('n', 'Nueva York', 'Point(-74 40.7)', 'gran ciudad'),
    ]);
    expect(r.filming).toHaveLength(1);
    expect(r.narrative).toHaveLength(1);
  });

  it('descarta las entidades sin etiqueta legible (Qxxxxx)', () => {
    const r = agrupar([fila('f', 'Q12345', 'Point(0 0)', 'ciudad')]);
    expect(r.filming).toHaveLength(0);
  });

  it('conserva los lugares sin coordenada, pero con lat/lon nulos', () => {
    const r = agrupar([fila('f', 'Sitio sin coordenada', undefined, 'museo')]);
    expect(r.filming[0]).toMatchObject({ lat: null, lon: null, kind: 'exacto' });
  });

  it('pone delante lo más concreto', () => {
    const r = agrupar([
      fila('f', 'España', 'Point(-3 40)', 'país'),
      fila('f', 'Londres', 'Point(-0.1 51.5)', 'ciudad'),
      fila('f', 'Pinewood', 'Point(-0.5 51.5)', 'estudio de cine'),
    ]);
    expect(r.filming.map((p) => p.kind)).toEqual(['exacto', 'ciudad', 'region']);
  });

  it('marca el formato como versión 2', () => {
    expect(agrupar([]).v).toBe(2);
  });
});

describe('esFormatoActual', () => {
  it('reconoce el formato con coordenadas', () => {
    expect(esFormatoActual({ v: 2, filming: [], narrative: [] })).toBe(true);
  });

  it('rechaza lo cacheado antiguo, que eran solo nombres', () => {
    // Sin esto, las fichas ya visitadas seguirían 60 días sin mapa.
    expect(esFormatoActual({ filming: ['París'], narrative: [] })).toBe(false);
    expect(esFormatoActual(null)).toBe(false);
    expect(esFormatoActual(undefined)).toBe(false);
  });
});

describe('hayMapa', () => {
  const loc = (filming: FilmLocations['filming']): FilmLocations => ({ v: 2, filming, narrative: [] });

  it('con un punto exacto, hay mapa', () => {
    expect(hayMapa(loc([{ name: 'Pinewood', lat: 51.5, lon: -0.5, kind: 'exacto' }]))).toBe(true);
  });

  it('con una ciudad, hay mapa', () => {
    expect(hayMapa(loc([{ name: 'Tokio', lat: 35.6, lon: 139.7, kind: 'ciudad' }]))).toBe(true);
  });

  it('solo con países TAMBIÉN hay mapa: se pintan como aproximados', () => {
    // Antes se devolvía false para no fingir precisión, y el efecto era peor:
    // «El padrino» decía que se rodó en Sicilia y el mapa no la enseñaba. Ahora
    // se dibujan con otra forma y la leyenda avisa de que son aproximadas.
    expect(
      hayMapa(
        loc([
          { name: 'Namibia', lat: -22, lon: 17, kind: 'region' },
          { name: 'Australia', lat: -25, lon: 133, kind: 'region' },
        ]),
      ),
    ).toBe(true);
  });

  it('sin coordenadas, no hay mapa', () => {
    expect(hayMapa(loc([{ name: 'Sitio', lat: null, lon: null, kind: 'exacto' }]))).toBe(false);
  });

  it('sin datos, no hay mapa', () => {
    expect(hayMapa(null)).toBe(false);
  });
});
