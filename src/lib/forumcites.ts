/**
 * Citas del archivo en el foro — SOLO SERVIDOR.
 *
 * `resolveCites` convierte las referencias de unos mensajes (`[[film:603]]`…)
 * en tarjetas con título, línea de contexto, portada y enlace, en el idioma de
 * quien lee. Lo propio de la casa (Cine abierto, hemeroteca, biblioteca,
 * artículos, dosieres, colecciones) está en memoria; las películas de TMDB
 * salen de films_cache y, si falta alguna, de TMDB (getFilmsBrief), todas de
 * una vez por página.
 *
 * `searchCites` es el buscador del botón «Citar»: el índice del archivo
 * (lib/sitesearch.ts) más TMDB para cualquier otra película.
 */
import { articleBySlug, articleCopy } from './articles';
import { bookById, bookCoverUrl } from './library';
import { collectionBySlug, collectionTitle } from './collections';
import { dossierBySlug, dossierCopy } from './dossiers';
import { periodicals, coverUrl } from './periodicals';
import { pdFilmById, pdFilmByTmdbId, pdThumbUrl, pdTitle } from './pdfilms';
import { getFilmsBrief } from './films';
import { savedTitles, filmPathFor } from './filmlinks';
import { searchMovies, posterUrl } from './tmdb';
import { searchSite } from './sitesearch';
import { existingMentions } from './forumactivity';
import { citeKey, citeToken, isCiteKind, extractCites, renderForumBody, type CiteCard, type CiteKind, type CiteLabels, type CiteRef } from './forumbody';
import { localizePath, useTranslations, type Lang } from '../i18n/ui';

const periodicalById = new Map(periodicals.map((p) => [p.id, p]));

/** La tarjeta de algo propio de la casa (sin base de datos), o null si no existe. */
export function localCite(kind: CiteKind, id: string, lang: Lang): CiteCard | null {
  switch (kind) {
    case 'cinema': {
      const f = pdFilmById(id);
      return f
        ? { kind, title: pdTitle(f, lang), meta: `${f.year} · ${f.director}`, href: localizePath(lang, `cinema/${f.id}`), image: pdThumbUrl(f.id) }
        : null;
    }
    case 'periodical': {
      const p = periodicalById.get(id);
      return p
        ? { kind, title: `${p.title} · ${p.issue}`, meta: `${p.year} · ${p.publisher}`, href: localizePath(lang, `archive/${p.id}`), image: coverUrl(p.id) }
        : null;
    }
    case 'book': {
      const b = bookById(id);
      return b ? { kind, title: b.title, meta: `${b.author} · ${b.year}`, href: localizePath(lang, `library/${b.id}`), image: bookCoverUrl(b.id) } : null;
    }
    case 'article': {
      const a = articleBySlug(id);
      if (!a) return null;
      const c = articleCopy(a, lang);
      return { kind, title: c.title, meta: c.kicker, href: localizePath(lang, `articles/${a.slug}`), image: null };
    }
    case 'dossier': {
      const d = dossierBySlug(id);
      if (!d) return null;
      const c = dossierCopy(d, lang);
      return { kind, title: c.title, meta: c.kicker, href: localizePath(lang, `dossiers/${d.slug}`), image: null };
    }
    case 'collection': {
      const c = collectionBySlug(id);
      return c ? { kind, title: collectionTitle(c, lang), meta: '', href: localizePath(lang, `collections/${c.slug}`), image: null } : null;
    }
    default:
      return null;
  }
}

/** Las tarjetas de unas citas, por citeKey. Las que no existen no salen (el mensaje dice «cita no disponible»). */
export async function resolveCites(refs: CiteRef[], lang: Lang): Promise<Map<string, CiteCard>> {
  const out = new Map<string, CiteCard>();
  const pelis: number[] = [];
  for (const r of refs) {
    if (r.kind === 'film') {
      const id = Number(r.id);
      if (Number.isInteger(id) && id > 0) pelis.push(id);
      continue;
    }
    const c = localCite(r.kind, r.id, lang);
    if (c) out.set(citeKey(r.kind, r.id), c);
  }
  if (pelis.length) {
    const unicas = [...new Set(pelis)];
    const [briefs, titulos] = await Promise.all([
      getFilmsBrief(unicas, lang).catch(() => new Map()),
      savedTitles(unicas),
    ]);
    for (const id of unicas) {
      const b = briefs.get(id);
      if (!b) continue;
      const pd = pdFilmByTmdbId(id);
      out.set(citeKey('film', String(id)), {
        kind: 'film',
        title: b.title,
        meta: [b.year, b.director].filter(Boolean).join(' · '),
        href: localizePath(lang, filmPathFor(id, lang, titulos, b.title)),
        image: b.poster,
        watchHref: pd ? localizePath(lang, `cinema/${pd.id}`) : undefined,
      });
    }
  }
  return out;
}

