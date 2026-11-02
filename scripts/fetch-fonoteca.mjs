/**
 * Completa src/data/fonoteca.json:
 *  - Grabaciones y partituras: comprueba que cada ítem de Internet Archive sigue
 *    siendo audio o texto y baja UNA vez su miniatura a public/fonoteca/<id>.jpg.
 *  - Compositores: su id de persona en TMDB y su retrato.
 *  - Películas (de compositores e hitos): id de TMDB, cartel y las traducciones
 *    del título, como en el atlas (scripts/fetch-movement-posters.mjs).
 * La página es estática: no puede pedir nada en cada visita. Solo build-time; la
 * clave se lee de TMDB_API_KEY y nunca llega al cliente.
 *
 *   node --env-file=.env scripts/fetch-fonoteca.mjs [--force]
 *
 * Lo que ya tiene id no se vuelve a buscar (así se respeta una corrección a mano);
 * con --force se busca todo de nuevo. Revisa la salida: la búsqueda por nombre o
 * por título y año puede equivocarse.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa: node --env-file=.env scripts/fetch-fonoteca.mjs)');
  process.exit(1);
}
const FORCE = process.argv.includes('--force');
const LANGS = ['es', 'en', 'gl', 'eu', 'ca'];
const UA = 'CineArchive/1.0 (fonoteca thumbnails)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true).catch(() => false);

async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function findFilm(title, year) {
  for (const y of [year, year - 1, year + 1]) {
    const r = await tmdb('/search/movie', { query: title, primary_release_year: y, language: 'en-US' });
    if (r.results?.length) return r.results[0];
  }
  return null;
}

async function completeFilm(film, label) {
  if (film.tmdbId && !FORCE) return;
  const hit = await findFilm(film.title, film.year);
  if (!hit) return console.warn(`✗ ${label} · ${film.title} (${film.year}): sin resultados`);
  const full = await tmdb(`/movie/${hit.id}`, { append_to_response: 'translations' });
  film.tmdbId = full.id;
  film.poster = full.poster_path ?? null;
  film.original_title = full.original_title;
  film.original_language = full.original_language;
  // Solo lo que necesita titlesFrom (lib/titles.ts) para los cinco idiomas.
  film.translations = (full.translations?.translations ?? [])
    .filter((t) => LANGS.includes(t.iso_639_1))
    .map((t) => ({ iso_639_1: t.iso_639_1, iso_3166_1: t.iso_3166_1, data: { title: t.data?.title ?? '' } }));
  console.log(`✓ ${label} · ${film.title} (${film.year}) → ${full.original_title} (${(full.release_date ?? '').slice(0, 4)}) #${full.id}`);
  await sleep(60);
}

async function completeComposer(c) {
  if (c.tmdbId && !FORCE) return;
  const r = await tmdb('/search/person', { query: c.name });
  // Entre homónimos, el que trabaja en «Sound» (así clasifica TMDB a los compositores).
  const hit = r.results?.find((p) => p.known_for_department === 'Sound') ?? r.results?.[0];
  if (!hit) return console.warn(`✗ compositor · ${c.name}: sin resultados`);
  c.tmdbId = hit.id;
  c.profile = hit.profile_path ?? null;
  console.log(`✓ compositor · ${c.name} → ${hit.name} (${hit.known_for_department}) #${hit.id}`);
  await sleep(60);
}

async function thumbnail(id, mediatype, outDir) {
  const meta = await fetch(`https://archive.org/metadata/${id}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20_000) })
    .then((r) => r.json())
    .catch(() => null);
  if (meta?.metadata?.mediatype !== mediatype) console.warn(`⚠ ${id}: ya no es «${mediatype}» en archive.org`);
  const dest = join(outDir, `${id}.jpg`);
  if (!FORCE && (await exists(dest))) return;
  const res = await fetch(`https://archive.org/services/img/${id}`, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return console.warn(`✗ miniatura ${id}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`✓ miniatura ${id} (${buf.byteLength} bytes)`);
  await sleep(350);
}

async function main() {
  const file = join(root, 'src/data/fonoteca.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  const outDir = join(root, 'public', 'fonoteca');
  await mkdir(outDir, { recursive: true });

  for (const r of data.recordings) await thumbnail(r.id, 'audio', outDir);
  for (const s of data.scores) await thumbnail(s.id, 'texts', outDir);
  for (const c of data.composers) {
    await completeComposer(c);
    for (const f of c.films) await completeFilm(f, c.name);
  }
  for (const m of data.milestones) await completeFilm(m.film, `hito ${m.year}`);

  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

main();
