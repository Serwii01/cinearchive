/**
 * Slugs "bonitos" para las URLs de ficha de película: `nombre-{tmdbId}`.
 *
 * El nombre es DECORATIVO; lo que resuelve la ficha es el id numérico del final,
 * así que no hace falta ninguna tabla en base de datos. Cualquier texto que se
 * ponga delante del id funciona (la ruta canonicaliza con un 301 al slug real).
 *
 * Módulo PURO (sin imports de servidor) para poder usarlo también en los
 * `<script>` de cliente sin arrastrar el bundle de i18n.
 */

/** Minúsculas, sin diacríticos, no-alfanumérico → guiones, sin guiones sobrantes. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `nombre-{id}` (p. ej. "donnie-darko-141"). Si el título no deja base, solo el id. */
export function filmSlug(tmdbId: number, title?: string | null): string {
  const base = title ? slugify(title) : '';
  return base ? `${base}-${tmdbId}` : String(tmdbId);
}

/**
 * Extrae el id del final del slug. Acepta el id "pelado" (URLs viejas `/film/141`)
 * y el slug con nombre (`donnie-darko-141`, `blade-runner-2049-335984` → 335984).
 * Devuelve null si no hay id resoluble.
 */
export function parseFilmId(param: string): number | null {
  const m = /(?:^|-)(\d+)$/.exec(param);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
