/**
 * Nombres de los países del catálogo (films.json) en los cinco idiomas, para la
 * Filmoteca. El atlas del cine ya no sale de aquí: ver lib/movements.ts.
 */
interface CountryNames {
  es: string;
  en: string;
  gl: string;
  eu: string;
  ca: string;
}

/** País primario tal como aparece en films.json → su nombre en los 5 idiomas. */
const GEO: Record<string, CountryNames> = {
  USA: { es: 'Estados Unidos', en: 'United States', gl: 'Estados Unidos', eu: 'Estatu Batuak', ca: 'Estats Units' },
  France: { es: 'Francia', en: 'France', gl: 'Francia', eu: 'Frantzia', ca: 'França' },
  Japan: { es: 'Japón', en: 'Japan', gl: 'Xapón', eu: 'Japonia', ca: 'Japó' },
  Germany: { es: 'Alemania', en: 'Germany', gl: 'Alemaña', eu: 'Alemania', ca: 'Alemanya' },
  Italy: { es: 'Italia', en: 'Italy', gl: 'Italia', eu: 'Italia', ca: 'Itàlia' },
  'Soviet Union': { es: 'Unión Soviética', en: 'Soviet Union', gl: 'Unión Soviética', eu: 'Sobietar Batasuna', ca: 'Unió Soviètica' },
  Sweden: { es: 'Suecia', en: 'Sweden', gl: 'Suecia', eu: 'Suedia', ca: 'Suècia' },
  Spain: { es: 'España', en: 'Spain', gl: 'España', eu: 'Espainia', ca: 'Espanya' },
  'United Kingdom': { es: 'Reino Unido', en: 'United Kingdom', gl: 'Reino Unido', eu: 'Erresuma Batua', ca: 'Regne Unit' },
  'Hong Kong': { es: 'Hong Kong', en: 'Hong Kong', gl: 'Hong Kong', eu: 'Hong Kong', ca: 'Hong Kong' },
  Taiwan: { es: 'Taiwán', en: 'Taiwan', gl: 'Taiwán', eu: 'Taiwan', ca: 'Taiwan' },
  Hungary: { es: 'Hungría', en: 'Hungary', gl: 'Hungría', eu: 'Hungaria', ca: 'Hongria' },
  'South Korea': { es: 'Corea del Sur', en: 'South Korea', gl: 'Corea do Sur', eu: 'Hego Korea', ca: 'Corea del Sud' },
  Iran: { es: 'Irán', en: 'Iran', gl: 'Irán', eu: 'Iran', ca: 'Iran' },
  India: { es: 'India', en: 'India', gl: 'India', eu: 'India', ca: 'Índia' },
  Czechoslovakia: { es: 'Checoslovaquia', en: 'Czechoslovakia', gl: 'Checoslovaquia', eu: 'Txekoslovakia', ca: 'Txecoslovàquia' },
  China: { es: 'China', en: 'China', gl: 'China', eu: 'Txina', ca: 'Xina' },
  Thailand: { es: 'Tailandia', en: 'Thailand', gl: 'Tailandia', eu: 'Thailandia', ca: 'Tailàndia' },
  Mexico: { es: 'México', en: 'Mexico', gl: 'México', eu: 'Mexiko', ca: 'Mèxic' },
  Poland: { es: 'Polonia', en: 'Poland', gl: 'Polonia', eu: 'Polonia', ca: 'Polònia' },
  // Solo aparecen como segundo país de una coproducción («France / Algeria»).
  Algeria: { es: 'Argelia', en: 'Algeria', gl: 'Alxeria', eu: 'Aljeria', ca: 'Algèria' },
  Switzerland: { es: 'Suiza', en: 'Switzerland', gl: 'Suíza', eu: 'Suitza', ca: 'Suïssa' },
};

/**
 * Nombre del país (o países de una coproducción, «France / Algeria») en el
 * idioma pedido. Lo que no esté en la tabla se deja como viene.
 */
export function countryLabel(raw: string, lang: 'es' | 'en' | 'gl' | 'eu' | 'ca'): string {
  return raw
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => GEO[p]?.[lang] ?? p)
    .join(' / ');
}

