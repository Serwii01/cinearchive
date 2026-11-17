/**
 * Árbol de respuestas de un hilo (puro: lo usan la página y los tests).
 *
 * Las respuestas llegan de la base de datos en una lista plana con su
 * `parentId`. Aquí se cuelga cada una de la suya, se ordenan las hermanas y se
 * quitan las ocultas que no tienen nada debajo. Una oculta con respuestas
 * visibles se queda como hueco («mensaje retirado») para que lo que cuelga de
 * ella siga en su sitio y no parezca contestar a otra cosa.
 */

export const POST_SORTS = ['votes', 'old', 'new'] as const;
export type PostSort = (typeof POST_SORTS)[number];
export const isPostSort = (s: unknown): s is PostSort => POST_SORTS.includes(s as PostSort);

/** A partir de aquí no se sangra más: en el móvil no quedaría sitio para el texto. */
export const MAX_DEPTH = 6;

export interface FlatPost {
  id: number;
  parentId: number | null;
  score: number;
  hidden: boolean;
}

export interface PostNode<T extends FlatPost> {
  post: T;
  depth: number;
  /** Respuestas visibles por debajo (todas, no solo las directas): para «+12» al plegar. */
  descendants: number;
  children: PostNode<T>[];
}

function comparar(sort: PostSort) {
  return (a: FlatPost, b: FlatPost): number => {
    if (sort === 'new') return b.id - a.id;
    if (sort === 'votes' && b.score !== a.score) return b.score - a.score;
    return a.id - b.id;
  };
}

export function buildTree<T extends FlatPost>(posts: T[], sort: PostSort = 'votes'): PostNode<T>[] {
  const ids = new Set(posts.map((p) => p.id));
  const hijos = new Map<number | null, T[]>();
  for (const p of posts) {
    // Padre que no está (no debería pasar: mismo hilo y nunca se borra): a la raíz.
    const padre = p.parentId != null && ids.has(p.parentId) && p.parentId !== p.id ? p.parentId : null;
    const lista = hijos.get(padre) ?? [];
    lista.push(p);
    hijos.set(padre, lista);
  }
  const cmp = comparar(sort);
  const visitados = new Set<number>();
  const montar = (padre: number | null, depth: number): PostNode<T>[] => {
    const out: PostNode<T>[] = [];
    for (const p of [...(hijos.get(padre) ?? [])].sort(cmp)) {
      if (visitados.has(p.id)) continue; // a prueba de ciclos
      visitados.add(p.id);
      const children = montar(p.id, depth + 1);
      const descendants = children.reduce((n, c) => n + c.descendants + (c.post.hidden ? 0 : 1), 0);
      if (p.hidden && children.length === 0) continue;
      out.push({ post: p, depth, descendants, children });
    }
    return out;
  };
  return montar(null, 0);
}

/** Cuántas respuestas visibles hay en el árbol. */
export const countVisible = <T extends FlatPost>(nodes: PostNode<T>[]): number =>
  nodes.reduce((n, x) => n + x.descendants + (x.post.hidden ? 0 : 1), 0);
