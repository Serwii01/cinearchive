/**
 * Artículos del blog (WordPress en blog.cinearchive.es), para la sección de
 * artículos y la portada. SOLO SERVIDOR.
 *
 * Los artículos se escriben y se leen en el blog; aquí solo se listan, y cada
 * tarjeta lleva allí. Se piden al endpoint del plugin «Cine Archive — Blog»
 * (wordpress/cinearchive-blog/includes/rest.php), que da los campos ya
 * resueltos y filtrados por idioma.
 *
 * La web no puede caerse porque el blog tarde o no esté: cada lista se guarda
 * cinco minutos y, si el blog falla, se sigue enseñando la última que llegó
 * (o ninguna, y la página lo dice). Un fallo también se recuerda un minuto,
 * para no esperar el tiempo máximo en cada visita mientras el blog esté caído.
 */
import type { Lang } from '../i18n/ui';

export interface BlogPost {
  /** Dirección del artículo en el blog. */
  url: string;
  title: string;
  kicker: string;
  excerpt: string;
  /** AAAA-MM-DD. */
  date: string;
  image: string | null;
}

/** Dirección del blog, sin barra final. */
export function blogUrl(): string {
  return (process.env.BLOG_URL || 'https://blog.cinearchive.es').replace(/\/+$/, '');
}

const FRESCO_MS = 5 * 60 * 1000;
const REINTENTO_MS = 60 * 1000;
const ESPERA_MS = 3000;

interface Entrada {
  posts: BlogPost[];
  hasta: number;
}
const cache = new Map<string, Entrada>();
const enVuelo = new Map<string, Promise<BlogPost[]>>();

/** Para los tests. */
export function _resetBlogCache(): void {
  cache.clear();
  enVuelo.clear();
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Valida y recorta lo que llega del blog: solo lo que se va a pintar. */
export function parsePosts(data: unknown): BlogPost[] {
  const lista = (data as { posts?: unknown })?.posts;
  if (!Array.isArray(lista)) throw new Error('respuesta del blog sin «posts»');
  return lista
    .map((p: Record<string, unknown>) => ({
      url: texto(p?.url),
      title: texto(p?.title),
      kicker: texto(p?.kicker),
      excerpt: texto(p?.excerpt),
      date: texto(p?.date),
      image: texto(p?.image) || null,
    }))
    .filter((p) => /^https?:\/\//.test(p.url) && p.title !== '');
}

async function pedir(lang: Lang, perPage: number): Promise<BlogPost[]> {
  const url = `${blogUrl()}/wp-json/cinearchive/v1/posts?lang=${lang}&per_page=${perPage}`;
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(ESPERA_MS) });
  if (!res.ok) throw new Error(`blog ${res.status}`);
  return parsePosts(await res.json());
}

/**
 * Los últimos artículos del blog en un idioma. Nunca lanza: si no hay forma
 * de saberlo, devuelve la última lista conocida o una vacía.
 */
export async function getBlogPosts(lang: Lang, perPage = 12): Promise<BlogPost[]> {
  const key = `${lang}:${perPage}`;
  const ahora = Date.now();
  const hit = cache.get(key);
  if (hit && hit.hasta > ahora) return hit.posts;

  let vuelo = enVuelo.get(key);
  if (!vuelo) {
    vuelo = pedir(lang, perPage)
      .then((posts) => {
        cache.set(key, { posts, hasta: Date.now() + FRESCO_MS });
        return posts;
      })
      .catch((e) => {
        console.warn(`[blog] no se pudo leer el blog (${lang}):`, e instanceof Error ? e.message : e);
        const viejos = cache.get(key)?.posts ?? [];
        cache.set(key, { posts: viejos, hasta: Date.now() + REINTENTO_MS });
        return viejos;
      })
      .finally(() => enVuelo.delete(key));
    enVuelo.set(key, vuelo);
  }
  return vuelo;
}

/**
 * Adónde va una URL antigua de artículo (/en/articles/emmy-2026). El blog
 * busca la entrada importada de ese artículo en ese idioma (ver
 * wordpress/cinearchive-blog/includes/redirect.php).
 */
export function oldArticleUrl(slug: string, lang: Lang): string {
  const u = new URL(`${blogUrl()}/`);
  u.searchParams.set('ca_articulo', slug);
  u.searchParams.set('lang', lang);
  return u.href;
}
