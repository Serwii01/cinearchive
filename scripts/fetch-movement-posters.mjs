/**
 * Completa las películas de src/data/movements.json (el atlas) con su id de
 * TMDB, su cartel y los datos para sacar el título en cada idioma. En el JSON
 * solo se escriben título y año; aquí se buscan en TMDB. La página es estática:
 * no puede pedir nada a TMDB en cada visita. Solo build-time; la clave se lee de
 * TMDB_API_KEY y nunca llega al cliente.
 *
 *   node --env-file=.env scripts/fetch-movement-posters.mjs [--force]
 *
 * Las películas que ya tienen tmdbId no se vuelven a buscar (así se respeta un id
 * corregido a mano); con --force se busca todo de nuevo. Revisa la salida: la
 * búsqueda por título y año puede equivocarse con títulos muy comunes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa: node --env-file=.env scripts/fetch-movement-posters.mjs)');
  process.exit(1);
}
const FORCE = process.argv.includes('--force');
const LANGS = ['es', 'en', 'gl', 'eu', 'ca'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function find(title, year) {
  const exact = await tmdb('/search/movie', { query: title, primary_release_year: year, language: 'en-US' });
  if (exact.results?.length) return exact.results[0];
  // Hay fichas con el año de estreno comercial y no el de festival: ±1.
  for (const y of [year - 1, year + 1]) {
    const near = await tmdb('/search/movie', { query: title, primary_release_year: y, language: 'en-US' });
    if (near.results?.length) return near.results[0];
  }
  return null;
}

async function main() {
  const file = join(root, 'src/data/movements.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  for (const mv of data.items) {
    for (const film of mv.films) {
      if (film.tmdbId && !FORCE) continue;
      try {
        const hit = await find(film.title, film.year);
        if (!hit) { console.warn(`✗ ${mv.id} · ${film.title} (${film.year}): sin resultados`); continue; }
        const full = await tmdb(`/movie/${hit.id}`, { append_to_response: 'translations' });
        film.tmdbId = full.id;
        film.poster = full.poster_path ?? null;
        film.original_title = full.original_title;
        film.original_language = full.original_language;
        // Solo lo que necesita titlesFrom (lib/titles.ts) para los cinco idiomas.
        film.translations = (full.translations?.translations ?? [])
          .filter((t) => LANGS.includes(t.iso_639_1))
          .map((t) => ({ iso_639_1: t.iso_639_1, iso_3166_1: t.iso_3166_1, data: { title: t.data?.title ?? '' } }));
        console.log(`✓ ${mv.id} · ${film.title} (${film.year}) → ${full.title} (${(full.release_date ?? '').slice(0, 4)}) #${full.id}`);
      } catch (err) {
        console.warn(`✗ ${mv.id} · ${film.title}: ${err.message}`);
      }
      await sleep(60); // amable con TMDB
    }
  }
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

main();
