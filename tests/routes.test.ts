import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TOP_LEVEL_SECTIONS, isKnownRoute, legacyDefaultLangRedirect } from '../src/lib/routes';
import { languages, localizePath } from '../src/i18n/ui';

const LANGS = Object.keys(languages);
const PAGES = join(process.cwd(), 'src', 'pages', '[...lang]');

describe('TOP_LEVEL_SECTIONS', () => {
  it('coincide exactamente con la carpeta de páginas', () => {
    // Si falla, es que se ha añadido (o quitado) una página y hay que tocar
    // src/lib/routes.ts. Sin esta comprobación la lista se queda desfasada en
    // silencio y la sección nueva devuelve 404 en producción.
    const enDisco = readdirSync(PAGES, { withFileTypes: true })
      .map((e) => (e.isDirectory() ? e.name : e.name.replace(/\.(astro|ts)$/, '')))
      .filter((n) => n !== 'index')
      .sort();
    expect([...TOP_LEVEL_SECTIONS].sort()).toEqual(enDisco);
  });

  it('no incluye "index": la portada es la ruta vacía', () => {
    expect(TOP_LEVEL_SECTIONS.has('index')).toBe(false);
  });

  it('deja pasar las páginas de la raíz de src/pages, que no se traducen', () => {
    // Van fuera de [...lang]. Cuando la guarda no las conocía, /404 se
    // reescribía a sí mismo hasta que Astro cortaba el bucle con un 508, y ese
    // 508 acababa dentro del robots.txt prerenderizado.
    const enRaiz = readdirSync(join(process.cwd(), 'src', 'pages'), { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name.replace(/\.(astro|ts)$/, ''));
    for (const nombre of enRaiz) {
      expect(isKnownRoute(`/${nombre}`, LANGS), nombre).toBe(true);
    }
  });
});

describe('isKnownRoute', () => {
  it('acepta la portada de cada idioma', () => {
    for (const lang of LANGS) expect(isKnownRoute(localizePath(lang), LANGS)).toBe(true);
  });

  it('acepta las secciones en castellano, sin prefijo', () => {
    for (const p of ['/cines', '/films', '/discover', '/archive']) {
      expect(isKnownRoute(p, LANGS), p).toBe(true);
    }
  });

  it('acepta las mismas secciones con prefijo de idioma', () => {
    for (const lang of LANGS) {
      expect(isKnownRoute(localizePath(lang, 'cines'), LANGS), lang).toBe(true);
    }
  });

  it('no valida más allá del primer segmento: ids y slugs pasan', () => {
    expect(isKnownRoute('/film/donnie-darko-141', LANGS)).toBe(true);
    expect(isKnownRoute('/en/u/sergio/review/141', LANGS)).toBe(true);
    expect(isKnownRoute('/person/1234', LANGS)).toBe(true);
  });

  it('rechaza un primer segmento inventado', () => {
    // `[...lang]` casa con cualquier cosa: sin esta guarda, /pepe renderizaría
    // la portada en español y /pepe/juan también.
    expect(isKnownRoute('/pepe', LANGS)).toBe(false);
    expect(isKnownRoute('/pepe/juan', LANGS)).toBe(false);
    expect(isKnownRoute('/en/pepe/juan', LANGS)).toBe(false);
  });

  it('rechaza un idioma que no ofrecemos', () => {
    expect(isKnownRoute('/fr/films', LANGS)).toBe(false);
    expect(isKnownRoute('/pt', LANGS)).toBe(false);
  });

  it('deja pasar los endpoints de /api que existen', () => {
    const familias = readdirSync(join(process.cwd(), 'src', 'pages', 'api'), {
      withFileTypes: true,
    }).map((e) => (e.isDirectory() ? e.name : e.name.replace(/\.ts$/, '')));
    for (const f of familias) expect(isKnownRoute(`/api/${f}`, LANGS), f).toBe(true);
    expect(isKnownRoute('/api/cinemas', LANGS)).toBe(true);
    expect(isKnownRoute('/api/films/141/watch', LANGS)).toBe(true);
  });

  it('rechaza un /api inventado', () => {
    // Sin esto, /[...lang] se lo tragaba y devolvía la PORTADA con un 200.
    expect(isKnownRoute('/api/inventado', LANGS)).toBe(false);
    expect(isKnownRoute('/api', LANGS)).toBe(false);
  });
});

describe('legacyDefaultLangRedirect', () => {
  it('manda /es a la raíz', () => {
    expect(legacyDefaultLangRedirect('/es', '', 'es')).toBe('/');
  });

  it('quita el prefijo del resto de rutas', () => {
    expect(legacyDefaultLangRedirect('/es/cines', '', 'es')).toBe('/cines');
    expect(legacyDefaultLangRedirect('/es/film/donnie-darko-141', '', 'es')).toBe(
      '/film/donnie-darko-141',
    );
  });

  it('conserva la cadena de consulta', () => {
    // Hay enlaces compartidos del tipo /es/discover?genre=27 que tienen que
    // seguir llevando al mismo listado.
    expect(legacyDefaultLangRedirect('/es/discover', '?genre=27&year=1980', 'es')).toBe(
      '/discover?genre=27&year=1980',
    );
  });

  it('no toca los demás idiomas', () => {
    for (const lang of LANGS.filter((l) => l !== 'es')) {
      expect(legacyDefaultLangRedirect(`/${lang}/cines`, '', 'es'), lang).toBeNull();
    }
  });

  it('no toca las rutas que ya vienen sin prefijo', () => {
    expect(legacyDefaultLangRedirect('/cines', '', 'es')).toBeNull();
    expect(legacyDefaultLangRedirect('/', '', 'es')).toBeNull();
  });

  it('no muerde un segmento que solo empiece por "es"', () => {
    // /estudios no es /es/tudios.
    expect(legacyDefaultLangRedirect('/estudios', '', 'es')).toBeNull();
    expect(legacyDefaultLangRedirect('/espana', '', 'es')).toBeNull();
  });

  it('lo que redirige sigue siendo una ruta válida', () => {
    for (const p of ['/es', '/es/cines', '/es/films', '/es/archive']) {
      const destino = legacyDefaultLangRedirect(p, '', 'es');
      expect(destino, p).not.toBeNull();
      expect(isKnownRoute(destino!, LANGS), destino!).toBe(true);
    }
  });
});
