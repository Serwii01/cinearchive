/**
 * Cliente de OMDb — SOLO SERVIDOR.
 * Clave en process.env.OMDB_API_KEY (sin PUBLIC_). Plan gratuito = 1000 req/día,
 * por eso los resultados se cachean en films_cache (ver lib/films.ts).
 */

const BASE = 'https://www.omdbapi.com/';

export interface OmdbData {
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
  Ratings?: { Source: string; Value: string }[];
  Rated?: string;
  Awards?: string;
  BoxOffice?: string;
  Production?: string;
  Response: 'True' | 'False';
  Error?: string;
}

/**
 * Lo que contestó OMDb. Antes todo lo que no eran notas se volvía null y se
 * trataba igual, y eso gastaba la cuota: una película que OMDb no tiene se
 * volvía a pedir en cada visita (nunca quedaba «al día»), y con la cuota ya
 * agotada se seguía preguntando sin parar.
 */
export type OmdbRespuesta =
  | { tipo: 'notas'; data: OmdbData }
  /** OMDb no la tiene: se guarda para no volver a preguntar en un mes. */
  | { tipo: 'no-existe' }
  /** Cuota del día agotada (o clave rechazada): se deja de llamar un rato. */
  | { tipo: 'agotada' }
  /** Red caída, error del servidor…: no se guarda nada y se reintenta otro día. */
  | { tipo: 'fallo' };

/** De la respuesta HTTP de OMDb a lo que significa. Pura (tiene tests). */
export function clasificarOmdb(status: number, body: Partial<OmdbData> | null): OmdbRespuesta {
  const error = String(body?.Error ?? '');
  // OMDb contesta 401 tanto a «Request limit reached!» como a una clave mala:
  // en los dos casos no sirve de nada seguir llamando.
  if (status === 401 || /limit|api key/i.test(error)) return { tipo: 'agotada' };
  if (status < 200 || status >= 300 || !body) return { tipo: 'fallo' };
  if (body.Response === 'True') return { tipo: 'notas', data: body as OmdbData };
  if (/not found|incorrect imdb id/i.test(error)) return { tipo: 'no-existe' };
  return { tipo: 'fallo' };
}

/** Lo que se guarda cuando OMDb no tiene la película: no da ninguna nota. */
export const OMDB_SIN_DATOS: OmdbData = { Response: 'False', Error: 'Movie not found!' };

/* Pausa al agotarse la cuota. En memoria: es un solo proceso, y si se reinicia
 * lo peor que pasa es una petición más para descubrir que sigue agotada. */
export const OMDB_PAUSA_MS = 60 * 60 * 1000; // una hora
let pausaHasta = 0;
export const omdbEnPausa = (ahora = Date.now()): boolean => ahora < pausaHasta;
export const pausarOmdb = (ahora = Date.now()): void => {
  pausaHasta = ahora + OMDB_PAUSA_MS;
};

export async function getOmdbByImdbId(imdbId: string): Promise<OmdbRespuesta> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return { tipo: 'fallo' };
  if (omdbEnPausa()) return { tipo: 'agotada' };
  const url = new URL(BASE);
  url.searchParams.set('apikey', key);
  url.searchParams.set('i', imdbId);
  url.searchParams.set('tomatoes', 'true');
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const body = (await res.json().catch(() => null)) as Partial<OmdbData> | null;
    const r = clasificarOmdb(res.status, body);
    if (r.tipo === 'agotada') pausarOmdb();
    return r;
  } catch {
    return { tipo: 'fallo' };
  }
}

/* ------------------------------------------------------------------ *
 * Premios: OMDb los da como una frase en inglés con forma fija
 * («Won 3 Oscars. 97 wins & 140 nominations total»). Se mostraba tal cual
 * en todos los idiomas. Aquí se reconoce esa forma y se reescribe; si llega
 * algo que no encaja, se deja como viene antes que inventar.
 * ------------------------------------------------------------------ */

type AwardsLang = 'es' | 'en' | 'gl' | 'eu' | 'ca';
type Premio = 'oscar' | 'bafta' | 'globe' | 'emmy';

const PREMIOS: { re: RegExp; key: Premio }[] = [
  { re: /^Oscars?$/i, key: 'oscar' },
  { re: /^BAFTA( Film)? Awards?$/i, key: 'bafta' },
  { re: /^Golden Globes?$/i, key: 'globe' },
  { re: /^Primetime Emmys?$/i, key: 'emmy' },
];

