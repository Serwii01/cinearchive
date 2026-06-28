import data from '../data/library.json';

/** Texto de cine en dominio público alojado en Internet Archive. */
export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  lang: string;
  blurb_es: string;
  blurb_en: string;
}

export const books = data.items as Book[];

export const bookById = (id: string): Book | undefined => books.find((b) => b.id === id);

/** Miniatura local (descargada con scripts/fetch-library.mjs); no toca archive.org en runtime. */
export const bookCoverUrl = (id: string) => `/library/${id}.jpg`;
/** Visor BookReader incrustable de Internet Archive. */
export const bookEmbedUrl = (id: string) => `https://archive.org/embed/${id}`;
/** Página pública del ítem en Internet Archive. */
export const bookIaUrl = (id: string) => `https://archive.org/details/${id}`;
