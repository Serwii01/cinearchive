/**
 * Prepara el tema y el plugin del blog (blog.cinearchive.es) y los empaqueta
 * en wordpress/dist/*.zip, listos para subir en WordPress (Apariencia → Temas
 * → Añadir → Subir, y Plugins → Añadir → Subir).
 *
 * Lo que genera, para que el blog no se separe de la web:
 *  - inc/strings.php del tema: los textos de la interfaz salen del mismo
 *    diccionario que la web (src/i18n/ui.ts), en los cinco idiomas.
 *  - assets/fonts del tema: las mismas fuentes autoalojadas que la web.
 *
 * El plugin lleva además import/articles.json: los artículos que tenía la web
 * antes de mudarse al blog, para el importador. Ese fichero ya no se genera:
 * desde la mudanza, los artículos viven en WordPress.
 *
 *   npm run wp:build
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ui, languages } from '../src/i18n/ui.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wp = join(root, 'wordpress');
const theme = join(wp, 'cinearchive-theme');
const plugin = join(wp, 'cinearchive-blog');
const LANGS = Object.keys(languages);

// --- Textos del tema -------------------------------------------------------
// Claves que se reutilizan tal cual del diccionario de la web.
const REUSE = [
  'site.title', 'site.tagline', 'site.description',
  'nav.home', 'nav.archive', 'nav.films', 'nav.discover', 'nav.cinema', 'nav.library', 'nav.about',
  'nav.info', 'nav.privacy', 'nav.terms',
  'articles.title', 'articles.intro', 'articles.read', 'articles.back', 'articles.by', 'articles.related',
  'articles.more', 'articles.gallery', 'articles.short', 'dossiers.sources',
  'footer.rights', 'lang.switch', 'search.title', 'theme.toggle',
  'error.title', 'error.text', 'error.home',
];
// Las pocas que la web no necesita y el blog sí.
const EXTRA = {
  'blog.newer': { es: 'Más recientes', en: 'Newer', gl: 'Máis recentes', eu: 'Berriagoak', ca: 'Més recents' },
  'blog.older': { es: 'Anteriores', en: 'Older', gl: 'Anteriores', eu: 'Zaharragoak', ca: 'Anteriors' },
  'blog.empty': { es: 'Todavía no hay artículos.', en: 'There are no articles yet.', gl: 'Aínda non hai artigos.', eu: 'Oraindik ez dago artikulurik.', ca: 'Encara no hi ha articles.' },
  'blog.results': { es: 'Resultados de la búsqueda', en: 'Search results', gl: 'Resultados da busca', eu: 'Bilaketaren emaitzak', ca: 'Resultats de la cerca' },
  'blog.searchPlaceholder': { es: 'Buscar en los artículos…', en: 'Search the articles…', gl: 'Buscar nos artigos…', eu: 'Bilatu artikuluetan…', ca: 'Cerca als articles…' },
  'blog.toArchive': { es: 'Ir al archivo', en: 'Go to the archive', gl: 'Ir ao arquivo', eu: 'Joan artxibora', ca: 'Anar a l’arxiu' },
  'blog.menu': { es: 'Menú', en: 'Menu', gl: 'Menú', eu: 'Menua', ca: 'Menú' },
};

const php = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
let out = `<?php
/**
 * Textos de la interfaz del blog en los cinco idiomas.
 *
 * GENERADO por scripts/build-wordpress.mjs a partir de src/i18n/ui.ts: no se
 * edita a mano. Para cambiar un texto, cámbialo en la web y vuelve a generar.
 */

defined( 'ABSPATH' ) || exit;

return array(
`;
for (const lang of LANGS) {
  out += `\t${php(lang)} => array(\n`;
  for (const k of REUSE) {
    const v = ui[lang][k] ?? ui.es[k];
    if (v == null) throw new Error(`Falta la clave ${k} en ui.ts`);
    out += `\t\t${php(k)} => ${php(v)},\n`;
  }
  for (const [k, t] of Object.entries(EXTRA)) out += `\t\t${php(k)} => ${php(t[lang])},\n`;
  out += `\t),\n`;
}
out += `);\n`;
await mkdir(join(theme, 'inc'), { recursive: true });
await writeFile(join(theme, 'inc/strings.php'), out);

// --- Fuentes ---------------------------------------------------------------
const fonts = join(theme, 'assets/fonts');
await mkdir(fonts, { recursive: true });
const nm = join(root, 'node_modules');
for (const [from, to] of [
  ['@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2', 'eb-garamond.woff2'],
  ['@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-italic.woff2', 'eb-garamond-italic.woff2'],
  ['@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2', 'geist-400.woff2'],
  ['@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff2', 'geist-500.woff2'],
  ['@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff2', 'geist-600.woff2'],
  ['@fontsource/space-mono/files/space-mono-latin-400-normal.woff2', 'space-mono-400.woff2'],
  ['@fontsource/space-mono/files/space-mono-latin-700-normal.woff2', 'space-mono-700.woff2'],
]) {
  await copyFile(join(nm, from), join(fonts, to));
}

// --- Zips ------------------------------------------------------------------
const dist = join(wp, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const name of ['cinearchive-theme', 'cinearchive-blog']) {
  execFileSync('zip', ['-qr', join(dist, `${name}.zip`), name, '-x', '*.DS_Store'], { cwd: wp });
}

const articles = JSON.parse(await readFile(join(plugin, 'import/articles.json'), 'utf8'));
const versiones = articles.reduce((n, a) => n + Object.keys(a.copy).length, 0);
console.log(`Textos: ${REUSE.length + Object.keys(EXTRA).length} claves × ${LANGS.length} idiomas`);
console.log(`Artículos para importar: ${articles.length} (${versiones} versiones)`);
console.log(`Listo: wordpress/dist/cinearchive-theme.zip y wordpress/dist/cinearchive-blog.zip`);