const NOMBRE: Record<Exclude<AwardsLang, 'en'>, Record<Premio, [string, string]>> = {
  es: { oscar: ['Óscar', 'Óscar'], bafta: ['BAFTA', 'BAFTA'], globe: ['Globo de Oro', 'Globos de Oro'], emmy: ['Emmy', 'Emmy'] },
  gl: { oscar: ['Óscar', 'Óscar'], bafta: ['BAFTA', 'BAFTA'], globe: ['Globo de Ouro', 'Globos de Ouro'], emmy: ['Emmy', 'Emmy'] },
  eu: { oscar: ['Oscar sari', 'Oscar sari'], bafta: ['BAFTA sari', 'BAFTA sari'], globe: ['Urrezko Globo', 'Urrezko Globo'], emmy: ['Emmy sari', 'Emmy sari'] },
  ca: { oscar: ['Oscar', 'Oscar'], bafta: ['BAFTA', 'BAFTA'], globe: ["Globus d'Or", "Globus d'Or"], emmy: ['Emmy', 'Emmy'] },
};

const FRASES: Record<
  Exclude<AwardsLang, 'en'>,
  {
    won: (n: number, p: string) => string;
    nominated: (n: number, p: string) => string;
    wins: (n: number) => string;
    noms: (n: number) => string;
    total: (partes: string[]) => string;
  }
> = {
  es: {
    won: (n, p) => `Ganó ${n} ${p}.`,
    nominated: (n, p) => `Nominada a ${n} ${p}.`,
    wins: (n) => `${n} ${n === 1 ? 'premio' : 'premios'}`,
    noms: (n) => `${n} ${n === 1 ? 'nominación' : 'nominaciones'}`,
    total: (p) => `${p.join(' y ')} en total`,
  },
  gl: {
    won: (n, p) => `Gañou ${n} ${p}.`,
    nominated: (n, p) => `Nomeada a ${n} ${p}.`,
    wins: (n) => `${n} ${n === 1 ? 'premio' : 'premios'}`,
    noms: (n) => `${n} ${n === 1 ? 'nomeamento' : 'nomeamentos'}`,
    total: (p) => `${p.join(' e ')} en total`,
  },
  eu: {
    won: (n, p) => `${n} ${p} irabazi zituen.`,
    nominated: (n, p) => `${n} ${p}tarako hautagaia.`,
    wins: (n) => `${n} sari`,
    noms: (n) => `${n} hautagaitza`,
    total: (p) => `Guztira ${p.join(' eta ')}`,
  },
  ca: {
    won: (n, p) => `Va guanyar ${n} ${p}.`,
    nominated: (n, p) => `Nominada a ${n} ${p}.`,
    wins: (n) => `${n} ${n === 1 ? 'premi' : 'premis'}`,
    noms: (n) => `${n} ${n === 1 ? 'nominació' : 'nominacions'}`,
    total: (p) => `${p.join(' i ')} en total`,
  },
};

export function translateAwards(raw: string, lang: AwardsLang): string {
  if (lang === 'en') return raw;
  const m = raw.trim().match(/^(?:(Won|Nominated for) (\d+) ([A-Za-z ]+?)\.\s*)?(?:(\d+) wins?)?(?: & )?(?:(\d+) nominations?)?(?: total)?\.?$/);
  if (!m || (!m[1] && !m[4] && !m[5])) return raw;
  const [, verbo, nPremio, nombrePremio, wins, noms] = m;
  const f = FRASES[lang];
  const partes: string[] = [];

  if (verbo) {
    const premio = PREMIOS.find((p) => p.re.test(nombrePremio.trim()));
    if (!premio) return raw; // un premio que no sabemos nombrar: mejor el original
    const n = Number(nPremio);
    const nombre = NOMBRE[lang][premio.key][n === 1 ? 0 : 1];
    partes.push(verbo === 'Won' ? f.won(n, nombre) : f.nominated(n, nombre));
  }
  const totales = [wins && f.wins(Number(wins)), noms && f.noms(Number(noms))].filter(Boolean) as string[];
  if (totales.length) partes.push(f.total(totales));
  return partes.join(' ');
}
