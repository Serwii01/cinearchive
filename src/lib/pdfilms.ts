import data from '../data/pdfilms.json';
import { filmSlug } from './slug';

export type PdLicense = 'pd' | 'cc0' | 'cc-by' | 'cc-by-sa' | 'cc-by-nd' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nc-nd';

/**
 * Tipos de película con los que se filtra Cine abierto. Pocos y anchos a
 * propósito: con 114 películas, más categorías dejarían filtros de una o dos.
 * El texto de cada uno está en i18n (`cinema.tag.<clave>`).
 */
export const PD_TAGS = [
  'horror',
  'comedy',
  'noir',
  'thriller',
  'scifi',
  'fantasy',
  'adventure',
  'drama',
  'romance',
  'western',
  'documentary',
  'animation',
  'avantgarde',
] as const;
export type PdTag = (typeof PD_TAGS)[number];

/** Por debajo de esto, corto (el umbral habitual de festivales y academias). */
export const PD_SHORT_MAX = 40;

/** Película de dominio público alojada en Internet Archive. */
export interface PdFilm {
  /** Identificador en Internet Archive (también es la URL de la ficha). */
  id: string;
  title: string;
  original_title: string;
  director: string;
  year: number;
  country: string;
  runtime: number;
  /**
   * Licencia: dominio público por defecto. Las Creative Commons llevan su
   * variante, porque no es lo mismo poder remezclar (BY) que solo poder ver
   * y compartir (BY-NC-ND), y el visitante tiene derecho a saberlo.
   */
  license?: PdLicense;
  /** idioma del blurb por defecto (para el filtro de idioma): 'es' | 'en' */
  lang: string;
  blurb_es: string;
  blurb_en: string;
  tags: PdTag[];
  /** false = muda. */
  sound: boolean;
  /**
   * Idioma de los rótulos (mudas) o los diálogos (sonoras) de la copia que se
   * ve. Solo cuando se sabe seguro: sin él, la ficha dice «muda» o «sonora» y nada más.
   */
  language?: string;
  /** Subtítulos incrustados en la copia, si los hay. */
  subtitles?: string;
  /** Imprescindible: sale arriba, en «Por dónde empezar». */
  essential?: boolean;
  /** Fecha en que se publicó en Internet Archive (AAAA-MM-DD; la apunta scripts/fetch-pd.mjs). */
  published?: string;
  /** 'ia': la imagen sale de Internet Archive aunque TMDB tenga una (ver scripts/fetch-pd.mjs). */
  image?: 'ia';
  /** Ficha en TMDB (la apunta scripts/resolve-tmdb-ids.mjs --cine). */
  tmdbId?: number;
}

export const pdFilms = data.items as PdFilm[];

export const pdFilmById = (id: string): PdFilm | undefined => pdFilms.find((f) => f.id === id);

const porTmdb = new Map(pdFilms.filter((f) => f.tmdbId).map((f) => [f.tmdbId!, f]));
/** La de Cine abierto que corresponde a una ficha de TMDB, si se puede ver entera aquí. */
export const pdFilmByTmdbId = (tmdbId: number): PdFilm | undefined => porTmdb.get(tmdbId);

/**
 * Texto de la insignia de licencia. Dominio público (y CC0, que es su
 * equivalente) usan la etiqueta traducida; las Creative Commons se escriben
 * con su código, que es universal y no se traduce.
 */
export function pdLicenseLabel(license: PdLicense | undefined, t: (k: 'cinema.publicDomain' | 'cinema.ccby') => string): string {
  if (!license || license === 'pd' || license === 'cc0') return t('cinema.publicDomain');
  if (license === 'cc-by') return t('cinema.ccby');
  return `${t('cinema.ccby')} · ${license.slice(3).toUpperCase()}`;
}

export const pdIsShort = (f: PdFilm): boolean => f.runtime > 0 && f.runtime < PD_SHORT_MAX;

export const pdDecade = (f: PdFilm): number => Math.floor(f.year / 10) * 10;

/**
 * Páginas propias por tipo y por década (/cinema/tipo/horror, /cinema/decada/1920).
 *
 * Los filtros del listado guardan su estado en `?tipo=`, y Google no trata eso
 * como páginas distintas: «películas de terror clásicas gratis» o «cine mudo
 * online» no tenían dónde caer. Además de los tipos, «muda» y «corto» tienen
 * página porque son de lo que más se busca. Por debajo de PD_GROUP_MIN no se
 * crea: una página con una o dos películas es contenido pobre para un buscador.
 */
export const PD_GROUP_MIN = 3;
export const PD_EXTRA_KINDS = ['silent', 'short'] as const;
export type PdKind = PdTag | (typeof PD_EXTRA_KINDS)[number];

export function pdByKind(kind: PdKind, all: PdFilm[] = pdFilms): PdFilm[] {
  if (kind === 'silent') return all.filter((f) => !f.sound);
  if (kind === 'short') return all.filter(pdIsShort);
  return all.filter((f) => f.tags.includes(kind));
}

/** Tipos con página propia, en el orden de PD_TAGS y luego muda y corto. */
export const pdKinds = (all: PdFilm[] = pdFilms): PdKind[] =>
  [...PD_TAGS, ...PD_EXTRA_KINDS].filter((k) => pdByKind(k, all).length >= PD_GROUP_MIN);

