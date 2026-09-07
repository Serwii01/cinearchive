import { describe, it, expect } from 'vitest';
import { cachePolicy, sharedTtl } from '../src/lib/httpcache';

/** Respuesta html de éxito, que es el único caso que la política toca. */
const html = (status = 200) =>
  new Response('<!doctype html><p>hola', {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

const cc = (r: Response) => r.headers.get('Cache-Control');

describe('sharedTtl', () => {
  it('reconoce las rutas públicas exactas y las de prefijo', () => {
    expect(sharedTtl('')).toBe(600); // portada
    expect(sharedTtl('/discover')).toBe(600);
    expect(sharedTtl('/cines')).toBe(1800);
    expect(sharedTtl('/film/ciudadano-kane-15')).toBe(3600);
    expect(sharedTtl('/person/1234')).toBe(3600);
  });

  it('la portada se reconoce también como "/"', () => {
    // Con el castellano en la raíz, stripLangPrefix devuelve '/' y no ''. Si
    // esto se rompe, la portada pierde el Cache-Control y cada visita anónima
    // vuelve a consultar la BD y TMDB.
    expect(sharedTtl('/')).toBe(600);
  });

  it('no lista rutas que en realidad son redirecciones', () => {
    // /awards, /glossary, /timeline y /library redirigen a secciones de /archive:
    // no son páginas y no deben aparecer en la lista (comprobado contra el
    // servidor construido). Cachearlas no rompería nada, pero engaña al que lea.
    for (const p of ['/awards', '/glossary', '/timeline', '/library']) {
      expect(sharedTtl(p)).toBeNull();
    }
    expect(sharedTtl('/archive')).toBe(600);
  });

  it('no cachea nada que no esté en la lista', () => {
    for (const p of ['/account', '/watchlist', '/stats', '/notifications', '/login', '/admin']) {
      expect(sharedTtl(p)).toBeNull();
    }
  });

  it('no cachea las páginas que dependen de quién mira', () => {
    // Perfiles, listas y búsqueda varían según el visor (privacidad, seguidores).
    expect(sharedTtl('/u/sergio')).toBeNull();
    expect(sharedTtl('/u/sergio/review/15')).toBeNull();
    expect(sharedTtl('/lists/abc123')).toBeNull();
    expect(sharedTtl('/search')).toBeNull();
  });

  it('no confunde una ruta privada con un prefijo público', () => {
    expect(sharedTtl('/films-privados')).toBeNull();
    expect(sharedTtl('/filmoteca')).toBeNull();
  });
});

describe('cachePolicy', () => {
  it('cachea en compartido una página pública para visitante anónimo', () => {
    const r = cachePolicy(html(), '/film/metropolis-19', false);
    expect(cc(r)).toBe('public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    expect(r.headers.get('Vary')).toBe('Cookie');
  });

  it('NUNCA cachea en público una página vista con sesión iniciada', () => {
    const r = cachePolicy(html(), '/film/metropolis-19', true);
    expect(cc(r)).toBe('private, no-store');
  });

  it('deja fuera de la caché las páginas con datos personales', () => {
    expect(cc(cachePolicy(html(), '/account', true))).toBe('private, no-store');
    expect(cc(cachePolicy(html(), '/u/sergio', false))).toBe('private, no-store');
  });

  it('no cachea respuestas que no son 200 (redirecciones, errores)', () => {
    for (const status of [301, 302, 404, 500]) {
      expect(cc(cachePolicy(html(status), '/film/algo-1', false))).toBeNull();
    }
  });

  it('no toca lo que no es html (json, imágenes)', () => {
    const json = new Response('{}', { headers: { 'content-type': 'application/json' } });
    expect(cc(cachePolicy(json, '', false))).toBeNull();
  });

  it('respeta un Cache-Control ya puesto a mano', () => {
    const r = new Response('<p>', {
      headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=99' },
    });
    expect(cc(cachePolicy(r, '/film/x-1', false))).toBe('public, max-age=99');
  });

  it('añade Cookie a un Vary existente en lugar de pisarlo', () => {
    const r = new Response('<p>', {
      headers: { 'content-type': 'text/html', vary: 'Accept-Encoding' },
    });
    expect(cachePolicy(r, '/film/x-1', false).headers.get('Vary')).toBe('Accept-Encoding, Cookie');
  });

  it('no duplica Cookie si ya estaba declarado', () => {
    const r = new Response('<p>', {
      headers: { 'content-type': 'text/html', vary: 'Cookie' },
    });
    expect(cachePolicy(r, '/film/x-1', false).headers.get('Vary')).toBe('Cookie');
  });
});
