/**
 * Busca en la prensa de cine de la época (Media History Digital Library) dónde
 * se habló de cada película de Cine abierto, y deja una lista de CANDIDATOS para
 * revisar a mano. No toca nada de src/.
 *
 *   node scripts/fetch-critica.mjs                    # películas de 1920 a 1929
 *   node scripts/fetch-critica.mjs --desde 1915 --hasta 1935
 *   node scripts/fetch-critica.mjs --solo the-general # una (o varias, con comas)
 *
 * Salida: scripts/.critica/candidatos.json y candidatos.md (no se versionan),
 * con cada página candidata, un fragmento y el enlace a la imagen escaneada para
 * leerla. Lo elegido se escribe a mano en src/data/critica.json.
 *
 * POR QUÉ. Las fichas de Cine abierto se parecían a cualquier otra web de cine.
 * Lo que solo tiene un archivo es lo que se dijo de la película cuando se
 * estrenó: la reseña de Variety, la de Photoplay o la de Cine-Mundial.
 *
 * CÓMO.
 *  1. Lantern (lantern.mediahist.org), el buscador de la MHDL, busca página a
 *     página en toda la colección: el título Y el apellido del director, del año
 *     de estreno a dos después (Caligari llegó a EE. UU. en 1921, Nosferatu en
 *     1929). Una petición por película. Se probó antes número a número con la
 *     búsqueda de Internet Archive y eran miles de peticiones por película.
 *  2. Solo cuentan las cabeceras que publicaban reseñas (REVISTAS, abajo).
 *  3. Para las mejores páginas, la búsqueda de texto de Internet Archive en ese
 *     número da el fragmento que se lee en la lista.
 * Todo se guarda en caché (scripts/.critica/cache): repetirlo no pide nada.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'scripts', '.critica');
const cache = join(out, 'cache');
await mkdir(cache, { recursive: true });

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const DESDE = Number(arg('desde', 1920));
const HASTA = Number(arg('hasta', 1929));
const SOLO = arg('solo', '')?.split(',').filter(Boolean) ?? [];
const POR_PELICULA = 12;

// Cabeceras con reseñas o crítica, de más a menos útiles: las de exhibidores
// reseñan todo lo que se estrena; las de aficionados y Close Up, lo que
// importa; Cine-Mundial y Cinelandia, en castellano.
const REVISTAS = [
  /Film Daily \(/i,
  /^Variety/i,
  /Photoplay/i,
  /Moving Picture World/i,
  /Motion Picture News \(/i,
  /Exhibitors Herald/i,
  /Harrison/i,
  /Close ?up/i,
  /Cine-?Mundial/i,
  /Cinelandia/i,
  /Picture-?Play/i,
  /Motion Picture (Magazine|Classic)/i,
  /Screenland/i,
  /Film Spectator/i,
  /Exhibitors (Daily|Trade) Review/i,
  /Picturegoer|Bioscope|Kinematograph Weekly/i,
  /National Board of Review|Exceptional Photoplays/i,
  /Wid'?s/i,
];
const rango = (titulo) => {
  const i = REVISTAS.findIndex((re) => re.test(titulo ?? ''));
  return i === -1 ? null : i;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3, ms = 40_000) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'user-agent': 'cinearchive-critica/1.0' } });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {}
    await sleep(2000 * (i + 1));
  }
  return null;
}

/** Guarda en disco lo que no sea null: un fallo no queda como «no sale». */
async function cached(name, fn) {
  const f = join(cache, name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 150));
  if (existsSync(f)) return JSON.parse(await readFile(f, 'utf8'));
  const v = await fn();
  if (v !== null && v !== undefined) await writeFile(f, JSON.stringify(v));
  await sleep(500); // con calma: son servicios públicos
  return v;
}

/** Páginas de Lantern: id «<número>_<hoja>». La hoja es la del escaneo, no la del visor (ver hoja()). */
async function lantern(q, y1, y2) {
  return cached(`lantern-${q}-${y1}-${y2}.json`, async () => {
    const pages = [];
    for (let p = 1; p <= 2; p++) {
      const url = `https://lantern.mediahist.org/catalog.json?q=${encodeURIComponent(q)}&range[year][begin]=${y1}&range[year][end]=${y2}&per_page=100&page=${p}`;
      const r = await getJson(url);
      if (!r) return p === 1 ? null : pages;
      for (const d of r.data ?? []) {
        const m = d.id.match(/^(.*)_(\d+)$/);
        if (m) pages.push({ vol: m[1], leaf: Number(m[2]), revista: d.attributes?.title ?? '' });
      }
      if (!r.meta?.pages?.next_page) break;
    }
    return pages;
  });
}

async function metadatos(id) {
  return cached(`meta-${id}.json`, async () => {
    const m = await getJson(`https://archive.org/metadata/${id}`);
    if (!m?.server) return null;
    return { server: m.server, dir: m.dir, date: m.metadata?.date ?? '' };
  });
}

/** Fragmentos de una frase en un número, con su hoja del escaneo. */
async function fragmentos(id, frase) {
  const meta = await metadatos(id);
  if (!meta) return [];
  return (
    (await cached(`in-${id}-${frase}.json`, async () => {
      const url = `https://${meta.server}/fulltext/inside.php?item_id=${id}&doc=${id}&path=${meta.dir}&q=${encodeURIComponent(`"${frase}"`)}`;
      // Un intento y 15 s: en los Variety tarda casi un minuto, y el fragmento
      // solo sirve para ordenar la lista (la crítica se lee en el escaneo).
      const r = await getJson(url, 1, 15_000);
      if (!r) return null;
      return (r.matches ?? []).map((m) => ({
        leaf: Number(m.par?.[0]?.page),
        text: m.text.replace(/<\/?IA_FTS_MATCH>/g, '§').replace(/\s+/g, ' ').trim(),
      }));
    })) ?? []
  );
}

