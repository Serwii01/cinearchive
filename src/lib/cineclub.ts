/**
 * Cineclub — calendario de sesiones (puro, sin base de datos ni red).
 *
 * Una sesión es una película de Cine abierto que todo el mundo ve a la vez, a
 * una hora fija, con un chat al lado. No hay que programarlas a mano: siguen
 * un calendario fijo (viernes a las 22:00 y domingos a las 18:00, hora de
 * Madrid) con una película de dominio público por turno, sin repetir hasta
 * agotar la lista. src/data/cineclub.json puede fijar una película y una
 * presentación para una sesión concreta (un ciclo, una efeméride).
 *
 * La clave de una sesión es su día y su hora («2026-11-20-2200»): basta para
 * saber qué película es, y es lo que guarda el chat (cineclub_messages.session).
 */
import { pdFilms, type PdFilm } from './pdfilms';
import { hashString, permutation } from './games';
import fijadas from '../data/cineclub.json';

/** Lunes anterior a la primera sesión: el turno 0 es el viernes 20-11-2026. */
const EPOCH = '2026-11-16';
/** Hora local de Madrid de cada sesión, por día de la semana (0 = domingo). */
export const SLOTS: { weekday: number; time: string }[] = [
  { weekday: 5, time: '22:00' },
  { weekday: 0, time: '18:00' },
];
/** Rato que la sala sigue abierta al acabar la película, para comentarla. */
export const AFTER_MIN = 20;
/** Cuánto antes se abre la sala (cuenta atrás y chat). */
export const BEFORE_MIN = 30;

/** Largometrajes y mediometrajes: un corto de tres minutos no es una sesión. */
export const CINECLUB_FILMS: PdFilm[] = pdFilms.filter((f) => f.runtime >= 40).sort((a, b) => a.id.localeCompare(b.id));

interface Fijada {
  date: string;
  time: string;
  film: string;
  intro?: Partial<Record<'es' | 'en' | 'gl' | 'eu' | 'ca', string>>;
}
const FIJADAS = (fijadas as { sessions: Fijada[] }).sessions;

/* ---------------------------- hora de Madrid ---------------------------- */

const partes = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
/** Minutos que Madrid va por delante de UTC en ese instante (60 o 120). */
function desfase(ms: number): number {
  const p = Object.fromEntries(partes.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((comoUtc - ms) / 60000);
}
/** El instante (ms UTC) de una fecha y hora de Madrid. Pura. */
export function madridToUtc(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const local = Date.UTC(y, m - 1, d, h, mi);
  // Dos pasadas: el desfase de la primera estimación puede ser el del otro lado
  // del cambio de hora.
  let t = local - desfase(local) * 60000;
  t = local - desfase(t) * 60000;
  return t;
}
/** AAAA-MM-DD de Madrid en ese instante. */
export function madridDay(ms: number): string {
  const p = Object.fromEntries(partes.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const masDias = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const diaSemana = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/* ------------------------------- sesiones ------------------------------- */

export interface CineclubSession {
  key: string;
  date: string;
  time: string;
  film: PdFilm;
  startsAt: number;
  /** Fin de la película (sin el rato de después). */
  endsAt: number;
  intro?: Fijada['intro'];
}

/** Turno de una sesión desde EPOCH: dos por semana, en orden. */
function turno(date: string, time: string): number {
  const semanas = Math.floor((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${EPOCH}T12:00:00Z`)) / (7 * 86400000));
  const i = SLOTS.findIndex((s) => s.time === time && s.weekday === diaSemana(date));
  return semanas * SLOTS.length + Math.max(0, i);
}

const ORDEN = permutation(CINECLUB_FILMS.length, hashString('cineclub'));

/** La sesión de esa fecha y hora, si es una sesión del calendario o fijada. */
export function sessionAt(date: string, time: string): CineclubSession | null {
  const fija = FIJADAS.find((s) => s.date === date && s.time === time);
  const enCalendario = SLOTS.some((s) => s.weekday === diaSemana(date) && s.time === time);
  if (!fija && !enCalendario) return null;
  const film = fija
    ? CINECLUB_FILMS.find((f) => f.id === fija.film) ?? pdFilms.find((f) => f.id === fija.film)
    : CINECLUB_FILMS[ORDEN[((turno(date, time) % ORDEN.length) + ORDEN.length) % ORDEN.length]];
  if (!film) return null;
  const startsAt = madridToUtc(date, time);
  return {
    key: `${date}-${time.replace(':', '')}`,
    date,
    time,
    film,
    startsAt,
    endsAt: startsAt + film.runtime * 60000,
    ...(fija?.intro ? { intro: fija.intro } : {}),
  };
}

/** La sesión de una clave («2026-11-20-2200»), o null si no es válida. */
export function sessionByKey(key: string): CineclubSession | null {
  const m = /^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})$/.exec(key);
  if (!m) return null;
  return sessionAt(m[1], `${m[2]}:${m[3]}`);
}

export type SessionState = 'upcoming' | 'open' | 'playing' | 'after' | 'over';

/** En qué punto está: falta, sala abierta, en pantalla, comentando o acabada. */
export function sessionState(s: CineclubSession, now: number): SessionState {
  if (now < s.startsAt - BEFORE_MIN * 60000) return 'upcoming';
  if (now < s.startsAt) return 'open';
  if (now < s.endsAt) return 'playing';
  if (now < s.endsAt + AFTER_MIN * 60000) return 'after';
  return 'over';
}

/** Las próximas `n` sesiones (incluida la que esté en marcha), en orden. */
export function upcomingSessions(now: number, n = 4): CineclubSession[] {
  const out: CineclubSession[] = [];
  const hoy = madridDay(now);
  for (let d = -1; d < 60 && out.length < n; d++) {
    const date = masDias(hoy, d);
    const horas = new Set([...SLOTS.filter((s) => s.weekday === diaSemana(date)).map((s) => s.time), ...FIJADAS.filter((s) => s.date === date).map((s) => s.time)]);
    for (const time of [...horas].sort()) {
      const s = sessionAt(date, time);
      if (s && sessionState(s, now) !== 'over') out.push(s);
    }
  }
  return out.sort((a, b) => a.startsAt - b.startsAt).slice(0, n);
}

/** Segundo de la película en que debería ir la sala ahora (0 antes de empezar). Pura. */
export function playheadSeconds(s: CineclubSession, now: number): number {
  return Math.max(0, Math.min((now - s.startsAt) / 1000, s.film.runtime * 60));
}
