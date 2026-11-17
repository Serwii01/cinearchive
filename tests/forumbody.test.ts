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
  spoiler: 'Spoiler: pulsa para verlo',
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

describe('foro: spoilers y menciones', async () => {
  const { spoilerLines } = await import('../src/lib/forumbody');
  const { extractMentions } = await import('../src/lib/forumbody');
  const opts = { users: new Set(['ana']), userHref: (u: string) => `/u/${u}` };

  it('tapa lo que va entre [spoiler] y [/spoiler]', () => {
    const html = renderForumBody('Al final [spoiler]muere el perro[/spoiler], qué pena', new Map(), labels);
    expect(html).toBe('<p>Al final <span class="forum-spoiler" role="button" tabindex="0" aria-expanded="false" title="Spoiler: pulsa para verlo">muere el perro</span>, qué pena</p>');
    expect(renderForumBody('[spoiler]<b>x</b>[/spoiler]', new Map(), labels)).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('un spoiler de varias líneas se tapa línea a línea, y uno sin cerrar llega al final', () => {
    expect(spoilerLines(['a [spoiler]b', 'c', 'd[/spoiler] e'])).toEqual(['a [spoiler]b[/spoiler]', '[spoiler]c[/spoiler]', '[spoiler]d[/spoiler] e']);
    expect(spoilerLines(['[spoiler]x', 'y'])).toEqual(['[spoiler]x[/spoiler]', '[spoiler]y[/spoiler]']);
    // Una película citada dentro no sale como tarjeta destapada.
    expect(renderForumBody('[spoiler]\n[[film:19]]\n[/spoiler]', cites, labels)).not.toContain('forum-cite"');
  });

  it('los resúmenes no destripan', () => {
    expect(plainForumBody('Bien hasta que [spoiler]muere[/spoiler]. Ojo', new Map())).toBe('Bien hasta que […]. Ojo');
  });

  it('enlaza las menciones de cuentas que existen y deja el resto como texto', () => {
    expect(renderForumBody('Hola @Ana y @nadie', new Map(), labels, opts)).toBe('<p>Hola <a href="/u/ana" class="forum-mention">@ana</a> y @nadie</p>');
    expect(renderForumBody('correo ana@ana.com', new Map(), labels, opts)).toBe('<p>correo ana@ana.com</p>');
  });

  it('saca las menciones sin las de las citas ni las de direcciones', () => {
    expect(extractMentions('> @marta:\n> hola @luis\n\n@Ana y @ana, mira https://x.com/@pepe y @eva.')).toEqual(['ana', 'eva']);
    expect(extractMentions('@ab @abc')).toEqual(['abc']);
  });
});

describe('foro: avisos, búsqueda y exportación', async () => {
  const { recipientsFor } = await import('../src/lib/forumactivity');
  const { snippetAround, likeLiteral } = await import('../src/lib/forum');

  it('un aviso por persona, el más importante, y nunca a quien escribe', () => {
    const r = recipientsFor({ actorId: 'yo', repliedTo: 'ana', mentioned: ['ana', 'luis', 'yo'], followers: ['ana', 'luis', 'eva', 'yo'] });
    expect([...r]).toEqual([
      ['ana', 'reply'],
      ['luis', 'mention'],
      ['eva', 'follow'],
    ]);
    expect(recipientsFor({ actorId: 'yo', repliedTo: 'yo', mentioned: [], followers: ['yo'] }).size).toBe(0);
  });

  it('el trozo de la búsqueda va alrededor de lo buscado y sin marcas', () => {
    const largo = `${'a '.repeat(100)}Buster Keaton ${'b '.repeat(100)}`;
    const s = snippetAround(largo, 'keaton', 40);
    expect(s).toMatch(/^…/);
    expect(s).toMatch(/…$/);
    expect(s).toContain('Buster Keaton');
    expect(snippetAround('Mirad [[film:19]] y [spoiler]x[/spoiler] Keaton', 'keaton')).toBe('Mirad … y x Keaton');
    expect(snippetAround('nada', 'keaton')).toBe('');
  });

  it('busca el texto tal cual, aunque lleve % o _', () => {
    expect(likeLiteral('50%_off')).toBe(String.raw`%50\%\_off%`);
  });

  it('la exportación de la cuenta lleva votos, hilos seguidos y denuncias', async () => {
    const { shapeExport } = await import('../src/lib/account');
    const out = shapeExport({
      user: { name: 'A' }, profile: null, preferences: null, films: [], lists: [], listFilms: [], following: [], followers: [], badges: [], providers: [],
      forum: {
        threads: [], posts: [{ id: 2, threadId: 1, parentId: 1, body: 'R', userId: 'x' }], chat: [],
        votes: [{ kind: 'post', targetId: 3, userId: 'x' }],
        following: [{ threadId: 1, userId: 'x' }],
        reports: [{ kind: 'post', targetId: 4, reason: 'spam', reporterId: 'x' }],
      },
    });
    expect(out.forum.replies[0]).toEqual({ id: 2, threadId: 1, parentId: 1, body: 'R' });
    expect(out.forum.votes).toEqual([{ kind: 'post', targetId: 3 }]);
    expect(out.forum.followedThreads).toEqual([{ threadId: 1 }]);
    expect(out.forum.reportsMade).toEqual([{ kind: 'post', targetId: 4, reason: 'spam' }]);
  });
});