export interface CiteHit extends CiteCard {
  token: string;
}

/**
 * Lo de la casa que se puede citar y, a igual relevancia, en qué orden: en un
 * foro se cita sobre todo películas, luego fuentes (hemeroteca, libros) y por
 * último lo escrito aquí. Sin esto, «murnau» daba antes dos artículos que lo
 * nombran de pasada que «Amanecer».
 */
const ORDEN_ARCHIVO: Partial<Record<string, number>> = { cinema: 0, periodical: 1, book: 2, article: 3, dossier: 4, collection: 5 };

/**
 * Lo que se puede citar para una búsqueda: primero lo de la casa (es lo que
 * no se encuentra en otro foro) y luego las películas de TMDB. Si TMDB falla
 * (o no hay clave, en local), solo lo de la casa.
 */
export async function searchCites(q: string, lang: Lang, kind?: CiteKind): Promise<CiteHit[]> {
  const out: CiteHit[] = [];
  if (kind !== 'film') {
    const hits = searchSite(q, lang, 60)
      .filter((h) => ORDEN_ARCHIVO[h.kind] !== undefined && (!kind || h.kind === kind))
      .sort((a, b) => b.score - a.score || ORDEN_ARCHIVO[a.kind]! - ORDEN_ARCHIVO[b.kind]!);
    for (const h of hits) {
      if (!isCiteKind(h.kind)) continue;
      const c = localCite(h.kind, h.ref, lang);
      if (c) out.push({ ...c, token: citeToken(h.kind, h.ref) });
      if (out.length >= 10) break;
    }
  }
  if (!kind || kind === 'film') {
    try {
      const pelis = await searchMovies(q, lang);
      for (const m of pelis.slice(0, 8)) {
        const pd = pdFilmByTmdbId(m.id);
        out.push({
          kind: 'film',
          title: m.title,
          meta: [m.release_date?.slice(0, 4), m.original_title !== m.title ? m.original_title : ''].filter(Boolean).join(' · '),
          href: localizePath(lang, `film/${m.id}`),
          image: posterUrl(m.poster_path, 'w92'),
          watchHref: pd ? localizePath(lang, `cinema/${pd.id}`) : undefined,
          token: citeToken('film', String(m.id)),
        });
      }
    } catch {
      /* TMDB caído o sin clave: se cita lo de la casa. */
    }
  }
  return out;
}

/** Las etiquetas de las tarjetas en un idioma (tipo de cita, «verla entera», cita perdida). */
export function citeLabelsFor(lang: Lang): CiteLabels {
  const t = useTranslations(lang);
  return {
    film: t('forum.kindFilm'),
    cinema: t('search.kindCinema'),
    periodical: t('search.kindPeriodical'),
    book: t('search.kindBook'),
    article: t('search.kindArticle'),
    dossier: t('search.kindDossier'),
    collection: t('search.kindCollection'),
    watch: t('forum.watchFull'),
    missing: t('forum.citeMissing'),
    spoiler: t('forum.spoilerReveal'),
  };
}

/** El HTML de varios mensajes de una vez: una sola resolución de citas y de @ para toda la página. */
export async function renderBodies(bodies: string[], lang: Lang): Promise<string[]> {
  const refs = bodies.flatMap((b) => extractCites(b));
  const [cites, users] = await Promise.all([resolveCites(refs, lang), existingMentions(bodies)]);
  const labels = citeLabelsFor(lang);
  const opts = { users, userHref: (u: string) => localizePath(lang, `u/${u}`) };
  return bodies.map((b) => renderForumBody(b, cites, labels, opts));
}
