/**
 * La tarea de los avisos de «ya está en tu plataforma» — SOLO SERVIDOR. Las
 * reglas (qué cuenta como novedad, a quién le interesa) están en
 * streamalerts.ts, que es pura y tiene tests.
 *
 * Cómo funciona:
 *  1. Cada pocas horas se buscan las películas que alguien tiene pendientes y
 *     que no se han mirado en las últimas 20 horas, de la más olvidada a la más
 *     reciente, con un tope por vuelta para no pedir a TMDB miles de golpe.
 *  2. Para cada una se pide solo su «dónde ver» (todas las regiones en una
 *     petición) y se compara con la foto anterior (watch_snapshot). Lo nuevo
 *     se convierte en un aviso para cada usuario que la tiene pendiente en esa
 *     región y usa esa plataforma.
 *  3. A quien lo pidió, un correo con lo nuevo (uno por vuelta como mucho).
 *
 * Corre dentro del propio proceso de Node con un temporizador: en un VPS de
 * 1,8 GB un contenedor de cron aparte costaría más memoria que la tarea.
 */
import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { filmsCache, streamAlerts, user, userFilms, userPreferences, watchSnapshot } from '../db/schema';
import { WATCH_REGIONS } from '../data/countries';
import { flattenRegion, getWatchProvidersRaw, type WatchAvailability } from './tmdb';
import { alertableProviders, newArrivals, wantsProvider } from './streamalerts';
import { mapLimit } from './recs';
import { getFilmsBrief } from './films';
import { emailConfigured, sendEmail } from './email';
import { streamAlertEmail } from './emails';
import { localizePath, normalizeLang } from '../i18n/ui';

const MAX_PER_RUN = 1500;
const STALE_HOURS = 20;
const TMDB_PARALLEL = 4;
const EVERY_MS = 6 * 60 * 60 * 1000;
const FIRST_RUN_MS = 2 * 60 * 1000;
// Un correo solo con lo de los últimos días: si alguien activa el correo hoy,
// no le llega de golpe todo lo que se avisó el mes pasado.
const EMAIL_WINDOW_DAYS = 3;

export interface StreamRunResult {
  films: number;
  alerts: number;
  emails: number;
  ms: number;
}

let running = false;

export async function runStreamAlerts(): Promise<StreamRunResult> {
  const t0 = Date.now();
  if (running) return { films: 0, alerts: 0, emails: 0, ms: 0 };
  running = true;
  try {
    const region = sql<string>`coalesce(${userPreferences.watchRegion}, 'ES')`;
    const targets = await db
      .select({ tmdbId: userFilms.tmdbId, region })
      .from(userFilms)
      .leftJoin(userPreferences, eq(userPreferences.userId, userFilms.userId))
      .leftJoin(watchSnapshot, and(eq(watchSnapshot.tmdbId, userFilms.tmdbId), sql`${watchSnapshot.region} = ${region}`))
      .where(eq(userFilms.status, 'want'))
      .groupBy(userFilms.tmdbId, region)
      .having(sql`min(${watchSnapshot.checkedAt}) is null or min(${watchSnapshot.checkedAt}) < now() - make_interval(hours => ${STALE_HOURS}::int)`)
      .orderBy(sql`min(${watchSnapshot.checkedAt}) nulls first`)
      .limit(MAX_PER_RUN);

    const byFilm = new Map<number, Set<string>>();
    for (const t of targets) {
      if (!byFilm.has(t.tmdbId)) byFilm.set(t.tmdbId, new Set());
      byFilm.get(t.tmdbId)!.add(t.region);
    }
    const ids = [...byFilm.keys()];
    const snaps = ids.length ? await db.select().from(watchSnapshot).where(inArray(watchSnapshot.tmdbId, ids)) : [];
    const prev = new Map(snaps.map((s) => [`${s.tmdbId}:${s.region}`, s.providerIds]));

    let alerts = 0;
    await mapLimit(ids, TMDB_PARALLEL, async (tmdbId) => {
      let raw;
      try {
        raw = await getWatchProvidersRaw(tmdbId);
      } catch {
        return; // TMDB falla con esta: se reintenta en la próxima vuelta
      }

      for (const reg of byFilm.get(tmdbId)!) {
        const now = alertableProviders(flattenRegion(reg, raw[reg]));
        const arrivals = newArrivals(prev.get(`${tmdbId}:${reg}`) ?? null, now);
        await db
          .insert(watchSnapshot)
          .values({ tmdbId, region: reg, providerIds: now.map((p) => p.id), checkedAt: new Date() })
          .onConflictDoUpdate({ target: [watchSnapshot.tmdbId, watchSnapshot.region], set: { providerIds: now.map((p) => p.id), checkedAt: new Date() } });
        if (arrivals.length === 0) continue;

        const fans = await db
          .select({ userId: userFilms.userId, providers: userPreferences.watchProviders })
          .from(userFilms)
          .leftJoin(userPreferences, eq(userPreferences.userId, userFilms.userId))
          .where(and(eq(userFilms.tmdbId, tmdbId), eq(userFilms.status, 'want'), sql`coalesce(${userPreferences.watchRegion}, 'ES') = ${reg}`));
        const rows = fans.flatMap((f) =>
          arrivals
            .filter((p) => wantsProvider(f.providers ?? [], p.id))
            .map((p) => ({ userId: f.userId, tmdbId, region: reg, providerId: p.id, providerName: p.name, providerLogo: p.logo })),
        );
        if (rows.length) {
          const ins = await db.insert(streamAlerts).values(rows).onConflictDoNothing().returning({ id: streamAlerts.id });
          alerts += ins.length;
        }
      }

      // De paso, la ficha queda con el «dónde ver» del día aunque nadie la visite.
      const providers: Record<string, WatchAvailability> = {};
      for (const r of WATCH_REGIONS) {
        const flat = flattenRegion(r, raw[r]);
        if (flat.providers.length > 0 || flat.link) providers[r] = flat;
      }
      await db.update(filmsCache).set({ providers }).where(eq(filmsCache.tmdbId, tmdbId));
    });

    const emails = await sendAlertEmails();
    return { films: ids.length, alerts, emails, ms: Date.now() - t0 };
  } finally {
    running = false;
  }
}

