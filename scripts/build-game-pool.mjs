/**
 * Bolsa de películas para los juegos (/games): las más conocidas de TMDB, con lo
 * que cada juego necesita para no tener que preguntar nada a TMDB al jugar.
 *
 *   node --env-file=.env scripts/build-game-pool.mjs
 *   node --env-file=.env scripts/build-game-pool.mjs --refrescar   (títulos, sagas y reparto, mismas películas)
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
 * juego y la solución), saga, año, nota y votos, géneros, director, dos actores
 * principales (las pistas), cartel y hasta cuatro fondos.
 *
 * OJO: el orden de los retos sale de esta lista (src/lib/games.ts). Si se
 * regenera y cambia, cambian también los retos de los días que vienen; los
 * pasados no importan, porque solo se juega el de hoy.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'data', 'games', 'pool.json');
/**
 * --salida <ruta>: dónde escribir (por defecto, encima de la bolsa). En el VPS
 * se escribe fuera del repositorio para no dejarle cambios: el siguiente
 * git pull fallaría (scripts/vps/refrescar-juegos.sh).
 */
const iSalida = process.argv.indexOf('--salida');
const destino = iSalida > 0 && process.argv[iSalida + 1] ? process.argv[iSalida + 1] : out;
// Sin comillas: docker run --env-file (scripts/vps/refrescar-juegos.sh) las deja puestas.
const KEY = process.env.TMDB_API_KEY?.trim().replace(/^(["'])(.*)\1$/, '$2');
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

const NO_LATINO = /[^\p{Script=Latin}\p{N}\p{P}\p{S}\s]/u;

/**
 * Títulos en los cinco idiomas, con la misma regla que src/lib/titles.ts (la de
 * las fichas; aquí repetida porque un .mjs no puede importar el .ts):
 *
 *   es  España → México → otro → inglés → original
 *   en  EE. UU. → Reino Unido → otro → original
 *   gl, eu, ca  el suyo (solo si existe)
 *
 * Si la traducción de España existe pero sin título, es que allí se estrenó
 * con el original: «American Psycho», «Spider-Man». Antes se saltaba a la de
 * México («Psicópata americano», «El hombre araña»).
 */
function titulos(m) {
  const tr = m.translations?.translations ?? [];
  const original = m.original_title || m.title;
  const busca = (lang, regiones, vacioEsOriginal = false) => {
    const de = tr.filter((t) => t.iso_639_1 === lang);
    const primera = de.find((t) => t.iso_3166_1 === regiones[0]);
    if (vacioEsOriginal && primera && !primera.data?.title?.trim() && original && !NO_LATINO.test(original)) return original;
    for (const t of [...regiones.map((r) => de.find((x) => x.iso_3166_1 === r)), ...de]) {
      const v = t?.data?.title?.trim();
      if (v) return v;
    }
    return m.original_language === lang ? original : undefined;
  };
  const en = busca('en', ['US', 'GB'], true) ?? original;
  const res = { es: busca('es', ['ES', 'MX'], true) ?? en, en };
  for (const l of ['gl', 'eu', 'ca']) {
    const t = busca(l, ['ES']);
    if (t) res[l] = t;
  }
  return res;
}

/**
 * Los seis primeros del reparto, en el orden de TMDB (el protagonista primero),
 * para el juego Reparto, que los descubre del sexto al primero.
 */
const REPARTO = 6;
const reparto = (m) => (m.credits?.cast ?? []).slice(0, REPARTO).map((c) => c.name);

async function ficha(id) {
  const m = await tmdb(`/movie/${id}?language=es-ES&append_to_response=images,credits,translations&include_image_language=null`);
  const fondos = (m.images?.backdrops ?? [])
    .filter((b) => b.iso_639_1 == null && b.width >= 1280)
    .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
    .slice(0, 4)
    .map((b) => b.file_path);
  if (fondos.length < 2 || !m.release_date || !m.poster_path) return null;
  const dir = (m.credits?.crew ?? []).find((c) => c.job === 'Director');
  return {
    id: m.id,
    titles: titulos(m),
    collection: m.belongs_to_collection?.id ?? null,
    original: m.original_title,
    year: Number(m.release_date.slice(0, 4)),
    rating: Math.round(m.vote_average * 10) / 10,
    votes: m.vote_count,
    genres: (m.genres ?? []).map((g) => g.id).slice(0, 3),
    director: dir?.name ?? null,
    cast: (m.credits?.cast ?? []).slice(0, 2).map((c) => c.name),
    reparto: reparto(m),
    poster: m.poster_path,
    backdrops: fondos,
  };
}

/**
 * --refrescar: vuelve a pedir títulos, saga y reparto de las películas que YA están en
 * la bolsa, sin añadir ni quitar ninguna ni tocar fondos, notas ni orden. Así
 * se corrigen datos sin cambiar los retos de los días que vienen (ni el de hoy).
 */
async function refrescar() {
  const actual = JSON.parse(await readFile(out, 'utf8'));
  let i = 0;
  let cambiados = 0;
  const trabajar = async () => {
    while (i < actual.films.length) {
      const f = actual.films[i++];
      try {
        const m = await tmdb(`/movie/${f.id}?language=es-ES&append_to_response=translations,credits`);
        const titles = titulos(m);
        const collection = m.belongs_to_collection?.id ?? null;
        if (JSON.stringify(titles) !== JSON.stringify(f.titles)) {
          if (titles.es !== f.titles.es) console.log(`  ${f.id}: «${f.titles.es}» → «${titles.es}»`);
          cambiados++;
        }
        f.titles = titles;
        f.collection = collection;
        f.reparto = reparto(m);
      } catch (e) {
        console.warn(`  ${f.id}: ${e.message} (se queda como estaba)`);
      }
      if (i % 200 === 0) console.log(`  ${i}/${actual.films.length}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, trabajar));
  // Mismas claves en el mismo orden en todas: el diff queda limpio.
  actual.films = actual.films.map(({ id, titles, collection, ...resto }) => ({ id, titles, collection, ...resto }));
  await writeFile(destino, JSON.stringify(actual) + '\n');
  const sagas = actual.films.filter((f) => f.collection).length;
  console.log(`${cambiados} con títulos distintos; ${sagas} de ${actual.films.length} son de una saga. Escrito en ${destino}`);
}

async function main() {
  if (process.argv.includes('--refrescar')) return refrescar();
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
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(
    destino,
    JSON.stringify({ note: 'Generado por scripts/build-game-pool.mjs. No editar a mano.', generated: new Date().toISOString().slice(0, 10), films }) + '\n',
  );
  console.log(`${films.length} películas en ${destino}`);
}

main();
