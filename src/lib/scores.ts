/**
 * Las casillas de la fila de notas de una ficha (components/FilmScores.astro).
 * Pura, para poder probarla (tests/filmscores.test.ts).
 *
 * TMDB, IMDb con sus votos, Rotten Tomatoes y Metacritic, sin tope: antes se
 * cortaba en cuatro y, con la nota de Cine Archive delante, Metacritic se
 * quedaba siempre fuera. La de Cine Archive se quitó el 8-11-2026: con una
 * comunidad aún pequeña, tres notas no dicen nada.
 */
import type { OmdbData } from './omdb';

export interface Casilla {
  label: string;
  value: string;
  sub?: string | null;
  /** Hueco a la espera de las notas de OMDb («…»). */
  hueco?: boolean;
}

export function casillasDeNotas(opts: {
  voteAverage: number;
  omdb: OmdbData | null;
  /** Faltan las de OMDb: se ponen huecos del mismo tamaño para que la fila no salte. */
  pendiente?: boolean;
  /** Formatea un número entero en el idioma de la página (1428512 → «1.428.512»). */
  formatoNumero: (n: number) => string;
  /** «{n} notas», ya traducido. */
  textoVotos: string;
  /** «IMDb», ya traducido. */
  etiquetaImdb: string;
}): Casilla[] {
  const { voteAverage, omdb, pendiente = false } = opts;
  const valida = (v?: string) => (v && v !== 'N/A' ? v : null);
  const fuente = (nombre: string) => valida(omdb?.Ratings?.find((r) => r.Source === nombre)?.Value);

  const casillas: Casilla[] = [];
  if (voteAverage > 0) casillas.push({ label: 'TMDB', value: voteAverage.toFixed(1) });
  if (pendiente) {
    for (const label of [opts.etiquetaImdb, 'Rotten Tomatoes', 'Metacritic']) casillas.push({ label, value: '…', hueco: true });
    return casillas;
  }
  const imdb = valida(omdb?.imdbRating);
  if (imdb) {
    const votos = Number(String(omdb?.imdbVotes ?? '').replace(/[^\d]/g, ''));
    casillas.push({
      label: opts.etiquetaImdb,
      value: imdb,
      sub: votos > 0 ? opts.textoVotos.replace('{n}', opts.formatoNumero(votos)) : null,
    });
  }
  const rt = fuente('Rotten Tomatoes');
  if (rt) casillas.push({ label: 'Rotten Tomatoes', value: rt });
  const mc = fuente('Metacritic') ?? (valida(omdb?.Metascore) ? `${omdb!.Metascore}/100` : null);
  if (mc) casillas.push({ label: 'Metacritic', value: mc });
  return casillas;
}
