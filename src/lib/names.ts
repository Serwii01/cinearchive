/**
 * Nombres de personas en alfabeto latino.
 *
 * TMDB guarda a mucha gente con el nombre en su escritura original: «中井朝一»
 * en vez de Asakazu Nakai, «Иван Бобров» en vez de Ivan Bobrov. En una web en
 * castellano, inglés, gallego, euskera y catalán eso no se puede leer ni
 * buscar. Aquí está la parte pura de la elección; la que consulta TMDB y
 * Wikidata y lo recuerda en la base de datos está en lib/personnames.ts.
 */

/** True si el nombre lleva alguna letra que no es latina (kanji, hangul, cirílico…). */
export function hasNonLatin(name: string): boolean {
  return /[^\p{Script=Latin}\P{L}]/u.test(name);
}

/** True si se puede enseñar tal cual: tiene letras y todas son latinas. */
function usable(name: string | null | undefined): name is string {
  return !!name && /\p{L}/u.test(name) && !hasNonLatin(name);
}

/**
 * El primer alias latino de TMDB (`also_known_as`). Se saltan los que son solo
 * iniciales («I. Bobrov»): mejor el nombre entero en otra escritura que media
 * firma.
 */
export function pickLatinAlias(aliases: readonly string[] | null | undefined): string | null {
  for (const a of aliases ?? []) {
    const s = a.trim();
    if (usable(s) && !/^\p{L}\.\s/u.test(s)) return s;
  }
  return null;
}

// Transliteración sencilla del ruso y el ucraniano, al estilo de los créditos
// en inglés (Sergey, Evgeniy). No es la norma académica, pero es lo que la
// gente reconoce y busca.
const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  є: 'ye', і: 'i', ї: 'yi', ґ: 'g',
};

/** El nombre con el cirílico pasado a latino. Lo que no es cirílico se queda igual. */
export function transliterateCyrillic(name: string): string {
  return name.replace(/\p{Script=Cyrillic}/gu, (ch) => {
    const lower = ch.toLowerCase();
    const out = CYRILLIC[lower];
    if (out === undefined) return ch;
    // Mayúscula inicial si la letra original lo era («Щ» → «Shch», no «SHCH»).
    return ch !== lower && out ? out[0].toUpperCase() + out.slice(1) : out;
  });
}

/**
 * El nombre que se enseña. Si ya es latino, el mismo. Si no, por orden: la
 * etiqueta de Wikidata (la más cuidada), el nombre de la ficha de persona de
 * TMDB (el reparto de una película puede llevar «宮口精二» y la ficha de la
 * persona «Seiji Miyaguchi»), un alias latino y, para el cirílico, la
 * transliteración. Null si no hay forma: entonces se queda el
 * original, que al menos es el nombre de verdad.
 */
export function latinName(opts: {
  name: string;
  primaryName?: string | null;
  aliases?: readonly string[] | null;
  wikidataLabel?: string | null;
}): string | null {
  if (!hasNonLatin(opts.name)) return opts.name;
  if (usable(opts.wikidataLabel)) return opts.wikidataLabel.trim();
  if (usable(opts.primaryName)) return opts.primaryName.trim();
  const alias = pickLatinAlias(opts.aliases);
  if (alias) return alias;
  const translit = transliterateCyrillic(opts.name);
  return usable(translit) ? translit : null;
}
