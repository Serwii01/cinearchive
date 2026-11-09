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
/**
 * Fotograma ilimitado: cuántas semillas ya jugadas recuerda el navegador (y
 * acepta el servidor) para no repetir película. ~2,5 kB en la URL.
 */
export const SEEN_MAX = 250;

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

/**
 * Números romanos de las secuelas: «Rocky II» y «Rocky 2» se escriben de las dos
 * maneras. Ni «i», «v» ni «x» sueltas, que son también palabras e iniciales
 * («V de Vendetta», «X-Men»).
 */
const ROMANOS: Record<string, string> = { ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8', ix: '9' };

/** Texto comparable: minúsculas, sin tildes ni signos, secuelas en cifras. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .map((w) => ROMANOS[w] ?? w)
    .join(' ');
}

export interface TitleEntry {
  id: number | string;
  title: string;
  original?: string;
  /** Otros nombres con los que se la conoce (el de otro idioma), solo para buscar. */
  aka?: string[];
  year: number;
}

/** Distancia de edición (Levenshtein) con tope: más allá de `max` da max + 1. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minFila = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      minFila = Math.min(minFila, cur[j]);
    }
    if (minFila > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Erratas que se perdonan en una palabra según lo larga que es. */
const erratas = (n: number) => (n >= 5 ? 2 : n >= 3 ? 1 : 0);

/**
 * ¿Encaja la palabra escrita `q` con la del título `w`? Si es la última que se
 * está escribiendo (`prefijo`), basta con que la de título empiece por ella,
 * también con erratas (se compara con su principio, con una letra de más o de menos).
 */
function palabraEncaja(q: string, w: string, prefijo: boolean, conErratas: boolean): boolean {
  if (prefijo ? w.startsWith(q) : w === q) return true;
  const tope = conErratas ? erratas(q.length) : 0;
  if (!tope) return false;
  if (editDistance(q, w, tope) <= tope) return true;
  if (!prefijo) return false;
  for (let n = q.length - 1; n <= q.length + 1; n++) if (n < w.length && editDistance(q, w.slice(0, n), tope) <= tope) return true;
  return false;
}

/**
 * Puntuación de un nombre para lo escrito (0 = no encaja):
 *  4  empieza por lo escrito          («star w» → Star Wars)
 *  3  todas las palabras, en cualquier orden («wars star»)
 *  2  lo escrito aparece dentro, también sin espacios («spiderman» → Spider-Man)
 *  1  todas las palabras con alguna errata («pulp fixion», «amelei»)
 */
function puntua(q: string, nombre: string): number {
  if (nombre.startsWith(q)) return 4;
  const qs = q.split(' ');
  const ws = nombre.split(' ');
  // Palabras de una o dos letras («el», «de», «la»): sobran si no están.
  const todas = (conErratas: boolean) =>
    qs.every((p, i) => ws.some((w) => palabraEncaja(p, w, i === qs.length - 1, conErratas)) || (p.length <= 2 && i < qs.length - 1));
  if (todas(false)) return 3;
  if (nombre.replace(/ /g, '').includes(q.replace(/ /g, ''))) return 2;
  if (todas(true)) return 1;
  return 0;
}

/**
 * Nombres ya normalizados de cada película, calculados una vez: se busca en cada
 * tecla entre 1.600 películas, y normalizar en cada búsqueda la hacía cinco
 * veces más lenta (unos 50 ms, que en un móvil se notan).
 */
const normalizados = new WeakMap<TitleEntry, string[]>();
function nombres(e: TitleEntry): string[] {
  let n = normalizados.get(e);
  if (!n) {
    n = [...new Set([e.title, e.original, ...(e.aka ?? [])].filter((x): x is string => !!x).map(normalize))];
    normalizados.set(e, n);
  }
  return n;
}

/**
 * Sugerencias del buscador del juego. Vale el título en el idioma de la web, el
 * original y los otros conocidos («American Psycho» o «Psicópata americano»);
 * perdona el orden de las palabras, los espacios («spiderman»), los números
 * romanos y alguna errata. Primero lo que mejor encaja; a igualdad, lo más corto.
 */
export function matchTitles<T extends TitleEntry>(query: string, entries: T[], limit = 8): T[] {
  const q = normalize(query);
  if (q.replace(/ /g, '').length < 2) return [];
  const puntuadas: { e: T; p: number; len: number }[] = [];
  for (const e of entries) {
    let p = 0;
    for (const n of nombres(e)) {
      p = Math.max(p, puntua(q, n));
      if (p === 4) break;
    }
    if (p) puntuadas.push({ e, p, len: e.title.length });
  }
  return puntuadas
    .sort((a, b) => b.p - a.p || a.len - b.len)
    .slice(0, limit)
    .map((x) => x.e);
}

/**
 * Siguiente rival de «¿Cuál tiene mejor nota?».
 *
 * Antes salía cualquiera de la bolsa: con una campeona de 8,3 casi todas las
 * rivales tenían menos nota y bastaba con elegir siempre la de la izquierda
 * (alguien hizo así una racha de 300). Ahora:
 *  - la mitad de las veces la rival tiene más nota y la otra mitad menos, si
 *    las hay (a 8,7 quedan pocas por encima, pero salen igual de a menudo);
 *  - su nota está cerca de la de la campeona, y más cerca cuanto más larga es
 *    la racha (de 1,5 puntos de margen al empezar a 0,4 a partir de 11 aciertos);
 *  - nunca empata (al menos `minGap` de diferencia) ni repite película.
 */
export function pickChallenger<T extends { id: number; rating: number }>(
  pool: T[],
  champion: T,
  used: Set<number>,
  random: () => number = Math.random,
  streak = 0,
  minGap = 0.2,
): T {
  const margen = Math.max(0.4, 1.5 - 0.1 * streak);
  const r = champion.rating;
  const candidatas = (libres: boolean) => pool.filter((f) => f.id !== champion.id && (!libres || !used.has(f.id)) && Math.abs(f.rating - r) >= minGap - 1e-9);
  let lista = candidatas(true);
  if (!lista.length) lista = candidatas(false);
  const cerca = lista.filter((f) => Math.abs(f.rating - r) <= margen + 1e-9);
  const base = cerca.length ? cerca : lista;
  const arriba = base.filter((f) => f.rating > r);
  const abajo = base.filter((f) => f.rating < r);
  const lado = !arriba.length ? abajo : !abajo.length ? arriba : random() < 0.5 ? arriba : abajo;
  return lado[Math.floor(random() * lado.length)];
}

/**
 * Casillas para compartir, sin emojis (en la web no se usan): ■ fallo,
 * ● acierto, · sin usar.
 */
export function attemptsBoxes(misses: number, solved: boolean, total = MAX_ATTEMPTS): string {
  const usadas = misses + (solved ? 1 : 0);
  return '■'.repeat(misses) + (solved ? '●' : '') + '·'.repeat(Math.max(0, total - usadas));
}
