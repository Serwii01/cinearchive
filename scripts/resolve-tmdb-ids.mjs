/**
 * Resuelve el id de TMDB de cada ficha curada de src/data/films.json (para que la
 * tabla de la Filmoteca sea clicable y enlace a la ficha rica). Reejecutable: salta
 * las que ya tienen tmdbId. Empareja por título + año (verifica el año para no
 * confundir remakes); deja un aviso de las que no encuentre para revisarlas a mano.
 *
 *   node --env-file=.env scripts/resolve-tmdb-ids.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'src', 'data', 'films.json');
const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa: node --env-file=.env scripts/resolve-tmdb-ids.mjs)');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query, year) {
  const u = new URL('https://api.themoviedb.org/3/search/movie');
  u.searchParams.set('api_key', KEY);
  u.searchParams.set('query', query);
  u.searchParams.set('include_adult', 'false');
  if (year) u.searchParams.set('year', String(year));
  const res = await fetch(u);
  if (!res.ok) return [];
  const d = await res.json();
  return d.results ?? [];
}

async function resolve(film) {
  // Intenta por título, luego por título original; prioriza coincidencia de año.
  for (const q of [film.title, film.original_title].filter(Boolean)) {
    let results = await search(q, film.year);
    if (results.length === 0) results = await search(q, null);
    if (results.length === 0) continue;
    const exact = results.find((r) => r.release_date && Number(r.release_date.slice(0, 4)) === film.year);
    const near = results.find((r) => r.release_date && Math.abs(Number(r.release_date.slice(0, 4)) - film.year) <= 1);
    const pick = exact ?? near ?? results[0];
    if (pick) return { id: pick.id, matched: exact ? 'año exacto' : near ? '±1 año' : 'primer resultado' };
  }
  return null;
}

async function main() {
  const data = JSON.parse(await readFile(file, 'utf8'));
  let resolved = 0;
  const failed = [];
  for (const film of data.films) {
    if (film.tmdbId) continue;
    const r = await resolve(film);
    if (r) {
      film.tmdbId = r.id;
      resolved++;
      console.log(`✓ ${film.title} (${film.year}) → ${r.id} [${r.matched}]`);
    } else {
      failed.push(`${film.title} (${film.year})`);
      console.log(`✗ ${film.title} (${film.year})`);
    }
    await sleep(120);
  }
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`\nResueltas: ${resolved} · Sin id: ${failed.length}`);
  if (failed.length) console.log('Revisar a mano:', failed.join(', '));
}

main();
