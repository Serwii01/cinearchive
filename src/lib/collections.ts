import data from '../data/collections.json';
import { contentLang, type Lang } from '../i18n/ui';

/** Dosier / colección temática curada. */
export interface Collection {
  slug: string;
  title_es: string;
  title_en: string;
  blurb_es: string;
  blurb_en: string;
  tmdbIds: number[];
}

export const collections = data.items as Collection[];

export const collectionBySlug = (slug: string): Collection | undefined =>
  collections.find((c) => c.slug === slug);

export const collectionTitle = (c: Collection, lang: Lang) => (contentLang(lang) === 'es' ? c.title_es : c.title_en);
export const collectionBlurb = (c: Collection, lang: Lang) => (contentLang(lang) === 'es' ? c.blurb_es : c.blurb_en);
