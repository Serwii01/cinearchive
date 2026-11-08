/**
 * Trae de TMDB el título de cada película de Cine abierto en los 5 idiomas y
 * lo guarda en pdfilms.json (`titles`).
 *
 *   node --env-file=.env scripts/fetch-pd-titles.mjs          # solo las que no tienen
 *   node --env-file=.env scripts/fetch-pd-titles.mjs --force  # todas otra vez
 *
 * POR QUÉ. Cada película tenía un solo título para todos los idiomas, y un
 * tercio estaba en inglés: en la web en castellano salía «Battleship Potemkin»,
 * y quien busca «El acorazado Potemkin ver online» no encontraba la página.
 *
 * DE DÓNDE. Las traducciones de TMDB (/movie/{id}/translations), por idioma y,
 * dentro de él, primero la variante de España (es-ES antes que es-MX). Si un
 * idioma no la tiene, no se apunta nada: la web cae en el título de siempre
 * (ver pdTitle en src/lib/pdfilms.ts). En inglés, si la traducción viene vacía
 * es porque la película es inglesa y su título original ya es el inglés.
 *
 * Lo apuntado se puede corregir a mano en el JSON: sin --force no se toca.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'src', 'data', 'pdfilms.json');
const KEY = process.env.TMDB_API_KEY;
const force = process.argv.includes('--force');
const LANGS = ['es', 'en', 'gl', 'eu', 'ca'];

if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa node --env-file=.env).');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${KEY}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} en ${path}`);
  return res.json();
}

/** El título en un idioma: primero la variante de España, luego cualquiera. */
function tituloEn(traducciones, lang) {
  const delIdioma = traducciones.filter((t) => t.iso_639_1 === lang && t.data?.title?.trim());
  const es = delIdioma.find((t) => t.iso_3166_1 === 'ES');
  return (es ?? delIdioma[0])?.data.title.trim() ?? null;
}

const raw = await readFile(file, 'utf8');
const data = JSON.parse(raw);
let cambiadas = 0;
const sinTmdb = [];

for (const f of data.items) {
  if (!f.tmdbId) {
    sinTmdb.push(f.id);
    continue;
  }
  if (f.titles && !force) continue;
  try {
    const [peli, tr] = await Promise.all([tmdb(`/movie/${f.tmdbId}`), tmdb(`/movie/${f.tmdbId}/translations`)]);
    const titles = {};
    for (const l of LANGS) {
      let t = tituloEn(tr.translations ?? [], l);
      if (!t && l === peli.original_language) t = peli.original_title;
      if (t) titles[l] = t;
    }
    f.titles = titles;
    cambiadas++;
    console.log(`✓ ${f.id}: ${LANGS.map((l) => `${l}=${titles[l] ?? '—'}`).join(' · ')}`);
  } catch (e) {
    console.log(`✗ ${f.id}: ${e.message}`);
  }
  await sleep(250);
}

// Mismo formato y saltos de línea que tenía el archivo.
const out = JSON.stringify(data, null, 2) + '\n';
await writeFile(file, raw.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out);
console.log(`\nCon títulos nuevos: ${cambiadas} · Sin TMDB (se quedan con el de siempre): ${sinTmdb.length ? sinTmdb.join(', ') : 'ninguna'}`);
