/**
 * Datos de los juegos — SOLO SERVIDOR. La bolsa de películas (data/games/pool.json,
 * de scripts/build-game-pool.mjs) y los fotogramas de Cine abierto
 * (data/games/clasicos.json, de scripts/build-game-frames.mjs).
 *
 * Las soluciones viven aquí y no viajan al navegador hasta que la partida
 * termina: la página del juego es estática y pide a /api/games lo justo.
 *
 * Cada reto se identifica por una referencia: el número del día (reto diario,
 * igual para todos) o una semilla al azar (modo ilimitado). La semilla sola no
 * dice qué película es: el índice sale de un HMAC con un secreto del servidor.
 * Si fuese un simple hash, quien leyera este código podría calcular la
 * solución a partir de la semilla y de la lista de títulos del buscador.
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import poolData from '../data/games/pool.json';
import clasicosData from '../data/games/clasicos.json';
import { GENRES } from '../data/genres';
import { pdFilms, pdTitle, type PdFilm } from './pdfilms';
import { filmSlug } from './slug';
import { localizePath, type Lang } from '../i18n/ui';
import { dailyIndex, focusPoint, hashString, normalize, permutation, pickChronology, CHRONO_SIZE, type TitleEntry } from './games';
export { SEEN_MAX } from './games';

export interface PoolFilm {
  id: number;
  titles: Partial<Record<Lang, string>>;
  original: string;
  year: number;
  rating: number;
  votes: number;
  genres: number[];
  director: string | null;
  cast: string[];
  poster: string;
  backdrops: string[];
  /** Saga de TMDB (belongs_to_collection), para avisar en Fotograma de que se va bien. */
  collection?: number | null;
}

export const POOL = (poolData as { films: PoolFilm[] }).films;
const porId = new Map(POOL.map((f) => [f.id, f]));
export const poolFilm = (id: number): PoolFilm | undefined => porId.get(id);

const IMG = 'https://image.tmdb.org/t/p';
/**
 * El fondo a su tamaño original (1920 px o más): Fotograma lo amplía hasta
 * cinco veces, y a 1280 px el detalle se veía en cuadros.
 */
export const backdrop = (path: string) => `${IMG}/original${path}`;
export const poster = (path: string, size: 'w185' | 'w342' | 'w500' = 'w342') => `${IMG}/${size}${path}`;

/** Título en el idioma de la web: gallego, euskera y catalán caen en el castellano. */
export function poolTitle(f: PoolFilm, lang: Lang): string {
  return f.titles[lang] ?? (lang === 'en' ? f.original : f.titles.es) ?? f.original;
}

const genero = (id: number, lang: Lang) => GENRES.find((g) => g.id === id)?.[lang];

/* ------------------------------------------------------------------ *
 * Referencia de un reto: diario o ilimitado
 * ------------------------------------------------------------------ */

export type Ref = { day: number } | { seed: number };
export const SEED_MAX = 2 ** 31 - 1;
export const newSeed = (): number => randomInt(1, SEED_MAX);

/** Sin secreto (tests, desarrollo sin .env) vale uno fijo: solo protege contra trampas. */
const SECRET = process.env.BETTER_AUTH_SECRET || 'cine-archive-juegos';
const secreto = (texto: string): Buffer => createHmac('sha256', SECRET).update(texto).digest();

/** Índice en una lista de n según la referencia; `salt` separa juegos y modos. */
function indice(ref: Ref, n: number, salt: string): number {
  if ('day' in ref) return dailyIndex(ref.day, n, salt);
  return secreto(`${salt}:${ref.seed}`).readUInt32BE(0) % n;
}
/** Texto único de la referencia, para elegir imagen y punto de zoom. */
const clave = (ref: Ref) => ('day' in ref ? String(ref.day) : `s${secreto(`clave:${ref.seed}`).toString('hex').slice(0, 12)}`);

/* ------------------------------------------------------------------ *
 * Fotograma
 * ------------------------------------------------------------------ */

export type FotoMode = 'actual' | 'clasicos';
export const isFotoMode = (m: unknown): m is FotoMode => m === 'actual' || m === 'clasicos';

