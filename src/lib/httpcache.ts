/* ------------------------------------------------------------------ *
 * Política de caché HTTP.
 *
 * Las páginas SSR públicas (ficha, listados, dosieres) generan el MISMO html
 * para todo visitante anónimo, pero hasta ahora salían sin Cache-Control: ni el
 * navegador ni una capa compartida (Caddy/CDN) podían reutilizarlas, así que
 * cada visita y cada bot repetían consulta a BD y llamada a TMDB.
 *
 * Reglas:
 *   - Allowlist explícita: lo que no esté listado NO se cachea (por defecto,
 *     seguro). Basta con olvidar añadir una ruta; nunca al revés.
 *   - Solo para visitantes anónimos: si hay sesión, la página lleva estado
 *     personal (valoración, listas) y va como 'private'.
 *   - 'Vary: Cookie' siempre: impide que una caché compartida sirva la copia
 *     anónima a alguien con sesión (y viceversa).
 *   - Páginas privadas: 'no-store', para que no queden en el disco del navegador
 *     en un equipo compartido.
 * ------------------------------------------------------------------ */

/** Rutas públicas SSR cacheables (ruta ya sin el prefijo de idioma). */
const CACHE_EXACT = new Map<string, number>([
  ['', 600], // portada: la película del día ya se fija por día
  ['/films', 600],
  ['/discover', 600],
  ['/archive', 600], // incluye biblioteca, glosario, cronología y palmarés
  ['/cines', 1800], // el buscador de salas resuelve en cliente contra /api/cinemas
]);

/** Prefijos públicos SSR cacheables (fichas y dosieres: cambian muy poco). */
const CACHE_PREFIX: [string, number][] = [
  ['/film/', 3600],
  ['/person/', 3600],
  ['/collections/', 3600],
];

/** TTL de caché compartida para una ruta pública, o null si no es cacheable. */
export function sharedTtl(stripped: string): number | null {
  const exact = CACHE_EXACT.get(stripped);
  if (exact !== undefined) return exact;
  for (const [prefix, ttl] of CACHE_PREFIX) {
    if (stripped.startsWith(prefix)) return ttl;
  }
  return null;
}

/**
 * Fija Cache-Control en una respuesta de página. No toca las respuestas que ya
 * traen la cabecera puesta a mano (p. ej. las imágenes OG).
 */
export function cachePolicy(response: Response, stripped: string, hasUser: boolean): Response {
  if (response.headers.has('Cache-Control')) return response;
  // Solo html con éxito: un 3xx/4xx/5xx no debe quedarse pegado en una caché.
  if (response.status !== 200) return response;
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response;

  // Se añade a lo que ya hubiera (no se pisa: otra capa puede haber puesto su
  // propio Vary, p. ej. por Accept-Encoding).
  const vary = response.headers.get('Vary');
  const declarado = (vary ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .includes('cookie');
  if (!declarado) response.headers.set('Vary', vary ? `${vary}, Cookie` : 'Cookie');

  const ttl = sharedTtl(stripped);
  if (ttl !== null && !hasUser) {
    // max-age=0 → el navegador revalida (verá su estado de sesión al instante);
    // s-maxage → la capa compartida sí la reutiliza; swr → sirve la copia vieja
    // mientras refresca por detrás, de modo que nadie espera a TMDB.
    response.headers.set(
      'Cache-Control',
      `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=86400`,
    );
    return response;
  }

  // Páginas con datos personales: fuera de cualquier caché, ni siquiera en disco.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
