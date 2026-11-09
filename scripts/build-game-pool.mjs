/**
 * Bolsa de películas para los juegos (/games): las más conocidas de TMDB, con lo
 * que cada juego necesita para no tener que preguntar nada a TMDB al jugar.
 *
 *   node --env-file=.env scripts/build-game-pool.mjs
 *
 * POR QUÉ UNA BOLSA FIJA. Los retos diarios tienen que ser iguales para todo el
 * mundo y de películas que la gente conoce: elegirlos al azar de TMDB daría
 * rarezas, y preguntar a TMDB en cada partida gastaría servidor (el VPS tiene un
 * núcleo). Así el juego solo lee este JSON, que va dentro de la app.
 *
 * QUÉ ENTRA. Las ~1.400 películas con más votos en TMDB, más las ~200 españolas
 * más votadas (el público es sobre todo español y las suyas, por votos, no
 * llegarían). Solo las que tienen al menos dos fondos SIN TEXTO (los de idioma
 * «null» en TMDB): un fondo con el título escrito regalaría la respuesta.
 *
 * QUÉ SE GUARDA de cada una: títulos en los cinco idiomas (para el buscador del
 * juego y la solución), año, nota y votos, géneros, director, dos actores
 * principales (las pistas), cartel y hasta cuatro fondos.
 *
 * OJO: el orden de los retos sale de esta lista (src/lib/games.ts). Si se
 * regenera y cambia, cambian también los retos de los días que vienen; los
 * pasados no importan, porque solo se juega el de hoy.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'data', 'games', 'pool.json');
const KEY = process.env.TMDB_API_KEY;
const LANGS = ['es', 'en', 'gl', 'eu', 'ca'];
const GLOBALES = 1400;
const ESPANOLAS = 200;

if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa node --env-file=.env).');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, intento = 0) {
  const res = await fetch(`https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${KEY}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 429 && intento < 5) {
    await sleep(2000 * (intento + 1));
    return tmdb(path, intento + 1);
  }
  if (!res.ok) throw new Error(`TMDB ${res.status} ${path}`);
  return res.json();
}

/** Ids de /discover ordenados por votos, hasta `cuantas`. */
async function descubrir(filtro, cuantas) {
  const ids = [];
  for (let page = 1; ids.length < cuantas && page <= 500; page++) {
    const d = await tmdb(`/discover/movie?sort_by=vote_count.desc&include_adult=false&page=${page}${filtro}`);
    for (const m of d.results) ids.push(m.id);
    if (page >= d.total_pages) break;
  }
  return ids.slice(0, cuantas);
}

/** Título en un idioma: primero la variante de España, después cualquiera. */
function tituloEn(translations, lang) {
  const de = translations.filter((t) => t.iso_639_1 === lang && t.data?.title?.trim());
  const t = de.find((x) => x.iso_3166_1 === 'ES') ?? de[0];
  return t?.data.title.trim();
}

async function ficha(id) {
  const m = await tmdb(`/movie/${id}?language=es-ES&append_to_response=images,credits,translations&include_image_language=null`);
  const fondos = (m.images?.backdrops ?? [])
    .filter((b) => b.iso_639_1 == null && b.width >= 1280)
    .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
    .slice(0, 4)
    .map((b) => b.file_path);
  if (fondos.length < 2 || !m.release_date || !m.poster_path) return null;
  const tr = m.translations?.translations ?? [];
  const titles = {};
  for (const l of LANGS) {
    const t = tituloEn(tr, l) ?? (l === 'es' ? m.title : undefined);
    if (t) titles[l] = t;
  }
  // En inglés, si no hay traducción es que el original ya es inglés.
  if (!titles.en && m.original_language === 'en') titles.en = m.original_title;
  const dir = (m.credits?.crew ?? []).find((c) => c.job === 'Director');
  return {
    id: m.id,
    titles,
    original: m.original_title,
    year: Number(m.release_date.slice(0, 4)),
    rating: Math.round(m.vote_average * 10) / 10,
    votes: m.vote_count,
    genres: (m.genres ?? []).map((g) => g.id).slice(0, 3),
    director: dir?.name ?? null,
    cast: (m.credits?.cast ?? []).slice(0, 2).map((c) => c.name),
    poster: m.poster_path,
    backdrops: fondos,
  };
}

async function main() {
  console.log('Buscando las más votadas…');
  const globales = await descubrir('&vote_count.gte=1500', GLOBALES);
  const espanolas = await descubrir('&with_original_language=es&with_origin_country=ES&vote_count.gte=150', ESPANOLAS);
  const ids = [...new Set([...globales, ...espanolas])];
  console.log(`${ids.length} candidatas (${globales.length} globales, ${espanolas.length} españolas)`);

  const films = [];
  let i = 0;
  const trabajar = async () => {
    while (i < ids.length) {
      const id = ids[i++];
      try {
        const f = await ficha(id);
        if (f) films.push(f);
      } catch (e) {
        console.warn(`  ${id}: ${e.message}`);
      }
      if (i % 100 === 0) console.log(`  ${i}/${ids.length}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, trabajar));

  // Orden estable (por id) para que el orden de los retos no dependa de qué
  // petición terminó antes.
  films.sort((a, b) => a.id - b.id);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(
    out,
    JSON.stringify({ note: 'Generado por scripts/build-game-pool.mjs. No editar a mano.', generated: new Date().toISOString().slice(0, 10), films }) + '\n',
  );
  console.log(`${films.length} películas en ${out}`);
}

main();
