import data from '../data/pdfilms.json';

/** Película de dominio público alojada en Internet Archive. */
export interface PdFilm {
  id: string;
  title: string;
  original_title: string;
  director: string;
  year: number;
  country: string;
  runtime: number;
  /** idioma del blurb por defecto (para el filtro de idioma): 'es' | 'en' */
  lang: string;
  blurb_es: string;
  blurb_en: string;
}

export const pdFilms = data.items as PdFilm[];

export const pdFilmById = (id: string): PdFilm | undefined => pdFilms.find((f) => f.id === id);

/** Miniatura local (descargada con scripts/fetch-pd.mjs); no toca archive.org en runtime. */
export const pdThumbUrl = (id: string) => `/cinema/${id}.jpg`;
/** Reproductor incrustable de Internet Archive. */
export const pdEmbedUrl = (id: string) => `https://archive.org/embed/${id}`;
/** Página pública del ítem en Internet Archive. */
export const pdIaUrl = (id: string) => `https://archive.org/details/${id}`;
