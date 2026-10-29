/**
 * Imagen de un artículo para enseñarlo fuera de su página (el collage del
 * carrusel de la portada). SOLO SERVIDOR: puede preguntar a TMDB.
 *
 * El orden es el mismo que usa la cabecera del artículo: la imagen propia si
 * la tiene; si no, el fondo de su película o serie de TMDB; y, para los que
 * solo llevan muro de carteles, el cartel del primero. Nunca lanza: sin
 * imagen, la portada pinta una casilla con grano y el título.
 */
import type { Article } from './articles';
import { getMovie, getTv, backdropUrl, posterUrl } from './tmdb';
import type { Lang } from '../i18n/ui';

export interface ArticleImageSources {
  backdrop: (tmdbId: number, kind: 'movie' | 'tv', lang: Lang) => Promise<string | null>;
  poster: (tmdbId: number, kind: 'movie' | 'tv', lang: Lang) => Promise<string | null>;
}

const tmdbSources: ArticleImageSources = {
  async backdrop(id, kind, lang) {
    const path = kind === 'tv' ? (await getTv(id, lang)).backdrop_path : (await getMovie(id, lang)).backdrop_path;
    // w780 basta: en el collage cada imagen ocupa como mucho media columna.
    return backdropUrl(path, 'w780');
  },
  async poster(id, kind, lang) {
    const path = kind === 'tv' ? (await getTv(id, lang)).poster_path : (await getMovie(id, lang)).poster_path;
    return posterUrl(path, 'w342');
  },
};

export async function articleImage(
  a: Article,
  lang: Lang,
  sources: ArticleImageSources = tmdbSources,
): Promise<string | null> {
  if (a.image?.src) return a.image.src;
  try {
    if (a.cover) return await sources.backdrop(a.cover.tmdbId, a.cover.kind ?? 'movie', lang);
    const first = a.gallery?.items[0];
    if (first) return await sources.poster(first.tmdbId, a.gallery!.kind, lang);
  } catch {
    /* TMDB no responde: sin imagen */
  }
  return null;
}