/** Un correo por usuario con sus avisos aún sin enviar, a quien lo haya pedido. */
async function sendAlertEmails(): Promise<number> {
  if (!emailConfigured()) return 0;
  const since = new Date(Date.now() - EMAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: streamAlerts.id,
      userId: streamAlerts.userId,
      tmdbId: streamAlerts.tmdbId,
      providerName: streamAlerts.providerName,
      email: user.email,
      locale: userPreferences.locale,
    })
    .from(streamAlerts)
    .innerJoin(user, eq(user.id, streamAlerts.userId))
    .innerJoin(userPreferences, eq(userPreferences.userId, streamAlerts.userId))
    .where(and(eq(userPreferences.alertsEmail, true), eq(user.emailVerified, true), isNull(streamAlerts.emailedAt), gt(streamAlerts.createdAt, since)));

  const byUser = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId)!.push(r);
  }

  const site = process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
  let sent = 0;
  for (const list of byUser.values()) {
    const lang = normalizeLang(list[0].locale);
    const briefs = await getFilmsBrief([...new Set(list.map((r) => r.tmdbId))], lang);
    // Una línea por película, con todas sus plataformas nuevas juntas.
    const perFilm = new Map<number, string[]>();
    for (const r of list) perFilm.set(r.tmdbId, [...(perFilm.get(r.tmdbId) ?? []), r.providerName]);
    const lines = [...perFilm.entries()].map(([id, ps]) => `${briefs.get(id)?.title ?? `#${id}`} — ${ps.join(', ')}`);
    const url = new URL(localizePath(lang, 'notifications'), site).href;
    const ok = await sendEmail({ to: list[0].email, ...streamAlertEmail(lang, lines, url) });
    if (ok) {
      await db.update(streamAlerts).set({ emailedAt: new Date() }).where(inArray(streamAlerts.id, list.map((r) => r.id)));
      sent++;
    }
  }
  return sent;
}

let started = false;

/**
 * Arranca la tarea: una primera vuelta a los dos minutos (no en mitad del
 * arranque, que es cuando más memoria se usa) y luego cada seis horas. Como
 * cada película solo se vuelve a mirar pasadas 20 horas, eso es una vez al día
 * por película, repartida en cuatro tandas.
 */
export function startStreamAlerts(): void {
  if (started || process.env.STREAM_ALERTS === 'off') return;
  started = true;
  const tick = () =>
    runStreamAlerts()
      .then((r) => {
        if (r.films) console.log(`[avisos] ${r.films} películas miradas, ${r.alerts} avisos, ${r.emails} correos (${r.ms} ms)`);
      })
      .catch((e) => console.error('[avisos] error:', e));
  setTimeout(tick, FIRST_RUN_MS).unref();
  setInterval(tick, EVERY_MS).unref();
}
