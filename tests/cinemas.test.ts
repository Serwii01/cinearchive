import { describe, it, expect, vi, afterEach } from 'vitest';
import { looksLikeCinema, isCinema, isClosed, dedupe, inSpain, nearest, snapToGrid, findCinemas, boxAround, nominatimToElements, _resetOverpassCooldown, rankSuggestions, overpassCooldown, type Cinema } from '../src/lib/cinemas';

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

describe('snapToGrid', () => {
  it('dos lecturas de GPS a unos metros caen en la misma celda', () => {
    // Puerta del Sol y la esquina de al lado: antes eran dos consultas a Overpass.
    expect(snapToGrid(40.41693, -3.70357)).toEqual(snapToGrid(40.41712, -3.70401));
  });

  it('ajusta a centésimas sin arrastrar decimales de coma flotante', () => {
    expect(snapToGrid(37.38264, -5.99629)).toEqual({ lat: 37.38, lon: -6 });
    expect(String(snapToGrid(28.123456, -15.437).lat)).toBe('28.12');
  });
});

describe('nearest', () => {
  const salas = [
    cine({ id: 'a', lat: 40.0, lon: -3.0 }),
    cine({ id: 'b', lat: 40.1, lon: -3.0 }), // ~11 km al norte
    cine({ id: 'c', lat: 40.3, lon: -3.0 }), // ~33 km
  ];

  it('mide desde el punto exacto y ordena de cerca a lejos', () => {
    const out = nearest([salas[1], salas[0]], 40.0, -3.0, 25000);
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
    expect(out[0].distanceKm).toBe(0);
    expect(out[1].distanceKm).toBeCloseTo(11.1, 0);
  });

  it('recorta lo que la consulta trajo de más por el margen de la rejilla', () => {
    expect(nearest(salas, 40.0, -3.0, 25000).map((c) => c.id)).toEqual(['a', 'b']);
    expect(nearest(salas, 40.0, -3.0, 50000).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('respeta el tope de resultados', () => {
    expect(nearest(salas, 40.0, -3.0, 50000, 2)).toHaveLength(2);
  });
});

describe('findCinemas con espejos de Overpass', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    _resetOverpassCooldown();
  });

  const respuesta = (elements: unknown[]) => new Response(JSON.stringify({ elements }), { status: 200 });
  const sala = { type: 'node', id: 77, lat: 36.72, lon: -4.42, tags: { amenity: 'cinema', name: 'Cine Albéniz' } };

  it('si el primer espejo se cuelga, no espera a su timeout: pregunta al siguiente', async () => {
    vi.useFakeTimers();
    const llamadas: string[] = [];
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      llamadas.push(url);
      if (llamadas.length === 1) {
        // Colgado: solo termina si se aborta.
        return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('abort'))));
      }
      return Promise.resolve(respuesta([sala]));
    });
    const pendiente = findCinemas(36.7213, -4.4214, 5000);
    await vi.advanceTimersByTimeAsync(6100);
    const out = await pendiente;
    expect(llamadas).toHaveLength(2);
    expect(out.map((c) => c.name)).toEqual(['Cine Albéniz']);
  });

  it('si un espejo responde con error, pasa al siguiente sin esperar', async () => {
    const llamadas: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      llamadas.push(url);
      return llamadas.length === 1 ? new Response('busy', { status: 429 }) : respuesta([sala]);
    });
    const out = await findCinemas(36.7313, -4.4314, 5000);
    expect(llamadas).toHaveLength(2);
    expect(out).toHaveLength(1);
  });

  it('si fallan todos, lanza (y el endpoint responde un error reintentable)', async () => {
    vi.stubGlobal('fetch', async () => new Response('down', { status: 504 }));
    await expect(findCinemas(36.7413, -4.4414, 5000)).rejects.toThrow();
  });
});

