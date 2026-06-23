/** Países (ISO 3166-1 alfa-2) para el filtro de Descubrir y el selector de región. */
export interface Country {
  code: string;
  es: string;
  en: string;
}

export const COUNTRIES: Country[] = [
  { code: 'ES', es: 'España', en: 'Spain' },
  { code: 'US', es: 'Estados Unidos', en: 'United States' },
  { code: 'GB', es: 'Reino Unido', en: 'United Kingdom' },
  { code: 'FR', es: 'Francia', en: 'France' },
  { code: 'IT', es: 'Italia', en: 'Italy' },
  { code: 'DE', es: 'Alemania', en: 'Germany' },
  { code: 'JP', es: 'Japón', en: 'Japan' },
  { code: 'KR', es: 'Corea del Sur', en: 'South Korea' },
  { code: 'MX', es: 'México', en: 'Mexico' },
  { code: 'AR', es: 'Argentina', en: 'Argentina' },
  { code: 'BR', es: 'Brasil', en: 'Brazil' },
  { code: 'IN', es: 'India', en: 'India' },
  { code: 'SE', es: 'Suecia', en: 'Sweden' },
  { code: 'DK', es: 'Dinamarca', en: 'Denmark' },
  { code: 'CA', es: 'Canadá', en: 'Canada' },
  { code: 'AU', es: 'Australia', en: 'Australia' },
  { code: 'CN', es: 'China', en: 'China' },
  { code: 'RU', es: 'Rusia', en: 'Russia' },
];

export const countryName = (code: string, lang: 'es' | 'en'): string =>
  COUNTRIES.find((c) => c.code === code)?.[lang] ?? code;

/** Regiones permitidas para "dónde ver" (Watchmode). Acota la cuota mensual. */
export const WATCH_REGIONS = ['ES', 'US', 'GB', 'FR', 'IT', 'DE', 'MX', 'AR', 'BR'] as const;
export const isWatchRegion = (r: string): boolean => (WATCH_REGIONS as readonly string[]).includes(r);
