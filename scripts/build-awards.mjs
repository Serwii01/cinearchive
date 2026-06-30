/**
 * Genera src/data/awards.json con el palmarés COMPLETO (desde la primera edición)
 * del Óscar a mejor película, la Palma de Oro y el Goya a mejor película.
 *
 * Fuentes:
 *  - Óscar y Palma: Wikidata (ganadores + año + id de TMDB).
 *  - Goya: lista de la Wikipedia en español (Wikidata la tiene incompleta).
 * Los ids de TMDB que falten se resuelven contra TMDB (por id de IMDb o por
 * búsqueda título+año). Build-time; TMDB_API_KEY nunca llega al cliente.
 *
 *   node --env-file=.env scripts/build-awards.mjs
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.TMDB_API_KEY;
const UA = 'CineArchive/1.0 (awards build; sfmrbb@gmail.com)';
const MAX_YEAR = 2026;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const META = {
  oscar: {
    name_es: 'Óscar a la mejor película', name_en: 'Academy Award for Best Picture',
    note_es: 'Por año de ceremonia, desde la primera edición (1929). La película suele ser del año anterior.',
    note_en: 'By ceremony year, since the first edition (1929). The film is usually from the previous year.',
  },
  cannes: {
    name_es: 'Palma de Oro · Festival de Cannes', name_en: "Palme d'Or · Cannes Film Festival",
    note_es: 'Máximo galardón del Festival de Cannes, por año. Algunos años no se concedió.',
    note_en: 'The Cannes Film Festival’s top prize, by year. In some years it was not awarded.',
  },
  goya: {
    name_es: 'Goya a la mejor película', name_en: 'Goya Award for Best Film',
    note_es: 'Por año de ceremonia, desde la primera edición (1987). Premia el cine español del año anterior.',
    note_en: 'By ceremony year, since the first edition (1987). Honours the previous year’s Spanish cinema.',
  },
};

// ---------- TMDB ----------
async function tmdbFromImdb(imdb) {
  if (!KEY || !imdb) return null;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/find/${imdb}?api_key=${KEY}&external_source=imdb_id`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return (await res.json()).movie_results?.[0]?.id ?? null;
  } catch { return null; }
}
async function tmdbSearch(title, year) {
  if (!KEY) return null;
  try {
    const u = new URL('https://api.themoviedb.org/3/search/movie');
    u.searchParams.set('api_key', KEY);
    u.searchParams.set('query', title);
    u.searchParams.set('language', 'es-ES');
    if (year) u.searchParams.set('year', String(year));
    u.searchParams.set('include_adult', 'false');
    const res = await fetch(u, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return (await res.json()).results?.[0]?.id ?? null;
  } catch { return null; }
}

// ---------- Óscar / Palma: Wikidata ----------
async function fromWikidata(qid, titleLang) {
  const query = `SELECT ?film ?year ?tmdb ?imdb ?titleEn ?titleEs ?dir WHERE {
    ?film p:P166 ?st. ?st ps:P166 wd:${qid}.
    ?film wdt:P31/wdt:P279* wd:Q11424.
    OPTIONAL { ?st pq:P585 ?d. }
    OPTIONAL { ?film wdt:P4947 ?tmdb. }
    OPTIONAL { ?film wdt:P345 ?imdb. }
    OPTIONAL { ?film wdt:P57 ?dirItem. ?dirItem rdfs:label ?dir. FILTER(LANG(?dir)="en") }
    OPTIONAL { ?film rdfs:label ?titleEn. FILTER(LANG(?titleEn)="en") }
    OPTIONAL { ?film rdfs:label ?titleEs. FILTER(LANG(?titleEs)="es") }
    BIND(YEAR(?d) AS ?year)
    FILTER(BOUND(?year) && ?year <= ${MAX_YEAR})
  } ORDER BY DESC(?year)`;
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  const rows = (await res.json()).results.bindings;
  const byKey = new Map();
  for (const r of rows) {
    const k = `${r.film.value}@${r.year.value}`;
    if (byKey.has(k)) continue;
    const titleEs = r.titleEs?.value, titleEn = r.titleEn?.value;
    byKey.set(k, {
      year: Number(r.year.value),
      title: (titleLang === 'es' ? titleEs || titleEn : titleEn || titleEs) || '—',
      director: r.dir?.value,
      tmdbId: r.tmdb ? Number(r.tmdb.value) : undefined,
      imdb: r.imdb?.value,
    });
  }
  const winners = [...byKey.values()].filter((w) => w.title !== '—');
  for (const w of winners) {
    if (!w.tmdbId && w.imdb) { w.tmdbId = await tmdbFromImdb(w.imdb); await sleep(40); }
  }
  return winners;
}

// ---------- Goya: Wikipedia (es) ----------
async function fromWikipediaGoya() {
  const page = encodeURIComponent('Premio Goya a la mejor película');
  const res = await fetch(`https://es.wikipedia.org/w/api.php?action=parse&page=${page}&prop=wikitext&format=json&redirects=1`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const w = (await res.json()).parse.wikitext['*'];
  // Cabeceras de edición de la tabla: ... colspan="8" ... [[Anexo:.. edición de los Premios Goya|.. - 1986]]
  const headerRe = /colspan="8"[^\n]*?\[\[Anexo:[^\]|]*edición de los Premios Goya\|[^\]]*?(\d{4})\]\]/g;
  const heads = [...w.matchAll(headerRe)].map((m) => ({ filmYear: Number(m[1]), idx: m.index }));
  const clean = (s) => (s.includes('|') ? s.split('|')[1] : s).trim();
  const winners = [];
  for (let i = 0; i < heads.length; i++) {
    const chunk = w.slice(heads[i].idx, i + 1 < heads.length ? heads[i + 1].idx : heads[i].idx + 2000);
    // La primera celda (título y director) va hasta la columna de productora (|style=).
    const cut = chunk.indexOf('|style=');
    const cell = (cut > 0 ? chunk.slice(0, cut) : chunk.slice(0, 600)).replace(/\[\[Anexo:[^\]]*\]\]/g, '');
    // Los directores están en <small>(de [[..]])</small>; los títulos, fuera de <small>.
    // (Algunas filas dejan el <small> sin cerrar, de ahí el segundo replace.)
    const noSmall = cell.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<small>[\s\S]*$/g, '');
    const films = [...noSmall.matchAll(/\[\[([^\]]+)\]\]/g)]
      .map((m) => clean(m[1]))
      .filter((t) => t && !/^(Archivo|File|Categoría|Imagen):/i.test(t));
    const dirs = [...cell.matchAll(/<small>\s*\(de \[\[([^\]]+?)\]\]/g)].map((m) => clean(m[1]));
    films.forEach((title, idx) => // varios títulos = ex aequo (empate)
      winners.push({ filmYear: heads[i].filmYear, year: heads[i].filmYear + 1, title, director: dirs[idx] }),
    );
  }
  // Resolver tmdbId por búsqueda título+año.
  for (const win of winners) {
    win.tmdbId = await tmdbSearch(win.title, win.filmYear);
    await sleep(60);
  }
  return winners;
}

function pack(key, winners) {
  winners.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const list = winners.map((w) => ({ year: w.year, title: w.title, ...(w.director ? { director: w.director } : {}), ...(w.tmdbId ? { tmdbId: w.tmdbId } : {}) }));
  console.log(`${key}: ${list.length} ganadoras · ${list.filter((w) => w.tmdbId).length} con ficha`);
  return { key, ...META[key], winners: list };
}

async function main() {
  const oscar = pack('oscar', await fromWikidata('Q102427', 'en'));
  const cannes = pack('cannes', await fromWikidata('Q179808', 'en'));
  const goya = pack('goya', await fromWikipediaGoya());
  await writeFile(
    join(root, 'src', 'data', 'awards.json'),
    JSON.stringify({ note: "Palmarés completo generado por scripts/build-awards.mjs (Wikidata + Wikipedia + TMDB). 'year' = año de ceremonia/festival.", awards: [oscar, cannes, goya] }, null, 2) + '\n',
  );
  console.log('awards.json escrito.');
}

main();