const frames = (clasicosData as { frames: Record<string, string[]> }).frames;
/** Las de Cine abierto con fotograma propio. */
export const CLASICOS: PdFilm[] = pdFilms.filter((f) => frames[f.id]?.length).sort((a, b) => a.id.localeCompare(b.id));
/** Si aún no hay fotogramas de clásicos, ese modo no se puede jugar (la API responde 503). */
export const fotoModeAvailable = (mode: FotoMode) => mode === 'actual' || CLASICOS.length > 0;

/** Una pista: el navegador pone la etiqueta («Año», «Director»…) en su idioma. */
export interface Hint {
  k: 'year' | 'genre' | 'director' | 'cast' | 'country' | 'sound' | 'initial';
  v: string;
}

export interface FotoPuzzle {
  mode: FotoMode;
  /** Reto diario: su número. */
  day?: number;
  /** Ilimitado: la semilla con la que se comprueba después. */
  seed?: number;
  image: string;
  focus: { x: number; y: number };
  hints: Hint[];
}

const fotoIndice = (mode: FotoMode, ref: Ref) =>
  mode === 'clasicos' ? indice(ref, CLASICOS.length, 'fotograma-clasicos') : indice(ref, POOL.length, 'fotograma');

/**
 * Semilla nueva para el Fotograma ilimitado que no caiga en una película ya
 * jugada. El navegador guarda las semillas de sus partidas (no sabe qué
 * película es cada una) y el servidor, que sí lo sabe, descarta las que
 * repetirían. Solo cuentan las más recientes, hasta el 80 % de las películas
 * del modo: en clásicos (114) se agotarían enseguida y no quedaría ninguna.
 */
export function freshFotoSeed(mode: FotoMode, seen: number[]): number {
  const n = mode === 'clasicos' ? CLASICOS.length : POOL.length;
  const recientes = seen.slice(-Math.floor(n * 0.8));
  const vistas = new Set(recientes.map((seed) => fotoIndice(mode, { seed })));
  let seed = newSeed();
  for (let intento = 0; intento < 60 && vistas.has(fotoIndice(mode, { seed })); intento++) seed = newSeed();
  return seed;
}

/** Solución interna del reto: no sale al navegador hasta el final. */
function fotoAnswerKey(mode: FotoMode, ref: Ref): { pool?: PoolFilm; pd?: PdFilm; image: string } {
  const k = clave(ref);
  if (mode === 'clasicos') {
    const pd = CLASICOS[fotoIndice(mode, ref)];
    const lista = frames[pd.id];
    return { pd, image: `/games/clasicos/${lista[hashString(`img:${k}`) % lista.length]}` };
  }
  const f = POOL[fotoIndice(mode, ref)];
  return { pool: f, image: backdrop(f.backdrops[hashString(`img:${k}`) % Math.min(2, f.backdrops.length)]) };
}

const inicial = (t: string) => t.replace(/^[^\p{L}\p{N}]+/u, '').charAt(0).toUpperCase();

/**
 * Los países de Cine abierto vienen en castellano (pdfilms.json). Para la
 * pista se traducen; una coproducción («Italia / EE. UU.») se traduce por partes.
 */
const PAISES: Record<string, Partial<Record<Lang, string>>> = {
  Francia: { en: 'France', gl: 'Francia', eu: 'Frantzia', ca: 'França' },
  'EE. UU.': { en: 'USA', gl: 'EUA', eu: 'AEB', ca: 'EUA' },
  España: { en: 'Spain', gl: 'España', eu: 'Espainia', ca: 'Espanya' },
  Alemania: { en: 'Germany', gl: 'Alemaña', eu: 'Alemania', ca: 'Alemanya' },
  Suecia: { en: 'Sweden', gl: 'Suecia', eu: 'Suedia', ca: 'Suècia' },
  URSS: { en: 'USSR', gl: 'URSS', eu: 'SESB', ca: 'URSS' },
  'Reino Unido': { en: 'United Kingdom', gl: 'Reino Unido', eu: 'Erresuma Batua', ca: 'Regne Unit' },
  'Países Bajos': { en: 'Netherlands', gl: 'Países Baixos', eu: 'Herbehereak', ca: 'Països Baixos' },
  Italia: { en: 'Italy', gl: 'Italia', eu: 'Italia', ca: 'Itàlia' },
  Finlandia: { en: 'Finland', gl: 'Finlandia', eu: 'Finlandia', ca: 'Finlàndia' },
  Canadá: { en: 'Canada', gl: 'Canadá', eu: 'Kanada', ca: 'Canadà' },
  Argentina: { en: 'Argentina', gl: 'Arxentina', eu: 'Argentina', ca: 'Argentina' },
};
export const paisEn = (pais: string, lang: Lang): string =>
  pais
    .split(' / ')
    .map((p) => PAISES[p]?.[lang] ?? p)
    .join(' / ');

