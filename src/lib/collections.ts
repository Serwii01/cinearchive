import data from '../data/collections.json';
import { localizedField, type Lang } from '../i18n/ui';

/** Dosier / colección temática curada. Los campos gl/eu/ca son opcionales (reserva a es). */
export interface Collection {
  slug: string;
  title_es: string;
  title_en: string;
  title_gl?: string;
  title_eu?: string;
  title_ca?: string;
  blurb_es: string;
  blurb_en: string;
  blurb_gl?: string;
  blurb_eu?: string;
  blurb_ca?: string;
  tmdbIds: number[];
}

export const collections = data.items as Collection[];

export const collectionBySlug = (slug: string): Collection | undefined =>
  collections.find((c) => c.slug === slug);

export const collectionTitle = (c: Collection, lang: Lang) => localizedField(c, 'title', lang);
export const collectionBlurb = (c: Collection, lang: Lang) => localizedField(c, 'blurb', lang);
