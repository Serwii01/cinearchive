/**
 * Sondas de las fuentes externas — SOLO SERVIDOR.
 *
 * El panel mostraba antes "∞" para TMDB y "—" para OMDb: cifras escritas a mano
 * que no medían nada. Ninguna de estas APIs publica su cuota consultable, pero
 * sí se puede comprobar lo que de verdad importa a las tres de la mañana: si
 * responden, con qué latencia y si te han cortado el grifo.
 *
 * REGLAS QUE NO SE NEGOCIAN
 *
 *   - OMDb es la ÚNICA que gasta cuota de verdad (1000 al día), así que su
 *     sonda se cachea 30 minutos: 48 comprobaciones diarias en el peor caso.
 *   - Nominatim y Overpass son servicios comunitarios gratuitos. Se usan sus
 *     endpoints /status, que existen justo para esto, y se manda un User-Agent
 *     identificable, como exige su política de uso.
 *   - Las sondas NO se ejecutan al renderizar la página: la primera carga del
 *     panel no puede quedarse esperando cuatro segundos a un tercero. Las pide
 *     el navegador después, con el resto del refresco.
 */
import { createMemo, type Memo } from './memo';
import { registerCache } from './cache-registry';
import { UA } from './cinemas';

export type EstadoSonda = 'ok' | 'slow' | 'down' | 'skipped';

export type IdSonda = 'tmdb' | 'omdb' | 'overpass' | 'nominatim' | 'wikidata';

export interface ResultadoSonda {
  id: IdSonda;
  /** Nombre propio del servicio: no se traduce. */
  etiqueta: string;
  estado: EstadoSonda;
  ms: number | null;
  httpStatus: number | null;
  /** Detalle si lo hay: "cuota agotada", ranuras libres de Overpass… */
  nota: string | null;
  comprobadoEn: number;
}

/** A partir de aquí se considera lenta. Un segundo y medio ya se nota. */
export const UMBRAL_LENTO_MS = 1500;
const TIMEOUT_MS = 4000;

/** Clasifica una respuesta. Es la única parte pura, y la que se prueba. */
export function clasificar(ms: number, httpStatus: number | null): EstadoSonda {
  if (httpStatus === null || httpStatus >= 400) return 'down';
  return ms >= UMBRAL_LENTO_MS ? 'slow' : 'ok';
}

interface Definicion {
  id: IdSonda;
  etiqueta: string;
  ttlMs: number;
  /** null = no se puede sondear (falta la clave). */
  url: () => string | null;
  /** Lee el cuerpo para sacar una nota; puede devolver null. */
  nota?: (texto: string) => string | null;
}

const DEFINICIONES: Definicion[] = [
  {
    id: 'tmdb',
    etiqueta: 'TMDB',
    ttlMs: 5 * 60_000,
    url: () => {
      const k = process.env.TMDB_API_KEY;
      return k ? `https://api.themoviedb.org/3/configuration?api_key=${k}` : null;
    },
  },
  {
    id: 'omdb',
    etiqueta: 'OMDb',
    // Media hora: es la única fuente con cuota diaria de verdad.
    ttlMs: 30 * 60_000,
    url: () => {
      const k = process.env.OMDB_API_KEY;
      return k ? `https://www.omdbapi.com/?apikey=${k}&i=tt0111161` : null;
    },
    nota: (texto) => {
      try {
        const j = JSON.parse(texto) as { Response?: string; Error?: string };
        // OMDb responde 200 con Response:"False" cuando agota la cuota: sin
        // mirar el cuerpo, la sonda diría "ok" con la cuota reventada.
        return j.Response === 'False' ? (j.Error ?? 'respuesta negativa') : null;
      } catch {
        return null;
      }
    },
  },
  {
    id: 'overpass',
    etiqueta: 'Overpass',
    ttlMs: 5 * 60_000,
    url: () => 'https://overpass-api.de/api/status',
    nota: (texto) => {
      // El estado viene en texto plano: "N slots available now."
      const m = texto.match(/(\d+)\s+slots? available/i);
      return m ? `${m[1]} ranuras libres` : null;
    },
  },
  {
    id: 'nominatim',
    etiqueta: 'Nominatim',
    ttlMs: 5 * 60_000,
    url: () => 'https://nominatim.openstreetmap.org/status?format=json',
  },
  {
    id: 'wikidata',
    etiqueta: 'Wikidata',
    ttlMs: 15 * 60_000,
    url: () => 'https://query.wikidata.org/sparql?format=json&query=ASK%7B%7D',
  },
];

/** Una sonda, sin lanzar nunca. */
async function sondear(def: Definicion): Promise<ResultadoSonda> {
  const base = {
    id: def.id,
    etiqueta: def.etiqueta,
    comprobadoEn: Date.now(),
  };

  const url = def.url();
  // Sin clave configurada no se sondea: no es que esté caída, es que no la usamos.
  if (!url) {
    return { ...base, estado: 'skipped', ms: null, httpStatus: null, nota: null };
  }

  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json, text/plain, */*' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    const ms = Date.now() - t0;

    let nota: string | null = null;
    if (def.nota) {
      const texto = await res.text().catch(() => '');
      nota = def.nota(texto);
    }

    // Una nota de error del cuerpo manda sobre el código HTTP (caso OMDb).
    const estado = nota ? 'down' : clasificar(ms, res.status);
    return { ...base, estado, ms, httpStatus: res.status, nota };
  } catch (err) {
    // Timeout, DNS, TLS: para el panel es lo mismo, está caída.
    const ms = Date.now() - t0;
    const nota = err instanceof Error && err.name === 'TimeoutError' ? 'sin respuesta a tiempo' : null;
    return { ...base, estado: 'down', ms, httpStatus: null, nota };
  }
}

/**
 * Un memo por fuente, porque cada una tiene su propio TTL y `createMemo` lo fija
 * por instancia. De paso, el deduplicado de promesas en vuelo hace que dos
 * pestañas del panel refrescando a la vez disparen UNA sola petición.
 */
const memos: Record<string, Memo<ResultadoSonda>> = Object.fromEntries(
  DEFINICIONES.map((d) => [d.id, createMemo<ResultadoSonda>(d.ttlMs, 1)]),
);

registerCache({
  id: 'probes',
  label: 'Sondas de fuentes externas',
  size: () => DEFINICIONES.reduce((n, d) => n + memos[d.id].size, 0),
  clear: () => DEFINICIONES.forEach((d) => memos[d.id].clear()),
});

/** Todas las sondas en paralelo. Nunca lanza. */
export function probeAll(): Promise<ResultadoSonda[]> {
  return Promise.all(DEFINICIONES.map((d) => memos[d.id].get('sonda', () => sondear(d))));
}