export function fotoPuzzle(mode: FotoMode, ref: Ref, lang: Lang): FotoPuzzle {
  const k = fotoAnswerKey(mode, ref);
  let hints: Hint[];
  if (k.pd) {
    const f = k.pd;
    hints = [
      { k: 'year', v: String(f.year) },
      { k: 'country', v: paisEn(f.country, lang) },
      { k: 'sound', v: f.sound ? 'sound' : 'silent' },
      { k: 'director', v: f.director },
      { k: 'initial', v: inicial(pdTitle(f, lang)) },
    ];
  } else {
    const f = k.pool!;
    hints = [
      { k: 'year', v: String(f.year) },
      { k: 'genre', v: f.genres.map((g) => genero(g, lang)).filter(Boolean).join(', ') },
      { k: 'director', v: f.director ?? '—' },
      { k: 'cast', v: f.cast.join(', ') || '—' },
      { k: 'initial', v: inicial(poolTitle(f, lang)) },
    ];
  }
  return { mode, ...ref, image: k.image, focus: focusPoint(hashString(clave(ref)), `fotograma-${mode}`), hints };
}

/** ¿Es esta la película del reto? (id de TMDB en actual; id de Internet Archive en clásicos) */
export function fotoCheck(mode: FotoMode, ref: Ref, guess: string | number): boolean {
  const k = fotoAnswerKey(mode, ref);
  return k.pd ? String(guess) === k.pd.id : Number(guess) === k.pool!.id;
}

/**
 * ¿Ha fallado por poco, con otra película de la misma saga? («El imperio
 * contraataca» cuando era «La guerra de las galaxias»). Solo en actuales: en
 * Cine abierto no hay sagas.
 */
export function fotoSameSaga(mode: FotoMode, ref: Ref, guess: string | number): boolean {
  const k = fotoAnswerKey(mode, ref);
  if (!k.pool?.collection) return false;
  const g = poolFilm(Number(guess));
  return !!g && g.id !== k.pool.id && g.collection === k.pool.collection;
}

export interface FotoAnswer {
  title: string;
  year: number;
  poster: string | null;
  href: string;
  /** Clásicos: se puede ver gratis en Cine abierto. */
  watchFree: boolean;
}

export function fotoAnswer(mode: FotoMode, ref: Ref, lang: Lang): FotoAnswer {
  const k = fotoAnswerKey(mode, ref);
  if (k.pd) {
    return { title: pdTitle(k.pd, lang), year: k.pd.year, poster: `/cinema/${k.pd.id}.webp`, href: localizePath(lang, `cinema/${k.pd.id}`), watchFree: true };
  }
  const f = k.pool!;
  return { title: poolTitle(f, lang), year: f.year, poster: poster(f.poster), href: localizePath(lang, `film/${filmSlug(f.id, poolTitle(f, lang))}`), watchFree: false };
}

/** Los otros nombres de una película, sin repetir el que se enseña ni el original. */
function otros(titulo: string, original: string | undefined, todos: (string | undefined)[]): string[] {
  // Sin los que solo cambian en mayúsculas o tildes («American beauty»): el buscador los iguala.
  const vistos = new Set([titulo, original ?? ''].map(normalize));
  const out: string[] = [];
  for (const t of todos) {
    if (!t || vistos.has(normalize(t))) continue;
    vistos.add(normalize(t));
    out.push(t);
  }
  return out;
}

