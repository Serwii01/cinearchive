/**
 * Guarda en src/data/awards.json el título de cada ganador en los cinco idiomas
 * (`titles`), con la misma regla que la ficha (src/lib/titles.ts).
 *
 * El palmarés trae el título en inglés, y la ficha en castellano lleva el slug
 * del título en castellano: cada enlace del palmarés era una redirección (301)
 * hasta que alguien abría esa ficha y quedaba en films_cache. Con los títulos
 * aquí, el enlace ya es el definitivo. Solo build-time; la clave de TMDB nunca
 * llega al navegador.
 *
 *   npx tsx --env-file=.env scripts/fetch-award-titles.mjs
 *
 * (tsx porque usa src/lib/titles.ts tal cual, sin copiar la regla.)
 * Hay que volver a ejecutarlo al añadir ganadores.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { titlesFrom } from '../src/lib/titles.ts';

const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Falta TMDB_API_KEY (npx tsx --env-file=.env scripts/fetch-award-titles.mjs)');
  process.exit(1);
}
const file = new URL('../src/data/awards.json', import.meta.url);
const raw = await readFile(file, 'utf8');
const data = JSON.parse(raw);
const winners = data.awards.flatMap((a) => a.winners).filter((w) => w.tmdbId);
let i = 0;
let hechos = 0;
const trabajar = async () => {
  while (i < winners.length) {
    const w = winners[i++];
    try {
      const r = await fetch(`https://api.themoviedb.org/3/movie/${w.tmdbId}?api_key=${KEY}&language=es-ES&append_to_response=translations`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const m = await r.json();
      w.titles = titlesFrom(m, m.translations?.translations ?? []);
      hechos++;
    } catch (e) {
      console.warn(`  ${w.tmdbId} (${w.title}): ${e.message}`);
    }
  }
};
await Promise.all(Array.from({ length: 6 }, trabajar));
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(file, JSON.stringify(data, null, 2).replace(/\n/g, nl) + nl);
console.log(`${hechos} de ${winners.length} ganadores con títulos.`);
