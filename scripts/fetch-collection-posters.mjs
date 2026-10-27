/**
 * Guarda en src/data/collections.json los carteles de las cuatro primeras
 * películas de cada colección (`posters: [poster_path…]`), para el mosaico de
 * las tarjetas. Las colecciones eran tarjetas de solo texto, y la página es
 * estática: no puede pedir carteles a TMDB en cada visita. Solo build-time; la
 * clave se lee de TMDB_API_KEY y nunca llega al cliente.
 *
 *   node --env-file=.env scripts/fetch-collection-posters.mjs
 *
 * Hay que volver a ejecutarlo si cambian las películas de una colección.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa: node --env-file=.env scripts/fetch-collection-posters.mjs)');
  process.exit(1);
}

const PER_COLLECTION = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function posterOf(id) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
  url.searchParams.set('api_key', KEY);
  url.searchParams.set('language', 'es-ES');
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).poster_path ?? null;
}

async function main() {
  const file = join(root, 'src/data/collections.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  for (const col of data.items) {
    const posters = [];
    // Se recorren en orden hasta reunir cuatro: una película sin cartel no
    // deja un hueco en el mosaico.
    for (const id of col.tmdbIds) {
      if (posters.length === PER_COLLECTION) break;
      try {
        const p = await posterOf(id);
        if (p) posters.push(p);
      } catch (err) {
        console.warn(`  ${col.slug} · ${id}: ${err.message}`);
      }
      await sleep(60);
    }
    col.posters = posters;
    console.log(`${col.slug}: ${posters.length} carteles`);
  }
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

main();
