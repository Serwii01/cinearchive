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
  /** Licencia cuando no es dominio público ('CC BY', 'CC BY-SA'…). Se enseña en la ficha. */
  license?: string;
  /** Día en que entró en la hemeroteca (AAAA-MM-DD). Ordena las novedades de la portada. */
  added?: string;
  blurb_es: string;
  blurb_en: string;
}

export const periodicals = data.items as Periodical[];

/**
 * Los números para la portada y el teletipo: primero los últimos en entrar,
 * y a igual día de alta el de año más reciente. Sin repetir cabecera.
 *
 * Antes se ordenaba solo por año, y al meter cuatro Shock Cinema de los
 * noventa la portada no se enteraba: todo lo nuevo era «viejo».
 */
export function recentIssues(n: number): Periodical[] {
  const sorted = periodicals
    .slice()
    .sort((a, b) => (b.added ?? '').localeCompare(a.added ?? '') || b.year - a.year || a.title.localeCompare(b.title));
  const seen = new Set<string>();
  const out: Periodical[] = [];
  for (const p of sorted) {
    if (seen.has(p.title)) continue;
    seen.add(p.title);
    out.push(p);
    if (out.length === n) break;
  }
  return out;
}

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