/** Décadas con página propia, de la más antigua a la más reciente. */
export const pdDecades = (all: PdFilm[] = pdFilms): number[] =>
  [...new Set(all.map(pdDecade))].filter((d) => all.filter((f) => pdDecade(f) === d).length >= PD_GROUP_MIN).sort((a, b) => a - b);

/** Clave de i18n con el nombre del tipo (los tipos de PD_TAGS y los dos extra). */
export const pdKindLabelKey = (kind: PdKind): string =>
  (PD_EXTRA_KINDS as readonly string[]).includes(kind) ? `cinema.kind.${kind}` : `cinema.tag.${kind}`;

export const pdKindPath = (kind: PdKind) => `cinema/tipo/${kind}`;
export const pdDecadePath = (decade: number) => `cinema/decada/${decade}`;

/**
 * Otras de Cine abierto para ver después de esta. Puntúa lo que se suele
 * buscar al acabar una película: el mismo director, el mismo tipo, la misma
 * época. Lo imprescindible desempata.
 */
export function pdRelated(film: PdFilm, n = 4, all: PdFilm[] = pdFilms): PdFilm[] {
  const directores = new Set(film.director.split(',').map((d) => d.trim()));
  const puntos = (o: PdFilm): number => {
    let p = 0;
    if (o.director.split(',').some((d) => directores.has(d.trim()))) p += 5;
    p += o.tags.filter((t) => film.tags.includes(t)).length * 2;
    const distancia = Math.abs(o.year - film.year);
    if (distancia <= 5) p += 2;
    else if (distancia <= 15) p += 1;
    if (o.country === film.country) p += 0.5;
    if (o.sound === film.sound) p += 0.5;
    if (o.essential) p += 0.25;
    return p;
  };
  return all
    .filter((o) => o.id !== film.id)
    .map((o) => ({ o, p: puntos(o) }))
    .sort((a, b) => b.p - a.p || Math.abs(a.o.year - film.year) - Math.abs(b.o.year - film.year))
    .slice(0, n)
    .map((x) => x.o);
}

/** Duración en ISO 8601 (la que piden los datos estructurados): 94 → PT1H34M. */
export function pdIsoDuration(min: number): string {
  if (!min || min < 0) return 'PT0M';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `PT${h ? `${h}H` : ''}${m || !h ? `${m}M` : ''}`;
}

/**
 * Datos estructurados para buscadores: la película (Movie) con el vídeo que se
 * puede ver entero aquí (VideoObject). Con esto, Google puede enseñar la ficha
 * como vídeo en los resultados, y es lo que más gente nueva puede traer a la
 * sección con más tráfico de la web.
 */
export function pdVideoLd(film: PdFilm, opts: { pageUrl: string; thumbUrl: string; description: string; inLanguage?: string }): object {
  const directores = film.director.split(',').map((name) => ({ '@type': 'Person', name: name.trim() }));
  const video: Record<string, unknown> = {
    '@type': 'VideoObject',
    name: film.title,
    description: opts.description,
    thumbnailUrl: [opts.thumbUrl],
    duration: pdIsoDuration(film.runtime),
    embedUrl: pdEmbedUrl(film.id),
    url: opts.pageUrl,
    isFamilyFriendly: true,
  };
  // uploadDate es obligatorio para Google; sin fecha, mejor no prometer el vídeo.
  if (film.published) video.uploadDate = film.published;
  if (film.language) video.inLanguage = film.language;
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: film.title,
    ...(film.original_title && film.original_title !== film.title ? { alternateName: film.original_title } : {}),
    description: opts.description,
    image: opts.thumbUrl,
    url: opts.pageUrl,
    dateCreated: String(film.year),
    duration: pdIsoDuration(film.runtime),
    director: directores.length === 1 ? directores[0] : directores,
    countryOfOrigin: film.country,
    genre: film.tags,
    isAccessibleForFree: true,
    ...(pdLicenseUrl(film.license) ? { license: pdLicenseUrl(film.license) } : {}),
    ...(film.published ? { video } : {}),
  };
}

/**
 * URL de la licencia, solo para dominio público y CC0. De las Creative Commons
 * no sabemos la versión exacta de cada copia (3.0, 4.0…), y una URL de licencia
 * equivocada es peor que ninguna.
 */
export function pdLicenseUrl(license?: PdLicense): string | null {
  if (!license || license === 'pd') return 'https://creativecommons.org/publicdomain/mark/1.0/';
  if (license === 'cc0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  return null;
}

/** Ruta de la ficha completa (TMDB), donde se puede guardar y puntuar. Null si no hay. */
export const pdFilmPath = (f: PdFilm): string | null => (f.tmdbId ? `film/${filmSlug(f.tmdbId, f.title)}` : null);

/** Imagen local (fotograma a 800 px, de scripts/fetch-pd.mjs); no toca TMDB ni archive.org en runtime. */
export const pdThumbUrl = (id: string) => `/cinema/${id}.webp`;
/** Reproductor incrustable de Internet Archive. */
export const pdEmbedUrl = (id: string) => `https://archive.org/embed/${id}`;
/** Página pública del ítem en Internet Archive. */
export const pdIaUrl = (id: string) => `https://archive.org/details/${id}`;
