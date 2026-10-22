import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { esVisita, esPersonaEnPagina } from '../src/lib/visits';

const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const peticion = (over: Partial<Parameters<typeof esVisita>[0]> = {}) =>
  esVisita({ method: 'GET', path: '/', accept: 'text/html,application/xhtml+xml', ua: NAVEGADOR, ...over });

describe('qué cuenta como visita', () => {
  it('una página pedida por un navegador', () => {
    expect(peticion()).toBe(true);
    expect(peticion({ path: '/eu/archive' })).toBe(true);
  });

  it('no cuenta la API ni los recursos', () => {
    expect(peticion({ path: '/api/visits' })).toBe(false);
    // Un .css o una imagen no piden HTML.
    expect(peticion({ path: '/_astro/index.css', accept: 'text/css,*/*;q=0.1' })).toBe(false);
    expect(peticion({ accept: 'image/avif,image/webp,*/*' })).toBe(false);
    expect(peticion({ accept: null })).toBe(false);
  });

  it('no cuenta escrituras ni sondas', () => {
    expect(peticion({ method: 'POST' })).toBe(false);
    expect(peticion({ method: 'HEAD' })).toBe(false);
  });

  it('no cuenta robots', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'facebookexternalhit/1.1',
      'curl/8.4.0',
      'python-requests/2.32',
      'Mozilla/5.0 (compatible; SemrushBot/7)',
      'HeadlessChrome/140.0',
    ]) {
      expect(peticion({ ua }), ua).toBe(false);
    }
    expect(peticion({ ua: null })).toBe(false);
    expect(peticion({ ua: '' })).toBe(false);
  });

  it('no cuenta el panel de administración, que es tráfico de casa', () => {
    expect(peticion({ path: '/admin' })).toBe(false);
    expect(peticion({ path: '/eu/admin' })).toBe(false);
    // Pero una página que empiece por «admin» y no lo sea, sí.
    expect(peticion({ path: '/administracion-de-fincas' })).toBe(true);
  });
});

describe('cifra en /info', () => {
  it('no compila ningún número: se pinta un guion hasta que llega el real', () => {
    const info = readFileSync('src/pages/[...lang]/info.astro', 'utf8');
    expect(info).not.toMatch(/30[.,_]?800/);
    expect(info).toContain('info.visitsUnavailable');
  });
});

describe('páginas prerenderizadas', () => {
  // En producción Node las sirve como ficheros sin pasar por el middleware, así
  // que no se contaban: cine abierto, hemeroteca, biblioteca, info… Avisan
  // desde el navegador y el servidor aplica la misma regla.

  it('la regla del aviso es la misma: página del sitio, persona, no robot', () => {
    expect(esPersonaEnPagina('/cinema/Nosferatu', NAVEGADOR)).toBe(true);
    expect(esPersonaEnPagina('/en/archive/jumpcut59', NAVEGADOR)).toBe(true);
    expect(esPersonaEnPagina('/api/visits', NAVEGADOR)).toBe(false);
    expect(esPersonaEnPagina('/admin', NAVEGADOR)).toBe(false);
    expect(esPersonaEnPagina('https://otro.sitio/', NAVEGADOR)).toBe(false);
    expect(esPersonaEnPagina('/cinema', 'Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(false);
    expect(esPersonaEnPagina('/cinema', null)).toBe(false);
  });

  it('el layout marca las prerenderizadas y manda el aviso', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    expect(layout).toMatch(/data-contar-visita=\{Astro\.isPrerendered/);
    expect(layout).toMatch(/fetch\('\/api\/visits', \{\s*method: 'POST'/);
    // En JSON: Astro rechaza con 403 los POST en texto plano, y sendBeacon con
    // una cadena manda texto plano. Así estuvo sin contar nada.
    expect(layout).not.toMatch(/navigator\.sendBeacon/);
    const api = readFileSync('src/pages/api/visits.ts', 'utf8');
    expect(api).toMatch(/export const POST/);
    expect(api).toContain('contarVisitaEstatica');
  });

  it('todas las páginas prerenderizadas usan el layout que avisa', () => {
    // Si una página prerenderizada no usa BaseLayout, nadie la cuenta.
    const sueltas: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, e.name);
        if (e.isDirectory()) recorrer(ruta);
        else if (ruta.endsWith('.astro')) {
          const src = readFileSync(ruta, 'utf8');
          if (/prerender = true/.test(src) && !src.includes('BaseLayout')) sueltas.push(ruta);
        }
      }
    };
    recorrer('src/pages');
    expect(sueltas).toEqual([]);
  });
});

describe('el HTML compilado', () => {
  it('cada página tiene su <body> (un comentario mal puesto se lo comió una vez)', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    const entre = layout.slice(layout.indexOf('</head>') + 7, layout.indexOf('<body'));
    expect(entre.trim()).toBe('');
  });
});
