import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/db/client', () => ({ db: {} }));
const { renderForumBody, extractCites, plainForumBody, quoteFor, citeToken, CITE_MAX } = await import('../src/lib/forumbody');
const { buildTree, countVisible } = await import('../src/lib/forumtree');
const { localCite } = await import('../src/lib/forumcites');
const { pdFilms } = await import('../src/lib/pdfilms');
const { books } = await import('../src/lib/library');
const { articles } = await import('../src/lib/articles');

const labels = {
  film: 'Película',
  cinema: 'Cine abierto',
  periodical: 'Hemeroteca',
  book: 'Biblioteca',
  article: 'Artículo',
  dossier: 'Dosier',
  collection: 'Colección',
  watch: 'Verla entera',
  missing: 'Cita no disponible',
};
const tarjeta = {
  kind: 'film' as const,
  title: 'Metrópolis',
  meta: '1927 · Fritz Lang',
  href: '/film/metropolis-19',
  image: 'https://image.tmdb.org/t/p/w185/x.jpg',
  watchHref: '/cinema/metropolis',
};
const cites = new Map([['film:19', tarjeta]]);

describe('foro: formato de los mensajes', () => {
  it('escapa todo el HTML que escribe la gente', () => {
    const html = renderForumBody('<script>alert(1)</script> & "hola"', new Map(), labels);
    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;hola&quot;</p>');
  });

  it('párrafos por línea en blanco y saltos dentro del párrafo', () => {
    expect(renderForumBody('uno\ndos\n\ntres', new Map(), labels)).toBe('<p>uno<br>dos</p><p>tres</p>');
  });

  it('una cita sola en su línea es una tarjeta; dentro de una frase, un enlace', () => {
    const html = renderForumBody('Mirad esta:\n[[film:19]]\nY [[film:19]] otra vez', cites, labels);
    expect(html).toContain('<div class="forum-cite" data-kind="film">');
    expect(html).toContain('href="/film/metropolis-19" class="forum-cite-title">Metrópolis</a>');
    expect(html).toContain('▶ Verla entera');
    expect(html).toContain('Y <a href="/film/metropolis-19" class="forum-cite-inline">Metrópolis</a> otra vez');
  });

  it('una cita que ya no existe no rompe el mensaje', () => {
    expect(renderForumBody('[[book:nada]]', new Map(), labels)).toBe('<p class="forum-cite-missing">Cita no disponible</p>');
  });

  it('las líneas con > son un bloque de cita', () => {
    expect(renderForumBody('> @ana:\n> qué plano\n\nCierto', new Map(), labels)).toBe('<blockquote>@ana:<br>qué plano</blockquote><p>Cierto</p>');
  });

  it('enlaza las direcciones como contenido de usuario y deja fuera el punto final', () => {
    const html = renderForumBody('Ved https://archive.org/details/x.', new Map(), labels);
    expect(html).toBe('<p>Ved <a href="https://archive.org/details/x" rel="ugc nofollow noopener" target="_blank">https://archive.org/details/x</a>.</p>');
    // Ni javascript: ni comillas para salir del atributo.
    expect(renderForumBody('javascript:alert(1)', new Map(), labels)).not.toContain('<a');
    expect(renderForumBody('https://x.com/"onmouseover=alert(1)', new Map(), labels)).not.toContain('"onmouseover');
  });

  it('saca las citas sin repetir y con tope', () => {
    expect(extractCites('[[film:1]] [[book:a]] [[film:1]] [[nada:2]]')).toEqual([
      { kind: 'film', id: '1' },
      { kind: 'book', id: 'a' },
    ]);
    const muchas = Array.from({ length: CITE_MAX + 5 }, (_, i) => `[[film:${i + 1}]]`).join(' ');
    expect(extractCites(muchas)).toHaveLength(CITE_MAX);
  });

  it('texto llano para resúmenes: la cita por su título', () => {
    expect(plainForumBody('> cita\nVed [[film:19]] ya', cites)).toBe('cita Ved Metrópolis ya');
  });

  it('citar un mensaje mete cada línea con > y quién lo dijo', () => {
    expect(quoteFor('ana', 'Uno\nDos')).toBe('> @ana:\n> Uno\n> Dos\n\n');
    expect(quoteFor('ana', 'x'.repeat(500), 10)).toBe(`> @ana:\n> ${'x'.repeat(10)}…\n\n`);
  });

  it('el token se escribe como lo lee el formato', () => {
    expect(extractCites(citeToken('cinema', 'the-general-1926'))).toEqual([{ kind: 'cinema', id: 'the-general-1926' }]);
  });
});

