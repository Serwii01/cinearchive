/**
 * Añade a cada película de src/data/films.json su título en los cinco idiomas
 * de la web (`titles: { es, en, gl, eu, ca }`), sacado de las traducciones de
 * TMDB. La Filmoteca salía con los títulos en inglés en todos los idiomas
 * («The Rules of the Game» en la página en castellano) y su filtro no
 * encontraba «La regla del juego». Solo build-time; la clave se lee de
 * TMDB_API_KEY y nunca llega al cliente.
 *
 *   node --env-file=.env scripts/fetch-film-titles.mjs
 *
 * Un idioma sin traducción en TMDB se queda fuera: la página cae al castellano
 * (gl/eu/ca) o al título de referencia.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa: node --env-file=.env scripts/fetch-film-titles.mjs)');
  process.exit(1);
}

const LANGS = ['es', 'en', 'gl', 'eu', 'ca'];
// Para el castellano y el inglés hay varias regiones: se prefiere la de España
// (y EE. UU./R. Unido) a la de México o Australia.
const REGION_PREF = { es: ['ES', 'MX'], en: ['US', 'GB'] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translations(id) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}/translations`);
  url.searchParams.set('api_key', KEY);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).translations ?? [];
}

export function pickTitles(list) {
  const out = {};
  for (const lang of LANGS) {
    const delIdioma = list.filter((t) => t.iso_639_1 === lang && t.data?.title?.trim());
    if (!delIdioma.length) continue;
    const pref = REGION_PREF[lang] ?? [];
    delIdioma.sort((a, b) => {
      const ia = pref.indexOf(a.iso_3166_1);
      const ib = pref.indexOf(b.iso_3166_1);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    out[lang] = delIdioma[0].data.title.trim();
  }
  return out;
}

async function main() {
  const file = join(root, 'src/data/films.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  let hechas = 0;
  for (const film of data.films) {
    if (!film.tmdbId) continue;
    try {
      const titles = pickTitles(await translations(film.tmdbId));
      if (Object.keys(titles).length) {
        film.titles = titles;
        hechas++;
      }
    } catch (err) {
      console.warn(`  ${film.title}: ${err.message}`);
    }
    await sleep(60); // amable con TMDB
  }
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`Títulos traducidos en ${hechas} de ${data.films.length} películas.`);
}

main();
