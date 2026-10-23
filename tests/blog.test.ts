import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { getBlogPosts, parsePosts, oldArticleUrl, blogUrl, _resetBlogCache } from '../src/lib/blog';
import { languages } from '../src/i18n/ui';

const post = (over: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'emmy-2026',
  articulo: 'emmy-2026',
  url: 'https://blog.cinearchive.es/emmy-2026/',
  title: 'Emmy 2026',
  kicker: 'Televisión',
  excerpt: 'Entradilla',
  date: '2026-09-15',
  image: 'https://image.tmdb.org/t/p/w780/x.jpg',
  ...over,
});
const respuesta = (posts: unknown[]) => new Response(JSON.stringify({ lang: 'es', total: posts.length, posts }), { status: 200 });

beforeEach(() => {
  _resetBlogCache();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('lo que llega del blog', () => {
  it('se queda con lo que se pinta y descarta lo inservible', () => {
    const [p] = parsePosts({ posts: [post({ image: '' }), post({ url: 'javascript:alert(1)' }), post({ title: '' })] });
    expect(p).toEqual({
      url: 'https://blog.cinearchive.es/emmy-2026/',
      title: 'Emmy 2026',
      kicker: 'Televisión',
      excerpt: 'Entradilla',
      date: '2026-09-15',
      image: null,
    });
    expect(parsePosts({ posts: [post({ url: 'javascript:alert(1)' })] })).toEqual([]);
  });

  it('una respuesta sin lista es un error, no una lista vacía', () => {
    expect(() => parsePosts({ code: 'rest_no_route' })).toThrow();
  });
});

describe('getBlogPosts', () => {
  it('pide el idioma y el número de artículos al endpoint del plugin', async () => {
    const f = vi.fn().mockResolvedValue(respuesta([post()]));
    vi.stubGlobal('fetch', f);
    const posts = await getBlogPosts('eu', 4);
    expect(posts).toHaveLength(1);
    expect(f.mock.calls[0][0]).toBe(`${blogUrl()}/wp-json/cinearchive/v1/posts?lang=eu&per_page=4`);
  });

  it('guarda la lista unos minutos: no pregunta al blog en cada visita', async () => {
    const f = vi.fn().mockResolvedValue(respuesta([post()]));
    vi.stubGlobal('fetch', f);
    await getBlogPosts('es', 4);
    await getBlogPosts('es', 4);
    await Promise.all([getBlogPosts('en', 4), getBlogPosts('en', 4)]);
    expect(f).toHaveBeenCalledTimes(2); // una por idioma
  });

  it('si el blog falla, la web no se cae: devuelve la última lista o ninguna', async () => {
    vi.useFakeTimers();
    const f = vi.fn().mockResolvedValueOnce(respuesta([post()])).mockRejectedValue(new Error('caído'));
    vi.stubGlobal('fetch', f);
    expect(await getBlogPosts('es', 4)).toHaveLength(1);
    vi.advanceTimersByTime(6 * 60 * 1000); // caduca
    expect(await getBlogPosts('es', 4)).toHaveLength(1); // la última que llegó
    expect(await getBlogPosts('ca', 4)).toEqual([]); // nunca llegó ninguna
  });

  it('un error HTTP cuenta como fallo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));
    expect(await getBlogPosts('gl', 4)).toEqual([]);
  });
});

describe('URLs antiguas de los artículos', () => {
  it('van al blog con el artículo y el idioma', () => {
    expect(oldArticleUrl('emmy-2026', 'en')).toBe(`${blogUrl()}/?ca_articulo=emmy-2026&lang=en`);
  });
});

describe('la web y el plugin de WordPress hablan lo mismo', () => {
  const plugin = (f: string) => readFileSync(`wordpress/cinearchive-blog/includes/${f}`, 'utf8');

  it('los mismos cinco idiomas, con los mismos códigos', () => {
    const m = plugin('lang.php').match(/const CA_LANGS\s*=\s*array\(([^)]*)\)/);
    expect(m).not.toBeNull();
    const codigos = m![1].match(/'([a-z]{2})'/g)!.map((s) => s.slice(1, 3));
    expect(codigos).toEqual(Object.keys(languages));
  });

  it('la ruta de la API y el parámetro de la redirección coinciden', () => {
    expect(plugin('rest.php')).toContain("register_rest_route(\n\t\t\t'cinearchive/v1',\n\t\t\t'/posts'");
    expect(plugin('redirect.php')).toContain("$_GET['ca_articulo']");
    expect(oldArticleUrl('x', 'es')).toContain('ca_articulo=x');
  });

  it('los textos del tema están generados para todos los idiomas', () => {
    const strings = readFileSync('wordpress/cinearchive-theme/inc/strings.php', 'utf8');
    for (const lang of Object.keys(languages)) expect(strings).toContain(`'${lang}' => array(`);
  });
});