describe('foro: citas del archivo', () => {
  it('resuelve Cine abierto, biblioteca y artículos sin base de datos', () => {
    const f = pdFilms[0];
    expect(localCite('cinema', f.id, 'es')).toMatchObject({ kind: 'cinema', href: `/cinema/${f.id}`, image: `/cinema/${f.id}.webp` });
    const b = books[0];
    expect(localCite('book', b.id, 'en')).toMatchObject({ kind: 'book', title: b.title, href: `/en/library/${b.id}` });
    const a = articles[0];
    expect(localCite('article', a.slug, 'es')?.href).toBe(`/articles/${a.slug}`);
    expect(localCite('book', 'no-existe', 'es')).toBeNull();
  });
});

describe('foro: árbol de respuestas', () => {
  const p = (id: number, parentId: number | null, score = 0, hidden = false) => ({ id, parentId, score, hidden });

  it('cuelga cada respuesta de la suya y cuenta lo que hay debajo', () => {
    const arbol = buildTree([p(1, null), p(2, 1), p(3, 2), p(4, null)], 'old');
    expect(arbol.map((n) => n.post.id)).toEqual([1, 4]);
    expect(arbol[0].children[0].children[0].post.id).toBe(3);
    expect(arbol[0].children[0].children[0].depth).toBe(2);
    expect(arbol[0].descendants).toBe(2);
    expect(countVisible(arbol)).toBe(4);
  });

  it('ordena las hermanas por votos (empate: la más antigua), antiguas o recientes', () => {
    const lista = [p(1, null, 1), p(2, null, 5), p(3, null, 5)];
    expect(buildTree(lista, 'votes').map((n) => n.post.id)).toEqual([2, 3, 1]);
    expect(buildTree(lista, 'old').map((n) => n.post.id)).toEqual([1, 2, 3]);
    expect(buildTree(lista, 'new').map((n) => n.post.id)).toEqual([3, 2, 1]);
  });

  it('quita las ocultas sin respuestas y deja el hueco de las que tienen', () => {
    const arbol = buildTree([p(1, null, 0, true), p(2, 1), p(3, null, 0, true)], 'old');
    expect(arbol.map((n) => n.post.id)).toEqual([1]);
    expect(arbol[0].children[0].post.id).toBe(2);
    expect(countVisible(arbol)).toBe(1);
  });

  it('un padre que no está, o un ciclo, no pierde respuestas ni se cuelga', () => {
    expect(buildTree([p(5, 99)], 'old').map((n) => n.post.id)).toEqual([5]);
    expect(buildTree([p(1, 1)], 'old').map((n) => n.post.id)).toEqual([1]);
  });
});

describe('foro: hora relativa', async () => {
  const { timeAgo } = await import('../src/lib/format');
  const ahora = Date.UTC(2026, 10, 17, 12, 0, 0);
  it('dice cuánto hace y, pasado un mes, la fecha', () => {
    expect(timeAgo(new Date(ahora - 20_000), 'es-ES', ahora)).toBe('ahora');
    expect(timeAgo(new Date(ahora - 5 * 60_000), 'es-ES', ahora)).toBe('hace 5 min');
    expect(timeAgo(new Date(ahora - 3 * 3600_000), 'es-ES', ahora)).toBe('hace 3 h');
    expect(timeAgo(new Date(ahora - 86400_000), 'es-ES', ahora)).toBe('ayer');
    expect(timeAgo(new Date(ahora - 40 * 86400_000), 'es-ES', ahora)).toMatch(/2026/);
    expect(timeAgo(new Date(ahora - 3 * 3600_000), 'en-GB', ahora)).toMatch(/^3 hr.? ago$/);
  });
});
