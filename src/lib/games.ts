/**
 * Lógica de los juegos de /games, sin datos ni red: el día de juego, el azar
 * con semilla (para que el reto sea el mismo para todo el mundo), la elección
 * de cada reto, la comprobación y el texto para compartir. Los datos los pone
 * gamepool.ts (servidor); el navegador usa lo que le toca de aquí.
 */

/** Víspera del primer reto: el 9-11-2026 es el n.º 1. */
export const GAME_EPOCH = '2026-11-08';
export const MAX_ATTEMPTS = 6;
/** Zoom de la imagen en Fotograma según los intentos fallados (0..5). */
export const ZOOM_LEVELS = [5, 3.4, 2.4, 1.7, 1.25, 1] as const;
export const CHRONO_SIZE = 5;
export const CHRONO_ATTEMPTS = 3;

/** Fecha de hoy en Madrid (AAAA-MM-DD): los retos cambian a medianoche de aquí. */
export function madridDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Número de reto de una fecha (AAAA-MM-DD). */
export function dayNumber(date: string): number {
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${GAME_EPOCH}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export const todayNumber = (now: Date = new Date()): number => dayNumber(madridDate(now));

/**
 * Segundos que faltan para la medianoche de Madrid, para que la respuesta del
 * reto del día no se guarde en caché más allá de su día.
 */
export function secondsToMidnight(now: Date = new Date()): number {
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
  const [h, m, s] = hm.split(':').map(Number);
  return Math.max(60, 86_400 - (h * 3600 + m * 60 + s));
}

/** Hash de texto a 32 bits (FNV-1a): convierte una sal en semilla. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generador con semilla (mulberry32): mismo número, misma secuencia. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Permutación de 0..n-1 con semilla (Fisher-Yates). */
export function permutation(n: number, seed: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  const r = rng(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Índice del reto de un día: se recorre una permutación fija de la bolsa, así
 * que no se repite película hasta agotarla (más de cuatro años con la actual).
 */
export function dailyIndex(day: number, n: number, salt: string): number {
  const perm = permutation(n, hashString(salt));
  return perm[(((day - 1) % n) + n) % n];
}

/** Punto de la imagen hacia el que se amplía (en %), lejos de los bordes. */
export function focusPoint(day: number, salt: string): { x: number; y: number } {
  const r = rng(hashString(`${salt}:foco:${day}`));
  return { x: Math.round(30 + r() * 40), y: Math.round(30 + r() * 40) };
}

/**
 * Las cinco de Cronología: años distintos y separados al menos `gap` años, para
 * que el orden no dependa de recordar un mes de estreno.
 */
/**
 * `key` es el número de reto (diario) o la clave secreta de una partida ilimitada.
 */
export function pickChronology<T extends { year: number }>(films: T[], key: number | string, k = CHRONO_SIZE, gap = 3): T[] {
  const perm = permutation(films.length, hashString(`cronologia:${key}`));
  const out: T[] = [];
  for (const i of perm) {
    const f = films[i];
    if (out.every((o) => Math.abs(o.year - f.year) >= gap)) out.push(f);
    if (out.length === k) break;
  }
  return out;
}

/**
 * Qué posiciones de un orden propuesto están bien: `years[i]` es el año de la
 * película que el jugador ha puesto en la posición i.
 */
export function checkOrder(years: number[]): boolean[] {
  const bien = [...years].sort((a, b) => a - b);
  return years.map((y, i) => y === bien[i]);
}

/** Texto comparable: minúsculas, sin tildes ni signos. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export interface TitleEntry {
  id: number | string;
  title: string;
  original?: string;
  year: number;
}

/**
 * Sugerencias del buscador del juego: primero las que empiezan por lo escrito,
 * luego las que lo contienen; vale el título traducido y el original.
 */
export function matchTitles<T extends TitleEntry>(query: string, entries: T[], limit = 8): T[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const empieza: T[] = [];
  const contiene: T[] = [];
  for (const e of entries) {
    const t = normalize(e.title);
    const o = e.original ? normalize(e.original) : '';
    if (t.startsWith(q) || o.startsWith(q) || t.split(' ').some((w) => w.startsWith(q))) empieza.push(e);
    else if (t.includes(q) || o.includes(q)) contiene.push(e);
  }
  return [...empieza, ...contiene].slice(0, limit);
}

/**
 * Siguiente rival de «¿Cuál tiene mejor nota?»: una película de la bolsa que no
 * haya salido y cuya nota se distinga de la del campeón (sin empates).
 */
export function pickChallenger<T extends { id: number; rating: number }>(pool: T[], champion: T, used: Set<number>, random: () => number = Math.random, minGap = 0.2): T {
  const libres = pool.filter((f) => f.id !== champion.id && !used.has(f.id) && Math.abs(f.rating - champion.rating) >= minGap);
  const lista = libres.length ? libres : pool.filter((f) => f.id !== champion.id && Math.abs(f.rating - champion.rating) >= minGap);
  return lista[Math.floor(random() * lista.length)];
}

/**
 * Casillas para compartir, sin emojis (en la web no se usan): ■ fallo,
 * ● acierto, · sin usar.
 */
export function attemptsBoxes(misses: number, solved: boolean, total = MAX_ATTEMPTS): string {
  const usadas = misses + (solved ? 1 : 0);
  return '■'.repeat(misses) + (solved ? '●' : '') + '·'.repeat(Math.max(0, total - usadas));
}