/**
 * Títulos para el buscador del juego (solo entre los posibles). Con los de los
 * otros idiomas: quien conoce la película como «American Psycho» la encuentra
 * aunque la web la llame de otra manera, y al revés.
 */
export function titleIndex(mode: FotoMode, lang: Lang): TitleEntry[] {
  if (mode === 'clasicos') {
    return CLASICOS.map((f) => {
      const title = pdTitle(f, lang);
      return { id: f.id, title, original: f.original_title, aka: otros(title, f.original_title, [f.title, ...Object.values(f.titles ?? {})]), year: f.year };
    });
  }
  return POOL.map((f) => {
    const title = poolTitle(f, lang);
    return { id: f.id, title, original: f.original, aka: otros(title, f.original, Object.values(f.titles)), year: f.year };
  });
}

/* ------------------------------------------------------------------ *
 * Cronología
 * ------------------------------------------------------------------ */

/** Las cinco del reto, en el orden en que se le enseñan al jugador (nunca ya ordenadas). */
export function chronoFilms(ref: Ref): PoolFilm[] {
  const k = clave(ref);
  const elegidas = pickChronology(POOL, 'day' in ref ? ref.day : k);
  for (let intento = 0; intento < 10; intento++) {
    const orden = permutation(CHRONO_SIZE, hashString(`cronologia-orden:${k}:${intento}`)).map((i) => elegidas[i]);
    if (orden.some((f, i) => i > 0 && f.year < orden[i - 1].year)) return orden;
  }
  return [...elegidas].reverse();
}

export const chronoCard = (f: PoolFilm, lang: Lang, i: number) => ({ key: i, title: poolTitle(f, lang), poster: poster(f.poster), director: f.director });

/* ------------------------------------------------------------------ *
 * ¿Cuál tiene mejor nota?
 * ------------------------------------------------------------------ */

/** Para este juego, solo las que tienen bastantes votos: su nota es estable. */
export const RATED = POOL.filter((f) => f.votes >= 1000);

/**
 * Racha firmada de «¿Cuál tiene mejor nota?». Antes la racha la contaba el
 * navegador y se la decía al servidor: se podía inventar, y también elegir
 * qué pareja comprobar. Ahora cada pareja llega con un vale firmado (HMAC con
 * el secreto del servidor) que dice qué dos películas son y cuántos aciertos
 * lleva la partida; solo el servidor lo sube al acertar. Hace falta antes de
 * cualquier clasificación entre jugadores.
 *
 * Formato: a.b.racha.emitido(base 36).firma. Caduca a las 24 horas.
 */
const VALE_TTL_MS = 24 * 60 * 60 * 1000;
const firmaVale = (cuerpo: string) => secreto(`nota:${cuerpo}`).toString('base64url').slice(0, 22);

export function notaToken(a: number, b: number, streak: number, now = Date.now()): string {
  const cuerpo = `${a}.${b}.${streak}.${now.toString(36)}`;
  return `${cuerpo}.${firmaVale(cuerpo)}`;
}

/** La racha del vale si es auténtico, de esa pareja y no ha caducado; si no, null. */
export function notaVerify(token: string, a: number, b: number, now = Date.now()): number | null {
  const partes = token.split('.');
  if (partes.length !== 5) return null;
  const [ta, tb, ts, tt, firma] = partes;
  const cuerpo = `${ta}.${tb}.${ts}.${tt}`;
  const esperada = firmaVale(cuerpo);
  if (firma.length !== esperada.length || !timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  if (Number(ta) !== a || Number(tb) !== b) return null;
  const emitido = parseInt(tt, 36);
  if (!Number.isFinite(emitido) || now - emitido > VALE_TTL_MS || emitido - now > 60_000) return null;
  const racha = Number(ts);
  return Number.isInteger(racha) && racha >= 0 ? racha : null;
}

export const ratingCard = (f: PoolFilm, lang: Lang) => ({ id: f.id, title: poolTitle(f, lang), year: f.year, poster: poster(f.poster), director: f.director });