/**
 * De la hoja del escaneo (la que dan Lantern e inside.php) al índice del visor
 * (/page/n…) y al número impreso. No es restar uno: el visor se salta las hojas
 * ocultas (cartulinas, cartas de color), y en un Film Daily de 1927 la hoja 752
 * es la n739. _page_numbers.json lista solo las visibles, en orden.
 */
async function hoja(id, leaf) {
  const lista = await cached(`pn-${id}.json`, async () => {
    const r = await getJson(`https://archive.org/download/${id}/${id}_page_numbers.json`);
    return r?.pages ? r.pages.map((p) => [p.leafNum, p.pageNumber || null]) : [];
  });
  const i = lista.findIndex(([l]) => l === leaf);
  // Sin lista, lo habitual: la hoja 1 es la n0.
  return i === -1 ? { n: leaf - 1, impresa: null } : { n: i, impresa: lista[i][1] ? Number(lista[i][1]) || null : null };
}

const pd = JSON.parse(await readFile(join(root, 'src', 'data', 'pdfilms.json'), 'utf8')).items;
const peliculas = pd.filter((f) => (SOLO.length ? SOLO.includes(f.id) : f.year >= DESDE && f.year <= HASTA));

/** El título con el que se estrenó en EE. UU. (casi siempre el inglés), sin subtítulo. */
const tituloEn = (f) => (f.titles?.en || f.title).replace(/[:!].*$/, '').trim();
/** «F. W. Murnau» → «Murnau»; «Walter Ruttmann» → «Ruttmann». */
const apellido = (f) => (f.director ?? '').split(/\s*[,/]\s*/)[0].split(/\s+/).pop() ?? '';

const resultado = [];
let md = '# Candidatos de «La crítica de su época»\n';
for (const f of peliculas) {
  const titulo = tituloEn(f);
  const ap = apellido(f);
  const q = ap.length > 2 ? `"${titulo}" AND "${ap}"` : `"${titulo}"`;
  const paginas = (await lantern(q, f.year, f.year + 2)) ?? [];
  // Original y castellano, por si la prensa de fuera la llamaba así (Cine-Mundial).
  const otros = [f.original_title, f.titles?.es]
    .filter((t) => t && t !== titulo && /^[\p{Script=Latin}\p{P}\p{N}\s]+$/u.test(t))
    .map((t) => t.replace(/[:!–].*$/, '').trim());
  for (const t of new Set(otros)) {
    for (const p of (await lantern(ap.length > 2 ? `"${t}" AND "${ap}"` : `"${t}"`, f.year, f.year + 2)) ?? []) paginas.push({ ...p, frase: t });
  }

  const vistas = new Set();
  const buenas = paginas
    .map((p) => ({ ...p, rango: rango(p.revista) }))
    .filter((p) => p.rango !== null && !vistas.has(`${p.vol}_${p.leaf}`) && vistas.add(`${p.vol}_${p.leaf}`))
    .sort((a, b) => a.rango - b.rango);

  // Como mucho POR_PELICULA páginas y tres por cabecera: si no, Film Daily
  // (que lo cuenta todo, rodaje incluido) se llevaba la lista entera.
  const porRevista = {};
  const elegidas = buenas.filter((p) => (porRevista[p.rango] = (porRevista[p.rango] ?? 0) + 1) <= 3).slice(0, POR_PELICULA);
  await Promise.all(elegidas.map(async (p) => {
    const frase = p.frase ?? titulo;
    const frag = (await fragmentos(p.vol, frase)).filter((x) => x.leaf === p.leaf);
    Object.assign(p, await hoja(p.vol, p.leaf));
    p.texto = frag.map((x) => x.text).join(' … ').slice(0, 700);
    p.fecha = (await metadatos(p.vol))?.date ?? '';
    p.imagen = `https://archive.org/download/${p.vol}/page/n${p.n}_w1000.jpg`;
    p.visor = `https://archive.org/details/${p.vol}/page/n${p.n}/mode/1up`;
  }));

  resultado.push({ id: f.id, title: f.original_title, year: f.year, director: f.director, total: paginas.length, candidatas: elegidas });
  md += `\n## ${f.id} · ${f.original_title} (${f.year}) · ${f.director} — ${paginas.length} páginas, ${buenas.length} en revistas con reseñas\n`;
  for (const p of elegidas) md += `- **${p.revista}** · ${p.fecha} · n${p.n}${p.impresa ? ` (p. ${p.impresa})` : ''} · ${p.imagen}\n  ${p.texto || '(sin fragmento)'}\n`;
  console.log(`${f.id}: ${paginas.length} páginas, ${buenas.length} en revistas con reseñas`);
  // Se escribe película a película: se puede ir revisando mientras sigue.
  await writeFile(join(out, 'candidatos.md'), md);
}

await writeFile(join(out, 'candidatos.json'), JSON.stringify(resultado, null, 1));
await writeFile(join(out, 'candidatos.md'), md);
console.log('\nCandidatos en scripts/.critica/candidatos.md');
