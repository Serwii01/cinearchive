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

export async function getOmdbByImdbId(imdbId: string): Promise<OmdbData | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return null;
  const url = new URL(BASE);
  url.searchParams.set('apikey', key);
  url.searchParams.set('i', imdbId);
  url.searchParams.set('tomatoes', 'true');
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as OmdbData;
    return data.Response === 'True' ? data : null;
  } catch {
    return null;
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