describe('alternativa por Nominatim', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    _resetOverpassCooldown();
  });

  it('boxAround contiene el círculo pedido', () => {
    const b = boxAround(40, -3, 11132);
    expect(b.maxLat - 40).toBeCloseTo(0.1, 3);
    expect(b.maxLon - -3).toBeGreaterThan(0.1); // a 40° de latitud, un grado de longitud es más corto
  });

  it('convierte los resultados a la forma de Overpass, con dirección y web', () => {
    const [e] = nominatimToElements([
      {
        osm_type: 'way',
        osm_id: 268051340,
        lat: '40.41',
        lon: '-3.70',
        name: 'Yelmo Cines Ideal',
        address: { road: 'Calle del Doctor Cortezo', house_number: '6', postcode: '28012', city: 'Madrid' },
        extratags: { website: 'https://yelmocines.es' },
      },
    ]);
    expect(e).toMatchObject({ type: 'way', id: 268051340, lat: 40.41, lon: -3.7 });
    expect(e.tags).toMatchObject({
      amenity: 'cinema',
      name: 'Yelmo Cines Ideal',
      'addr:street': 'Calle del Doctor Cortezo',
      'addr:city': 'Madrid',
      website: 'https://yelmocines.es',
    });
  });

  it('si Overpass falla entero, responde con Nominatim y luego no insiste con Overpass', async () => {
    const llamadas: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      llamadas.push(url);
      if (url.includes('overpass')) return new Response('down', { status: 504 });
      return new Response(
        JSON.stringify([{ osm_type: 'node', osm_id: 5, lat: '37.39', lon: '-5.99', name: 'Cine Avenida' }]),
        { status: 200 },
      );
    });
    const out = await findCinemas(37.3891, -5.9845, 5000);
    expect(out.map((c) => c.name)).toEqual(['Cine Avenida']);
    expect(llamadas.filter((u) => u.includes('overpass'))).toHaveLength(3);

    llamadas.length = 0;
    await findCinemas(37.2891, -5.8845, 5000);
    expect(llamadas.every((u) => u.includes('nominatim'))).toBe(true);
  });
  it('rescata los multicines etiquetados como teatro, pero no los teatros', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('overpass')) return new Response('down', { status: 504 });
      const rows = url.includes('amenity=theatre')
        ? [
            { osm_type: 'node', osm_id: 1315960031, lat: '37.388', lon: '-5.961', name: 'Multicines' },
            { osm_type: 'way', osm_id: 37522264, lat: '37.381', lon: '-5.988', name: 'Teatro Lope de Vega' },
          ]
        : [];
      return new Response(JSON.stringify(rows), { status: 200 });
    });
    const out = await findCinemas(37.3881, -5.9609, 5000);
    // El nombre bueno llega de cinemas-overrides.json, igual que con Overpass.
    expect(out.map((c) => c.name)).toEqual(['Multicines Los Arcos']);
  });
});

describe('rankSuggestions', () => {
  const f = (name: string, osm_value: string, state: string, lat = 37.39, lon = -5.98, countrycode = 'ES') => ({
    properties: { name, osm_value, state, countrycode },
    geometry: { coordinates: [lon, lat] as [number, number] },
  });

  it('pone la ciudad por delante de los pueblos que Photon ordena antes', () => {
    // El orden real de Photon para «sevi», sesgado al centro de España.
    const out = rankSuggestions([
      f('Sevilla la Nueva', 'village', 'Comunidad de Madrid', 40.35, -4.03),
      f('Sevilleja de la Jara', 'village', 'Castilla-La Mancha', 39.57, -4.96),
      f('Sevilla', 'city', 'Andalucía'),
      f('Sevilla', 'province', 'Andalucía'),
      f('Sevillalta', 'neighbourhood', 'Comunidad de Madrid', 40.35, -4.03),
    ]);
    expect(out.map((p) => p.label)).toEqual([
      'Sevilla, Andalucía',
      'Sevilla la Nueva, Comunidad de Madrid',
      'Sevilleja de la Jara, Castilla-La Mancha',
      'Sevillalta, Comunidad de Madrid',
    ]);
  });

  it('descarta lo de fuera de España y se queda con seis', () => {
    const muchos = Array.from({ length: 9 }, (_, i) => f(`Pueblo ${i}`, 'village', 'Castilla y León', 41, -4));
    expect(rankSuggestions([f('Seville', 'city', 'Ohio', 41, -81, 'US'), ...muchos])).toHaveLength(6);
    expect(rankSuggestions([f('Seville', 'city', 'Ohio', 41, -81, 'US')])).toEqual([]);
  });
});

describe('overpassCooldown', () => {
  it('dobla la pausa con cada caída seguida, hasta una hora', () => {
    const min = (n: number) => overpassCooldown(n) / 60_000;
    expect([1, 2, 3, 4, 5, 9].map(min)).toEqual([10, 20, 40, 60, 60, 60]);
  });
});
