import data from '../data/periodicals.json';
import journalsData from '../data/journals.json';

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

/** Revista de cine actual de acceso abierto (se enlaza a su web; no se incrusta). */
export interface Journal {
  id: string;
  title: string;
  subtitle: string;
  publisher: string;
  country: string;
  lang: string;
  since: number;
  url: string;
  blurb_es: string;
  blurb_en: string;
}

export const journals = journalsData.items as Journal[];

/** URL de la portada: archivo estático local (descargado con scripts/fetch-covers.mjs).
 *  Sirve desde nuestro dominio; en runtime no se toca archive.org para las portadas. */
export const coverUrl = (id: string) => `/covers/${id}.jpg`;
/** Visor incrustable (BookReader) de Internet Archive. */
export const embedUrl = (id: string) => `https://archive.org/embed/${id}`;
/** Página pública del ítem en Internet Archive. */
export const iaUrl = (id: string) => `https://archive.org/details/${id}`;
