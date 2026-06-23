import data from '../data/periodicals.json';

export interface Periodical {
  id: string;
  title: string;
  issue: string;
  year: number;
  type: 'magazine' | 'newspaper';
  publisher: string;
  country: string;
  lang: string;
  blurb_es: string;
  blurb_en: string;
}

export const periodicals = data.items as Periodical[];

/** URL de la portada (miniatura) en Internet Archive. */
export const coverUrl = (id: string) => `https://archive.org/services/img/${id}`;
/** Visor incrustable (BookReader) de Internet Archive. */
export const embedUrl = (id: string) => `https://archive.org/embed/${id}`;
/** Página pública del ítem en Internet Archive. */
export const iaUrl = (id: string) => `https://archive.org/details/${id}`;
