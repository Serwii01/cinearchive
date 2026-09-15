import { articles, type Article, type ArticleCopy } from '../data/articles';
import { defaultLang, type Lang } from '../i18n/ui';

export { articles };
export type { Article, ArticleCopy };

export const articleBySlug = (slug: string): Article | undefined => articles.find((a) => a.slug === slug);

export const articleCopy = (a: Article, lang: Lang): ArticleCopy => a.copy[lang] ?? a.copy[defaultLang];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Un párrafo del artículo a HTML. Solo se admite **negrita**: se escapa todo
 * y luego se marcan las parejas de asteriscos, así el texto no puede colar
 * etiquetas aunque alguien las escriba en el fichero.
 */
export function renderParagraph(p: string): string {
  return esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** ¿Es un subtítulo («## …»)? Devuelve el texto sin la marca, o null. */
export function heading(p: string): string | null {
  return p.startsWith('## ') ? p.slice(3).trim() : null;
}
