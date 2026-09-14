import data from '../data/pdfilms.json';

export type PdLicense = 'pd' | 'cc0' | 'cc-by' | 'cc-by-sa' | 'cc-by-nd' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nc-nd';

/** Película de dominio público alojada en Internet Archive. */
export interface PdFilm {
  id: string;
  title: string;
  original_title: string;
  director: string;
  year: number;
  country: string;
  runtime: number;
  /**
   * Licencia: dominio público por defecto. Las Creative Commons llevan su
   * variante, porque no es lo mismo poder remezclar (BY) que solo poder ver
   * y compartir (BY-NC-ND), y el visitante tiene derecho a saberlo.
   */
  license?: PdLicense;
  /** idioma del blurb por defecto (para el filtro de idioma): 'es' | 'en' */
  lang: string;
  blurb_es: string;
  blurb_en: string;
}

export const pdFilms = data.items as PdFilm[];

export const pdFilmById = (id: string): PdFilm | undefined => pdFilms.find((f) => f.id === id);

/**
 * Texto de la insignia de licencia. Dominio público (y CC0, que es su
 * equivalente) usan la etiqueta traducida; las Creative Commons se escriben
 * con su código, que es universal y no se traduce.
 */
export function pdLicenseLabel(license: PdLicense | undefined, t: (k: 'cinema.publicDomain' | 'cinema.ccby') => string): string {
  if (!license || license === 'pd' || license === 'cc0') return t('cinema.publicDomain');
  if (license === 'cc-by') return t('cinema.ccby');
  return `${t('cinema.ccby')} · ${license.slice(3).toUpperCase()}`;
}

/** Miniatura local (descargada con scripts/fetch-pd.mjs); no toca archive.org en runtime. */
export const pdThumbUrl = (id: string) => `/cinema/${id}.jpg`;
/** Reproductor incrustable de Internet Archive. */
export const pdEmbedUrl = (id: string) => `https://archive.org/embed/${id}`;
/** Página pública del ítem en Internet Archive. */
export const pdIaUrl = (id: string) => `https://archive.org/details/${id}`;
