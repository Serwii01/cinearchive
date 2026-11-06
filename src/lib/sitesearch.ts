/**
 * Buscador del propio archivo (SOLO SERVIDOR).
 *
 * /search solo preguntaba a TMDB y a la tabla de usuarios: lo que hace única a
 * esta web —la hemeroteca, los artículos, el glosario, las figuras, las
 * colecciones, los dosieres, la biblioteca y el cine abierto— no salía nunca.
 * Quien buscaba «Photoplay» o «Nouvelle Vague» no encontraba nada.
 *
 * Todo ese contenido vive en ficheros del repo, así que el índice se construye
 * en memoria la primera vez que se pide cada idioma y ya no cambia hasta el
 * siguiente despliegue. La búsqueda ignora mayúsculas y acentos, exige que
 * estén todas las palabras y puntúa más lo que aparece en el título.
 */
import { articles, articleCopy } from './articles';
import { periodicals } from './periodicals';
import { books } from './library';
import { figures } from './figures';
import { collections, collectionTitle, collectionBlurb } from './collections';
import { dossiers, dossierCopy } from './dossiers';
import { pdFilms } from './pdfilms';
import { glossary, glossaryTerm, glossaryDef } from './reference';
import { localizePath, type Lang } from '../i18n/ui';

export type SiteKind = 'article' | 'dossier' | 'collection' | 'figure' | 'periodical' | 'book' | 'cinema' | 'glossary';

export interface SiteHit {
  kind: SiteKind;
  title: string;
  /** Una línea de contexto: revista y año, autor, definición… */
  meta: string;
  href: string;
}

interface Entry extends SiteHit {
  /** Título normalizado (pesa más) y resto del texto normalizado. */
  nt: string;
  nx: string;
}

/** Minúsculas, sin acentos ni signos: «Cinéphiles» y «cinephiles» son lo mismo. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const blurb = (o: { blurb_es: string; blurb_en: string }, lang: Lang) => (lang === 'en' ? o.blurb_en : o.blurb_es);

function build(lang: Lang): Entry[] {
  const out: Entry[] = [];
  const push = (kind: SiteKind, title: string, meta: string, href: string, extra = '') =>
    out.push({ kind, title, meta, href, nt: norm(title), nx: norm(`${meta} ${extra}`) });

  for (const a of articles) {
    const c = articleCopy(a, lang);
    push('article', c.title, c.kicker, localizePath(lang, `articles/${a.slug}`), `${c.lead} ${c.body.join(' ')}`);
  }
  for (const d of dossiers) {
    const c = dossierCopy(d, lang);
    push('dossier', c.title, c.kicker, localizePath(lang, `dossiers/${d.slug}`), `${c.blurb} ${c.lead}`);
  }
  for (const c of collections) {
    push('collection', collectionTitle(c, lang), collectionBlurb(c, lang), localizePath(lang, `collections/${c.slug}`));
  }
  for (const f of figures) {
    push('figure', f.name, '', localizePath(lang, `person/${f.id}`));
  }
  for (const p of periodicals) {
    push('periodical', `${p.title} · ${p.issue}`, `${p.year} · ${p.publisher}`, localizePath(lang, `archive/${p.id}`), `${p.country} ${blurb(p, lang)}`);
  }
  for (const b of books) {
    push('book', b.title, `${b.author} · ${b.year}`, localizePath(lang, `library/${b.id}`), blurb(b, lang));
  }
  for (const f of pdFilms) {
    push(
      'cinema',
      f.title,
      `${f.director} · ${f.year}`,
      localizePath(lang, `cinema/${f.id}`),
      `${f.original_title} ${f.country} ${blurb(f, lang)}`,
    );
  }
  for (const g of glossary) {
    const term = glossaryTerm(g, lang);
    const letra = norm(term).charAt(0).toUpperCase();
    // Se busca también por el término en castellano e inglés: «plano» y «shot»
    // llevan a la misma definición en cualquier idioma.
    push('glossary', term, glossaryDef(g, lang), `${localizePath(lang, 'glossary')}#l-${letra}`, `${g.term_es} ${g.term_en}`);
  }
  return out;
}

const indices = new Map<Lang, Entry[]>();
const index = (lang: Lang) => indices.get(lang) ?? indices.set(lang, build(lang)).get(lang)!;

/**
 * Puntuación de una entrada para unas palabras: 0 si falta alguna. Pura (tiene
 * tests). Título que empieza por la búsqueda > palabra entera en el título >
 * trozo del título > solo en el texto.
 */
export function scoreEntry(e: { nt: string; nx: string }, words: string[], phrase: string): number {
  let s = 0;
  for (const w of words) {
    if (e.nt.includes(w)) s += new RegExp(`(^| )${w}( |$)`).test(e.nt) ? 3 : 2;
    else if (e.nx.includes(w)) s += 1;
    else return 0;
  }
  if (e.nt.startsWith(phrase)) s += 4;
  else if (e.nt.includes(phrase)) s += 2;
  return s;
}

/** Resultados del archivo para una búsqueda, de más a menos relevantes. */
export function searchSite(q: string, lang: Lang, limit = 24): SiteHit[] {
  const phrase = norm(q);
  const words = phrase.split(' ').filter((w) => w.length >= 2);
  if (!words.length) return [];
  return index(lang)
    .map((e) => ({ e, s: scoreEntry(e, words, phrase) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title, lang))
    .slice(0, limit)
    .map(({ e }) => ({ kind: e.kind, title: e.title, meta: e.meta, href: e.href }));
}
