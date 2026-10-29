import { describe, it, expect, vi, beforeEach } from 'vitest';
import { servePage, cacheKey, hasSessionCookie, _stats } from '../src/lib/htmlcache';
import { clearCache } from '../src/lib/cache-registry';

const page = (body: string, cc = 'public, max-age=0, s-maxage=600', extra: Record<string, string> = {}) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/html', 'Cache-Control': cc, ...extra } });

beforeEach(() => clearCache('html-pages'));

describe('hasSessionCookie', () => {
  it('reconoce la cookie de sesión con y sin __Secure-', () => {
    expect(hasSessionCookie('cine.session_token=abc')).toBe(true);
    expect(hasSessionCookie('theme=dark; __Secure-cine.session_token=abc')).toBe(true);
  });
  it('ignora otras cookies', () => {
    expect(hasSessionCookie(null)).toBe(false);
    expect(hasSessionCookie('theme=dark; cine.state=x')).toBe(false);
    expect(hasSessionCookie('xcine.session_token=abc')).toBe(false);
  });
});

describe('cacheKey', () => {
  it('trata igual la ruta con y sin barra final', () => {
    expect(cacheKey(new URL('https://x.es/films/'))).toBe('/films');
    expect(cacheKey(new URL('https://x.es/films?page=2'))).toBe('/films?page=2');
    expect(cacheKey(new URL('https://x.es/'))).toBe('/');
  });
  it('no guarda consultas desproporcionadas', () => {
    expect(cacheKey(new URL('https://x.es/films?q=' + 'a'.repeat(300)))).toBeNull();
  });
});

describe('servePage', () => {
  it('renderiza una vez y sirve de memoria hasta que caduca', async () => {
    let t = 0;
    const render = vi.fn(async () => page('<p>hola</p>'));
    const a = await servePage('/k', 1000, render, () => t);
    expect(a.headers.get('X-Cache')).toBe('MISS');
    expect(await a.text()).toBe('<p>hola</p>');
    const b = await servePage('/k', 1000, render, () => t);
    expect(b.headers.get('X-Cache')).toBe('HIT');
    expect(await b.text()).toBe('<p>hola</p>');
    expect(render).toHaveBeenCalledTimes(1);
    t = 1001;
    await servePage('/k', 1000, render, () => t);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('no guarda lo que no es público ni lo que fija cookies', async () => {
    const priv = vi.fn(async () => page('x', 'private, no-store'));
    await servePage('/p', 1000, priv);
    await servePage('/p', 1000, priv);
    expect(priv).toHaveBeenCalledTimes(2);
    const cookie = vi.fn(async () => page('x', undefined, { 'Set-Cookie': 'a=1' }));
    await servePage('/c', 1000, cookie);
    await servePage('/c', 1000, cookie);
    expect(cookie).toHaveBeenCalledTimes(2);
    expect(_stats().keys).toBe(0);
  });

  it('junta en un solo render las peticiones simultáneas', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const render = vi.fn(async () => {
      await gate;
      return page('<p>uno</p>');
    });
    const all = Promise.all([1, 2, 3].map(() => servePage('/s', 1000, render)));
    release();
    const res = await all;
    expect(render).toHaveBeenCalledTimes(1);
    for (const r of res) expect(await r.text()).toBe('<p>uno</p>');
  });

  it('no deja pasar el X-Cache guardado de una respuesta a otra', async () => {
    await servePage('/h', 1000, async () => page('x', undefined, { 'X-Cache': 'MISS' }));
    const r = await servePage('/h', 1000, async () => page('y'));
    expect(r.headers.get('X-Cache')).toBe('HIT');
    expect(r.headers.get('content-type')).toBe('text/html');
  });
});
