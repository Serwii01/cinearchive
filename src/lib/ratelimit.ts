/**
 * Rate limiter en memoria (ventana deslizante por clave). Suficiente para un único
 * proceso Node en el VPS; si se escalara a varias instancias, migrar a Redis.
 *
 * Defensa frente a inundación de peticiones (DoS): además del límite por clave,
 * se limpia periódicamente el Map y se acota su tamaño para que el propio
 * limitador no pueda agotar la memoria del proceso.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 50_000; // cota dura de memoria (≈ nº de IPs distintas rastreadas)
let lastSweep = Date.now();

/** Cada minuto elimina las claves sin actividad reciente para acotar la memoria. */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || now - hits[hits.length - 1] > 600_000) {
      buckets.delete(key);
    }
  }
}

export interface RateResult {
  ok: boolean;
  /** Segundos que el cliente debe esperar antes de reintentar (0 si ok). */
  retryAfter: number;
}

export function check(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  // Si se alcanza el tope de memoria, no se rastrean claves nuevas (pero se
  // permite la petición) para no convertir el limitador en un vector de DoS.
  if (!buckets.has(key) && buckets.size >= MAX_KEYS) {
    return { ok: true, retryAfter: 0 };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfter: 0 };
}

/** Compat: firma booleana usada por los endpoints existentes. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  return check(key, limit, windowMs).ok;
}

export function clientIp(request: Request): string {
  // X-Forwarded-For puede traer varias IPs ("cliente, proxy1, …"). El cliente
  // puede falsificar las primeras; la ÚLTIMA la añade nuestro proxy (Caddy) y es
  // la única de confianza. (Caddy además sobrescribe la cabecera, ver Caddyfile.)
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',');
    const real = hops[hops.length - 1]?.trim();
    if (real) return real;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/** Respuesta 429 estándar con cabecera Retry-After. */
export function tooMany(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: 'rate_limited' }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'Retry-After': String(Math.max(1, retryAfter)),
    },
  });
}
