import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { siteCounters } from '../db/schema';
import { clientIp } from './ratelimit';

/**
 * Contador de visitas del sitio (SOLO SERVIDOR).
 *
 * Qué cuenta: una VISITA, no una página vista. Igual que en cualquier
 * analítica, varias páginas seguidas del mismo visitante son
 * una sola visita: se recuerda quién ha pasado (huella de IP + navegador) y no
 * se vuelve a contar hasta que lleva media hora sin aparecer.
 *
 * Qué NO cuenta: la API, los recursos estáticos, las peticiones que no piden
 * HTML, los robots conocidos y el panel de administración (que es tráfico
 * propio). Tampoco cuenta dos veces un recargado.
 *
 * Dos puertas de entrada: las páginas que pinta el servidor se cuentan en el
 * middleware (contarVisita), pero las prerenderizadas las sirve Node como
 * ficheros sin pasar por él, así que esas avisan desde el navegador con un
 * POST a /api/visits (contarVisitaEstatica). Las dos comparten huella, así que
 * quien pasa por páginas de ambos tipos sigue siendo una sola visita.
 *
 * Cómo escribe: nunca una consulta por visita. Se acumula en memoria y se vuelca
 * sumando (`value = value + n`), como mucho cada 30 segundos. Si el proceso se
 * reinicia se pierden las visitas no volcadas; a cambio, una visita no cuesta
 * una escritura en disco.
 */

const CLAVE = 'visits';

/** Media hora sin aparecer = visita nueva. */
const SESION_MS = 30 * 60 * 1000;
/** Como mucho, un volcado cada 30 s. */
const VOLCADO_MS = 30 * 1000;
/** Tope de huellas en memoria: si se llena, se limpian las caducadas. */
const MAX_HUELLAS = 20_000;

const vistos = new Map<string, number>();
let pendientes = 0;
let ultimoVolcado = 0;
let volcando: Promise<void> | null = null;

/** Robots conocidos: no son visitas. */
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|embedly|quora link preview|pinterest|bitlybot|whatsapp|telegram|discord|preview|monitor|uptime|curl|wget|python-requests|axios|headless|lighthouse|gpt|claude|perplexity|bytespider|semrush|ahrefs|mj12|dotbot|dataprovider|zgrab|masscan/i;

/**
 * ¿Esta petición es una visita de una persona a una página?
 *
 * Exportada para poder probarla: es la regla que decide el número que se
 * enseña, y lo fácil es equivocarse contando iconos o sondas.
 */
export function esVisita(opts: { method: string; path: string; accept: string | null; ua: string | null }): boolean {
  if (opts.method !== 'GET') return false;
  // Páginas, no recursos: el navegador pide HTML con Accept: text/html.
  if (!opts.accept?.includes('text/html')) return false;
  return esPersonaEnPagina(opts.path, opts.ua);
}

/**
 * La parte de la regla que vale para las dos puertas: una página del sitio
 * (no la API ni el panel) vista por un navegador que no es un robot conocido.
 */
export function esPersonaEnPagina(path: string, ua: string | null): boolean {
  if (!path.startsWith('/') || path.startsWith('/api/')) return false;
  // El panel es tráfico de casa.
  if (/^\/(?:[a-z]{2}\/)?admin(?:\/|$)/.test(path)) return false;
  if (!ua) return false; // sin navegador que se identifique, casi siempre es un script
  if (BOTS.test(ua)) return false;
  return true;
}

/** Huella corta y no reversible del visitante (no se guarda en ningún sitio). */
function huella(ip: string, ua: string): string {
  let h = 2166136261;
  const s = `${ip}|${ua}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function limpiar(ahora: number) {
  for (const [k, t] of vistos) if (ahora - t > SESION_MS) vistos.delete(k);
}

async function volcar(): Promise<void> {
  const n = pendientes;
  if (n <= 0) return;
  pendientes = 0;
  try {
    await db
      .update(siteCounters)
      .set({ value: sql`${siteCounters.value} + ${n}`, updatedAt: sql`now()` })
      .where(sql`${siteCounters.key} = ${CLAVE}`);
    cache = null; // el total que teníamos guardado se ha quedado corto
  } catch (e) {
    // Si la BD falla, las visitas vuelven a la cola en vez de perderse.
    pendientes += n;
    console.error('[visitas] no se pudo volcar el contador:', e);
  }
}

/**
 * Anota la visita si toca. No espera a la base de datos: devolver la página
 * nunca debe depender de un contador.
 */
export function contarVisita(request: Request, path: string): void {
  if (!esVisita({ method: request.method, path, accept: request.headers.get('accept'), ua: request.headers.get('user-agent') })) return;
  anotar(request);
}

/**
 * Lo mismo para una página prerenderizada, a partir del aviso que manda el
 * navegador (ver BaseLayout). `path` es la página que se está viendo.
 */
export function contarVisitaEstatica(request: Request, path: string): void {
  if (!esPersonaEnPagina(path, request.headers.get('user-agent'))) return;
  anotar(request);
}

function anotar(request: Request): void {
  const ahora = Date.now();
  const k = huella(clientIp(request), request.headers.get('user-agent') ?? '');
  const visto = vistos.get(k);
  vistos.set(k, ahora);
  if (visto && ahora - visto < SESION_MS) return; // sigue en la misma visita

  pendientes++;
  if (vistos.size > MAX_HUELLAS) limpiar(ahora);

  if (ahora - ultimoVolcado >= VOLCADO_MS && !volcando) {
    ultimoVolcado = ahora;
    volcando = volcar().finally(() => {
      volcando = null;
    });
  }
}

let cache: { total: number; hasta: number } | null = null;

/**
 * Total de visitas. Se guarda un minuto en memoria: es un número para enseñar,
 * no hace falta ir a la base de datos en cada petición.
 *
 * null si no se puede leer: mejor no enseñar nada que una cifra inventada. (La
 * fila la crea la migración 0018 con el valor de partida.)
 */
export async function totalVisitas(): Promise<number | null> {
  const ahora = Date.now();
  if (cache && ahora < cache.hasta) return cache.total + pendientes;
  try {
    const [fila] = await db
      .select({ value: siteCounters.value })
      .from(siteCounters)
      .where(sql`${siteCounters.key} = ${CLAVE}`);
    if (!fila) return null;
    cache = { total: fila.value, hasta: ahora + 60_000 };
    return fila.value + pendientes;
  } catch (e) {
    console.error('[visitas] no se pudo leer el contador:', e);
    return cache ? cache.total + pendientes : null;
  }
}
