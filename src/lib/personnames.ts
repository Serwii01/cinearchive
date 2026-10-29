/**
 * Nombres latinos de personas (SOLO SERVIDOR). La elección está en
 * lib/names.ts; aquí se buscan los datos y se recuerdan.
 *
 * Cada persona con nombre no latino cuesta dos peticiones (TMDB con sus alias
 * y su id de Wikidata, y la etiqueta de Wikidata) UNA vez en la vida: el
 * resultado va a person_names, también cuando no hay nombre latino, y además
 * se queda en memoria. Las fichas y listas no esperan a todas: las primeras
 * se resuelven en el momento y el resto en segundo plano, como los títulos
 * por idioma en lib/films.ts.
 */
import { inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { personNames } from '../db/schema';
import { getPersonNaming, type TmdbMovie } from './tmdb';
import { getLabel } from './wikidata';
import { hasNonLatin, latinName } from './names';
import { registerCache } from './cache-registry';

/** id → nombre latino, o null si se buscó y no lo hay. */
const memory = new Map<number, string | null>();
const MEMORY_MAX = 20_000;
/** Cuántas se resuelven en el momento por petición; el resto, después. */
const NOW_DEFAULT = 8;
const CONCURRENCY = 4;

registerCache({
  id: 'person-names',
  label: 'Nombres latinos de personas',
  maxKeys: MEMORY_MAX,
  size: () => memory.size,
  clear: () => memory.clear(),
});

function remember(id: number, latin: string | null): void {
  if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value as number);
  memory.set(id, latin);
}

/** Busca el nombre de una persona fuera y lo guarda. Nunca lanza. */
async function resolveOne(id: number, name: string): Promise<void> {
  let latin: string | null = null;
  let wikidataFailed = false;
  try {
    const p = await getPersonNaming(id);
    const label = p.wikidataId ? await getLabel(p.wikidataId) : null;
    // Con elemento en Wikidata y sin etiqueta, casi siempre es que Wikidata no
    // ha respondido a tiempo: se usa lo que haya, pero sin guardarlo.
    wikidataFailed = !!p.wikidataId && label === null;
    latin = latinName({ name, primaryName: p.name, aliases: p.aliases, wikidataLabel: label });
  } catch {
    // TMDB caído: no se guarda nada, así se vuelve a intentar otro día.
    return;
  }
  // Si falló y no hay nada, ni siquiera en memoria: se reintenta en la siguiente visita.
  if (wikidataFailed && !latin) return;
  remember(id, latin);
  if (wikidataFailed) return;
  try {
    await db
      .insert(personNames)
      .values({ personId: id, latin, checkedAt: new Date() })
      .onConflictDoUpdate({ target: personNames.personId, set: { latin, checkedAt: new Date() } });
  } catch {
    /* sin BD se queda solo en memoria */
  }
}

async function runLimited<T>(items: T[], fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
}

// Las que esperan en segundo plano, para no lanzar dos veces la misma.
const pending = new Set<number>();

/**
 * Nombre latino de cada persona con nombre no latino que se conozca ya o se
 * pueda resolver ahora (las `now` primeras de la lista). Las que falten se
 * resuelven en segundo plano y salen bien en la siguiente visita.
 */
export async function latinNames(
  people: readonly { id: number; name: string }[],
  now = NOW_DEFAULT,
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const todo = new Map<number, string>();
  for (const p of people) if (hasNonLatin(p.name) && !todo.has(p.id)) todo.set(p.id, p.name);
  if (todo.size === 0) return out;

  const unknown = [...todo.keys()].filter((id) => !memory.has(id));
  if (unknown.length) {
    try {
      const rows = await db.select().from(personNames).where(inArray(personNames.personId, unknown));
      for (const r of rows) remember(r.personId, r.latin);
    } catch {
      /* sin BD: se resuelve como si no hubiera nada guardado */
    }
  }

  const missing = [...todo.entries()].filter(([id]) => !memory.has(id) && !pending.has(id));
  const ahora = missing.slice(0, now);
  await runLimited(ahora, ([id, name]) => resolveOne(id, name));
  const luego = missing.slice(now);
  if (luego.length) {
    for (const [id] of luego) pending.add(id);
    void runLimited(luego, async ([id, name]) => {
      await resolveOne(id, name);
      pending.delete(id);
    }).catch(() => {});
  }

  for (const id of todo.keys()) {
    const latin = memory.get(id);
    if (latin) out.set(id, latin);
  }
  return out;
}

/**
 * La ficha con los nombres del reparto y del equipo en alfabeto latino. Se
 * resuelven en el momento la dirección y los ocho primeros del reparto (lo que
 * enseña la ficha); el resto, en segundo plano. Devuelve una copia.
 */
export async function latinizeMovie(m: TmdbMovie): Promise<TmdbMovie> {
  if (!m.credits) return m;
  const directors = m.credits.crew.filter((c) => c.job === 'Director');
  const visible = [...directors, ...m.credits.cast.slice(0, 8)];
  const rest = [...m.credits.cast.slice(8), ...m.credits.crew.filter((c) => c.job !== 'Director')];
  const names = await latinNames([...visible, ...rest], visible.filter((p) => hasNonLatin(p.name)).length);
  if (names.size === 0) return m;
  const fix = <T extends { id: number; name: string }>(p: T): T => (names.has(p.id) ? { ...p, name: names.get(p.id)! } : p);
  return { ...m, credits: { crew: m.credits.crew.map(fix), cast: m.credits.cast.map(fix) } };
}
