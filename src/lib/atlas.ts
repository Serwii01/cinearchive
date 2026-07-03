/**
 * Atlas del archivo: agrega el catálogo (films.json) por país de origen y aporta
 * coordenadas para situarlos en un mapa. Derivación estática, sin llamadas externas.
 */
import filmsData from '../data/films.json';

interface GeoInfo {
  es: string;
  en: string;
  gl: string;
  eu: string;
  ca: string;
  lat: number;
  lon: number;
  /** ISO 3166-1 para enlazar al filtro de país de Descubrir (aprox. para países históricos). */
  iso: string;
}

/** País primario tal como aparece en films.json → datos geográficos (nombre en los 5 idiomas). */
const GEO: Record<string, GeoInfo> = {
  USA: { es: 'Estados Unidos', en: 'United States', gl: 'Estados Unidos', eu: 'Estatu Batuak', ca: 'Estats Units', lat: 39.8, lon: -98.6, iso: 'US' },
  France: { es: 'Francia', en: 'France', gl: 'Francia', eu: 'Frantzia', ca: 'França', lat: 46.6, lon: 2.3, iso: 'FR' },
  Japan: { es: 'Japón', en: 'Japan', gl: 'Xapón', eu: 'Japonia', ca: 'Japó', lat: 36.2, lon: 138.3, iso: 'JP' },
  Germany: { es: 'Alemania', en: 'Germany', gl: 'Alemaña', eu: 'Alemania', ca: 'Alemanya', lat: 51.2, lon: 10.4, iso: 'DE' },
  Italy: { es: 'Italia', en: 'Italy', gl: 'Italia', eu: 'Italia', ca: 'Itàlia', lat: 42.8, lon: 12.6, iso: 'IT' },
  'Soviet Union': { es: 'Unión Soviética', en: 'Soviet Union', gl: 'Unión Soviética', eu: 'Sobietar Batasuna', ca: 'Unió Soviètica', lat: 55.7, lon: 37.6, iso: 'RU' },
  Sweden: { es: 'Suecia', en: 'Sweden', gl: 'Suecia', eu: 'Suedia', ca: 'Suècia', lat: 60.1, lon: 18.6, iso: 'SE' },
  Spain: { es: 'España', en: 'Spain', gl: 'España', eu: 'Espainia', ca: 'Espanya', lat: 40.2, lon: -3.7, iso: 'ES' },
  'United Kingdom': { es: 'Reino Unido', en: 'United Kingdom', gl: 'Reino Unido', eu: 'Erresuma Batua', ca: 'Regne Unit', lat: 54.0, lon: -2.5, iso: 'GB' },
  'Hong Kong': { es: 'Hong Kong', en: 'Hong Kong', gl: 'Hong Kong', eu: 'Hong Kong', ca: 'Hong Kong', lat: 22.3, lon: 114.2, iso: 'HK' },
  Taiwan: { es: 'Taiwán', en: 'Taiwan', gl: 'Taiwán', eu: 'Taiwan', ca: 'Taiwan', lat: 23.7, lon: 121.0, iso: 'TW' },
  Hungary: { es: 'Hungría', en: 'Hungary', gl: 'Hungría', eu: 'Hungaria', ca: 'Hongria', lat: 47.2, lon: 19.5, iso: 'HU' },
  'South Korea': { es: 'Corea del Sur', en: 'South Korea', gl: 'Corea do Sur', eu: 'Hego Korea', ca: 'Corea del Sud', lat: 36.5, lon: 127.8, iso: 'KR' },
  Iran: { es: 'Irán', en: 'Iran', gl: 'Irán', eu: 'Iran', ca: 'Iran', lat: 32.4, lon: 53.7, iso: 'IR' },
  India: { es: 'India', en: 'India', gl: 'India', eu: 'India', ca: 'Índia', lat: 22.6, lon: 79.0, iso: 'IN' },
  Czechoslovakia: { es: 'Checoslovaquia', en: 'Czechoslovakia', gl: 'Checoslovaquia', eu: 'Txekoslovakia', ca: 'Txecoslovàquia', lat: 49.8, lon: 15.5, iso: 'CZ' },
  China: { es: 'China', en: 'China', gl: 'China', eu: 'Txina', ca: 'Xina', lat: 35.9, lon: 104.2, iso: 'CN' },
  Thailand: { es: 'Tailandia', en: 'Thailand', gl: 'Tailandia', eu: 'Thailandia', ca: 'Tailàndia', lat: 15.9, lon: 100.9, iso: 'TH' },
  Mexico: { es: 'México', en: 'Mexico', gl: 'México', eu: 'Mexiko', ca: 'Mèxic', lat: 23.6, lon: -102.5, iso: 'MX' },
  Poland: { es: 'Polonia', en: 'Poland', gl: 'Polonia', eu: 'Polonia', ca: 'Polònia', lat: 51.9, lon: 19.1, iso: 'PL' },
};

export interface AtlasEntry extends GeoInfo {
  key: string;
  count: number;
}

/** Países del catálogo con su recuento y coordenadas, de mayor a menor. */
export function getAtlas(): AtlasEntry[] {
  const counts = new Map<string, number>();
  for (const f of filmsData.films as { country: string }[]) {
    const primary = (f.country ?? '').split('/')[0].trim();
    if (!GEO[primary]) continue;
    counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count, ...GEO[key] }))
    .sort((a, b) => b.count - a.count || b.lat - a.lat);
}

/** Proyección equirectangular: (lon,lat) → (x,y) en un lienzo de w×h. */
export function project(lon: number, lat: number, w: number, h: number): { x: number; y: number } {
  return { x: ((lon + 180) / 360) * w, y: ((90 - lat) / 180) * h };
}
