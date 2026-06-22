/**
 * Rate limiter en memoria (ventana deslizante por clave). Suficiente para un único
 * proceso Node en el VPS; si se escalara a varias instancias, migrar a Redis.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false; // bloqueado
  }
  hits.push(now);
  buckets.set(key, hits);
  return true; // permitido
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
