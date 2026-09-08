import { dossiers, type Dossier, type DossierCopy } from '../data/dossiers';
import { defaultLang, type Lang } from '../i18n/ui';

export { dossiers };
export type { Dossier, DossierCopy };

export const dossierBySlug = (slug: string): Dossier | undefined =>
  dossiers.find((d) => d.slug === slug);

/**
 * El texto del dosier en un idioma. Los cinco están escritos, pero si alguno
 * faltara se cae al castellano antes que dejar la página en blanco.
 */
export const dossierCopy = (d: Dossier, lang: Lang): DossierCopy => d.copy[lang] ?? d.copy[defaultLang];
