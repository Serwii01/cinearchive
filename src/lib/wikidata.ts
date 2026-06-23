/**
 * Localizaciones de una película desde Wikidata (SOLO SERVIDOR, gratis, sin clave).
 *
 * Se busca el elemento por su id de IMDb (propiedad P345) y se leen:
 *   - P915 «localización de rodaje» (filming location)
 *   - P840 «lugar de la narración» (narrative location)
 * Wikidata pide un User-Agent identificable. La cobertura es parcial: no todas las
 * películas tienen estos datos catalogados.
 */
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'CineArchive/1.0 (film archive; contact via site)';

export interface FilmLocations {
  filming: string[];
  narrative: string[];
}

export async function getFilmLocations(imdbId: string | null): Promise<FilmLocations | null> {
  if (!imdbId) return null;
  const query = `SELECT ?filmingLabel ?narrativeLabel WHERE {
    ?film wdt:P345 "${imdbId}".
    OPTIONAL { ?film wdt:P915 ?filming. }
    OPTIONAL { ?film wdt:P840 ?narrative. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  } LIMIT 60`;
  try {
    const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
      headers: { 'user-agent': UA, accept: 'application/sparql-results+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results: { bindings: { filmingLabel?: { value: string }; narrativeLabel?: { value: string } }[] };
    };
    const filming = new Set<string>();
    const narrative = new Set<string>();
    const isLabel = (v?: string) => !!v && !/^Q\d+$/.test(v); // descarta entidades sin etiqueta
    for (const b of data.results.bindings) {
      if (isLabel(b.filmingLabel?.value)) filming.add(b.filmingLabel!.value);
      if (isLabel(b.narrativeLabel?.value)) narrative.add(b.narrativeLabel!.value);
    }
    return { filming: [...filming].slice(0, 12), narrative: [...narrative].slice(0, 12) };
  } catch {
    return null;
  }
}
