/**
 * Resuelve los ids de TMDB de una lista curada de cineastas (búsqueda por nombre)
 * y escribe src/data/figures.json con {id, name, profile_path}. Solo build-time;
 * la clave se lee de TMDB_API_KEY y nunca llega al cliente.
 *
 *   node --env-file=.env scripts/fetch-figures.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Falta TMDB_API_KEY (usa: node --env-file=.env scripts/fetch-figures.mjs)');
  process.exit(1);
}

// Cineastas a destacar (el nombre se usa para la búsqueda en TMDB).
const NAMES = [
  'Akira Kurosawa', 'Yasujiro Ozu', 'Kenji Mizoguchi', 'Ingmar Bergman', 'Andrei Tarkovsky',
  'Federico Fellini', 'Michelangelo Antonioni', 'Alfred Hitchcock', 'Orson Welles', 'Billy Wilder',
  'John Ford', 'Stanley Kubrick', 'Martin Scorsese', 'Francis Ford Coppola', 'Jean-Luc Godard',
  'François Truffaut', 'Agnès Varda', 'Robert Bresson', 'Jean Renoir', 'Luis Buñuel',
  'Pedro Almodóvar', 'Fritz Lang', 'F. W. Murnau', 'Sergei Eisenstein', 'Carl Theodor Dreyer',
  'Wong Kar-wai', 'Hou Hsiao-hsien', 'Edward Yang', 'Abbas Kiarostami', 'Bong Joon-ho',
  'Hayao Miyazaki', 'Satyajit Ray',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(name) {
  const url = new URL('https://api.themoviedb.org/3/search/person');
  url.searchParams.set('api_key', KEY);
  url.searchParams.set('query', name);
  url.searchParams.set('include_adult', 'false');
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Mejor candidato: el de mayor popularidad del departamento de dirección si lo hay.
  const dir = data.results.find((p) => p.known_for_department === 'Directing');
  return dir ?? data.results[0] ?? null;
}

async function main() {
  const out = [];
  for (const name of NAMES) {
    try {
      const p = await search(name);
      if (p) {
        out.push({ id: p.id, name, profile_path: p.profile_path ?? null });
        console.log(`✓ ${name} → ${p.id} (${p.name})`);
      } else {
        console.log(`✗ ${name}: sin resultados`);
      }
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
    }
    await sleep(120);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(
    join(root, 'src', 'data', 'figures.json'),
    JSON.stringify({ note: 'Cineastas destacados. ids de TMDB resueltos por scripts/fetch-figures.mjs.', items: out }, null, 2) + '\n',
  );
  console.log(`\nEscritas ${out.length} figuras en src/data/figures.json`);
}

main();
