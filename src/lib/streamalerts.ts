/**
 * Avisos de «ya está en tu plataforma» — la parte pura (tiene tests). La tarea
 * diaria que pregunta a TMDB y escribe los avisos está en streamjob.ts.
 *
 * Solo avisan la suscripción, lo gratis y lo gratis con anuncios: que una
 * película se pueda alquilar o comprar no es una novedad para nadie (casi
 * todas se pueden) y llenaría las notificaciones de ruido.
 */
import type { WatchAvailability, WatchProvider, WatchType } from './tmdb';

export const ALERT_TYPES: ReadonlySet<WatchType> = new Set(['sub', 'free', 'ads']);

/** Las plataformas de una región que cuentan para avisar, sin repetir plataforma. */
export function alertableProviders(av: WatchAvailability | undefined): WatchProvider[] {
  const seen = new Set<number>();
  const out: WatchProvider[] = [];
  for (const p of av?.providers ?? []) {
    if (!ALERT_TYPES.has(p.type) || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/**
 * Las plataformas que hay ahora y no había en la foto anterior. Sin foto
 * anterior (la primera vez que se mira esa película) no hay novedades: lo que
 * ya estaba cuando alguien la apuntó no es un aviso, es lo que dice la ficha.
 */
export function newArrivals(prevIds: readonly number[] | null, now: WatchProvider[]): WatchProvider[] {
  if (prevIds == null) return [];
  const before = new Set(prevIds);
  return now.filter((p) => !before.has(p.id));
}

/** ¿Le interesa esta plataforma? Sin plataformas elegidas, todas. */
export function wantsProvider(userProviders: readonly number[], providerId: number): boolean {
  return userProviders.length === 0 || userProviders.includes(providerId);
}
