import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { esPersonaEnPagina } from '../src/lib/visits';

const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

describe('qué cuenta como visita', () => {
  it('una página del sitio vista por un navegador', () => {
    expect(esPersonaEnPagina('/', NAVEGADOR)).toBe(true);
    expect(esPersonaEnPagina('/cinema/Nosferatu', NAVEGADOR)).toBe(true);
    expect(esPersonaEnPagina('/en/archive/jumpcut59', NAVEGADOR)).toBe(true);
  });

  it('no cuenta la API ni rutas de otro sitio', () => {
    expect(esPersonaEnPagina('/api/visits', NAVEGADOR)).toBe(false);
    expect(esPersonaEnPagina('https://otro.sitio/', NAVEGADOR)).toBe(false);
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
      expect(esPersonaEnPagina('/', ua), ua).toBe(false);
    }
    expect(esPersonaEnPagina('/', null)).toBe(false);
    expect(esPersonaEnPagina('/', '')).toBe(false);
  });

  it('no cuenta el panel de administración, que es tráfico de casa', () => {
    expect(esPersonaEnPagina('/admin', NAVEGADOR)).toBe(false);
    expect(esPersonaEnPagina('/eu/admin', NAVEGADOR)).toBe(false);
    // Pero una página que empiece por «admin» y no lo sea, sí.
    expect(esPersonaEnPagina('/administracion-de-fincas', NAVEGADOR)).toBe(true);
  });
});

describe('solo cuenta quien ejecuta JavaScript', () => {
  // El 5-11-2026 un rastreador que se hacía pasar por Chrome sumaba unas
  // 250.000 visitas al día porque el middleware contaba sin JavaScript.

  it('el middleware ya no cuenta visitas', () => {
    const mw = readFileSync('src/middleware.ts', 'utf8');
    expect(mw).not.toMatch(/contarVisita\(/);
    expect(mw).not.toMatch(/from '\.\/lib\/visits'/);
  });

  it('el layout avisa en todas las páginas, no solo en las prerenderizadas', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    expect(layout).not.toContain('data-contar-visita');
    expect(layout).toMatch(/fetch\('\/api\/visits', \{\s*method: 'POST'/);
    // En JSON: Astro rechaza con 403 los POST en texto plano, y sendBeacon con
    // una cadena manda texto plano. Así estuvo sin contar nada.
    expect(layout).not.toMatch(/navigator\.sendBeacon/);
    const api = readFileSync('src/pages/api/visits.ts', 'utf8');
    expect(api).toMatch(/export const POST/);
    expect(api).toContain('contarVisita(');
  });

  it('todas las páginas que pintan algo usan el layout que avisa', () => {
    // Si una página no usa BaseLayout, nadie la cuenta. Las que solo
    // redirigen no pintan nada. Vale también pintarse con un componente que lo
    // use por dentro (las páginas por tipo y década de Cine abierto usan CinemaGroup).
    const conLayout = (src: string) =>
      src.includes('BaseLayout') ||
      [...src.matchAll(/from '(?:\.\.\/)+components\/(\w+\.astro)'/g)].some((m) =>
        readFileSync(join('src/components', m[1]), 'utf8').includes('BaseLayout'),
      );
    const sueltas: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, e.name);
        if (e.isDirectory()) recorrer(ruta);
        else if (ruta.endsWith('.astro')) {
          const src = readFileSync(ruta, 'utf8');
          if (!conLayout(src) && !/^return Astro\.redirect\(/m.test(src)) sueltas.push(ruta);
        }
      }
    };
    recorrer('src/pages');
    expect(sueltas).toEqual([]);
  });
});

describe('cifra en /info', () => {
  it('no compila ningún número: se pinta un guion hasta que llega el real', () => {
    const info = readFileSync('src/pages/[...lang]/info.astro', 'utf8');
    expect(info).not.toMatch(/30[.,_]?800/);
    expect(info).toContain('info.visitsUnavailable');
  });
});

describe('el HTML compilado', () => {
  it('cada página tiene su <body> (un comentario mal puesto se lo comió una vez)', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    const entre = layout.slice(layout.indexOf('</head>') + 7, layout.indexOf('<body'));
    expect(entre.trim()).toBe('');
  });
});
