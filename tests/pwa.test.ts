import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isKnownRoute } from '../src/lib/routes';
import { pickOfflineLang, isOfflinePath } from '../src/lib/offline';
import { stampVersion, buildFingerprint } from '../integrations/sw-version.mjs';
import { languages, type Lang } from '../src/i18n/ui';

const LANGS = Object.keys(languages) as Lang[];
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
  screenshots?: { src: string; sizes: string; form_factor?: string }[];
  shortcuts?: { name: string; url: string }[];
};
const sw = readFileSync('public/sw.js', 'utf8');

describe('manifiesto', () => {
  it('tiene lo que el navegador exige para ofrecer la instalación', () => {
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12); // lo que cabe bajo el icono
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    expect(manifest.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('declara iconos de 192 y 512, normales y recortables', () => {
    const tiene = (sizes: string, purpose: string) =>
      manifest.icons.some((i) => i.sizes === sizes && (i.purpose ?? 'any').includes(purpose));
    expect(tiene('192x192', 'any')).toBe(true);
    expect(tiene('512x512', 'any')).toBe(true);
    expect(tiene('192x192', 'maskable')).toBe(true);
    expect(tiene('512x512', 'maskable')).toBe(true);
  });

  it('todos los ficheros que declara existen de verdad', () => {
    const rutas = [
      ...manifest.icons.map((i) => i.src),
      ...(manifest.screenshots ?? []).map((s) => s.src),
    ];
    for (const r of rutas) expect(existsSync(`public${r}`), r).toBe(true);
  });

  it('las capturas traen tamaño y formato, que si no Chrome las ignora', () => {
    expect(manifest.screenshots?.length).toBeGreaterThan(0);
    for (const s of manifest.screenshots ?? []) {
      expect(s.sizes, s.src).toMatch(/^\d+x\d+$/);
      expect(['narrow', 'wide']).toContain(s.form_factor);
    }
  });

  it('los accesos directos apuntan a secciones que existen', () => {
    for (const s of manifest.shortcuts ?? []) {
      expect(isKnownRoute(s.url, LANGS), s.url).toBe(true);
    }
  });
});

describe('service worker', () => {
  it('atiende fetch: sin eso, Android no ofrece instalar', () => {
    expect(sw).toMatch(/addEventListener\(\s*'fetch'/);
  });

  it('NUNCA guarda HTML: las navegaciones van a la red', () => {
    // La regla de oro: la web es SSR y una página cacheada enseñaría la sesión
    // de otro momento. Si alguien añade un cache.put para navegaciones, este
    // test tiene que caerse.
    const navegacion = sw.slice(sw.indexOf("mode === 'navigate'"), sw.indexOf('INMUTABLE.test'));
    expect(navegacion).toContain('fetch(request)');
    expect(navegacion).not.toContain('cache.put');
  });

  it('no toca la API', () => {
    expect(sw).toMatch(/startsWith\('\/api\/'\)/);
  });

  it('solo cachea rutas de contenido inmutable', () => {
    const lista = sw.match(/const INMUTABLE = \/\^\\\/\(\?:([^)]+)\)/);
    expect(lista, 'no encuentro la lista de rutas cacheables').not.toBeNull();
    for (const carpeta of lista![1].split('|')) {
      expect(['_astro', 'fonts', 'icons', 'covers']).toContain(carpeta);
    }
  });

  it('la página sin conexión existe y es una ruta conocida', () => {
    expect(sw).toContain("const OFFLINE = '/offline'");
    // Y se guarda con su CSS y su JS: sin ellos no cambia de idioma ni reintenta.
    expect(sw).toMatch(/precargarRecursos\(cache, OFFLINE\)/);
    expect(existsSync('src/pages/offline.astro')).toBe(true);
    expect(isKnownRoute('/offline', LANGS)).toBe(true);
  });
});

describe('versión de la caché', () => {
  it('sw.js trae la línea que el build sustituye', () => {
    expect(stampVersion(sw, 'abc123def456')).toContain("const VERSION = 'abc123def456';");
  });

  it('se queja si alguien cambia el formato de la línea', () => {
    expect(() => stampVersion('const VERSION = "v1";', 'x')).toThrow();
  });

  it('la huella cambia con el contenido y con la lógica del sw.js, no con su versión', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-'));
    try {
      mkdirSync(join(dir, '_astro'));
      writeFileSync(join(dir, '_astro', 'a.css'), 'body{}');
      writeFileSync(join(dir, 'sw.js'), "const VERSION = 'dev';");
      const antes = buildFingerprint(dir);
      expect(antes).toMatch(/^[0-9a-f]{12}$/);

      writeFileSync(join(dir, 'sw.js'), "const VERSION = 'otra';");
      expect(buildFingerprint(dir)).toBe(antes);

      writeFileSync(join(dir, 'sw.js'), "const VERSION = 'otra';\nself.skipWaiting();");
      const conLogicaNueva = buildFingerprint(dir);
      expect(conLogicaNueva).not.toBe(antes);
      writeFileSync(join(dir, 'sw.js'), "const VERSION = 'dev';\nself.skipWaiting();");
      expect(buildFingerprint(dir)).toBe(conLogicaNueva);

      writeFileSync(join(dir, '_astro', 'a.css'), 'body{color:red}');
      expect(buildFingerprint(dir)).not.toBe(antes);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('página sin conexión', () => {
  const ES = 'es' as Lang;
  const idioma = (ruta: string, nav: string[] = []) => pickOfflineLang(ruta, nav, LANGS, ES);

  it('habla el idioma de la página que falló', () => {
    expect(idioma('/en/films', ['es-ES'])).toBe('en');
    expect(idioma('/ca', ['en'])).toBe('ca');
  });

  it('una ruta sin prefijo es castellano, aunque el navegador diga otra cosa', () => {
    expect(idioma('/films', ['en-US'])).toBe('es');
  });

  it('en la portada y en /offline a pelo decide el navegador', () => {
    expect(idioma('/', ['eu-ES', 'es'])).toBe('eu');
    expect(idioma('/offline', ['gl'])).toBe('gl');
    expect(idioma('/offline', ['fr-FR', 'de'])).toBe('es');
  });

  it('el botón de reintentar sabe si está en /offline o en la URL que falló', () => {
    expect(isOfflinePath('/offline')).toBe(true);
    expect(isOfflinePath('/offline/')).toBe(true);
    expect(isOfflinePath('/en/films')).toBe(false);
  });
});

describe('color de la barra', () => {
  it('va antes de theme-init.js, que lo cambia según el tema de la web', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    const meta = layout.indexOf('<meta name="theme-color"');
    expect(meta).toBeGreaterThan(-1);
    expect(meta).toBeLessThan(layout.indexOf('/theme-init.js'));
    // Sin media queries: el tema lo elige la persona, no el sistema.
    expect(layout).not.toMatch(/name="theme-color"[^>]*media=/);
  });
});
