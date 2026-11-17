/**
 * Formato de los mensajes del foro (puro: lo usan el servidor y los tests).
 *
 * Un mensaje es texto llano con tres añadidos, sin HTML ni Markdown completo
 * (no hace falta para conversar y así no hay nada que sanear):
 *
 * - Citas del archivo: `[[tipo:id]]`, p. ej. `[[film:603]]` o
 *   `[[cinema:the-general-1926]]`. Sola en su línea se pinta como tarjeta con
 *   portada; dentro de una frase, como enlace con el título. Se guardan como
 *   referencia y no como texto copiado para que el título salga en el idioma
 *   de quien lee y el enlace no se rompa si cambia el slug.
 * - Líneas que empiezan por `>`: cita de otro mensaje (bloque aparte).
 * - Direcciones http(s): enlace con rel="ugc nofollow" (contenido de usuarios).
 * - `[spoiler]…[/spoiler]`: tapado hasta que se pulsa (en un foro de cine, el
 *   final de una película no se cuenta sin avisar). Puede ocupar varias líneas.
 * - `@usuario`: enlace a su perfil, solo si la cuenta existe (las que no, se
 *   quedan como texto: no se enlaza a páginas 404).
 *
 * Todo lo demás se escapa. El resultado va a la página con set:html.
 */

export const CITE_KINDS = ['film', 'cinema', 'periodical', 'book', 'article', 'dossier', 'collection'] as const;
export type CiteKind = (typeof CITE_KINDS)[number];
export const isCiteKind = (k: unknown): k is CiteKind => CITE_KINDS.includes(k as CiteKind);

/** Más tarjetas no aportan y cada película es una consulta: tope por mensaje. */
export const CITE_MAX = 12;

const CITE_SRC = String.raw`\[\[(film|cinema|periodical|book|article|dossier|collection):([A-Za-z0-9._-]{1,120})\]\]`;
const CITE_LINE = new RegExp(`^${CITE_SRC}$`);
/** Mención: @ y un nombre de usuario (lib/social.ts USERNAME_RE), sin ir pegado a una palabra o un correo. */
const MENTION_SRC = String.raw`(?<![\w@./])@([A-Za-z0-9_]{3,20})(?![\w])`;
/** Cita, dirección web o mención, para recorrer una línea de texto. */
const INLINE = new RegExp(`${CITE_SRC}|(https?:\\/\\/[^\\s<>"]+)|${MENTION_SRC}`, 'g');
const SPOILER = /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi;

/** Tope de personas avisadas por mensaje: más que esto ya es spam. */
export const MENTION_MAX = 10;

/**
 * Los @usuario de un texto, en minúsculas, sin repetir y hasta MENTION_MAX.
 * No cuenta los de las líneas citadas (`>`): quien cita un mensaje no está
 * llamando otra vez a quien nombraba aquel. Pura.
 */
export function extractMentions(body: string): string[] {
  const out = new Set<string>();
  for (const linea of body.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*>/.test(linea)) continue;
    // Las direcciones fuera: en «https://x.com/@ana» no hay ninguna mención.
    const sinUrls = linea.replace(/https?:\/\/[^\s<>"]+/g, ' ');
    for (const m of sinUrls.matchAll(new RegExp(MENTION_SRC, 'g'))) {
      out.add(m[1].toLowerCase());
      if (out.size >= MENTION_MAX) return [...out];
    }
  }
  return [...out];
}

/**
 * Los spoilers que ocupan varias líneas se cierran al final de cada una y se
 * vuelven a abrir en la siguiente: así cada línea se pinta por separado (y una
 * cita de película dentro de un spoiler no sale como tarjeta destapada). Pura.
 */
export function spoilerLines(lineas: string[]): string[] {
  let abierto = false;
  return lineas.map((l) => {
    let linea = abierto && l.trim() ? `[spoiler]${l}` : l;
    if (abierto && !l.trim()) return l;
    for (const m of linea.matchAll(/\[(\/?)spoiler\]/gi)) abierto = m[1] !== '/';
    if (abierto) linea += '[/spoiler]';
    return linea;
  });
}

export interface CiteRef {
  kind: CiteKind;
  id: string;
}

export const citeToken = (kind: CiteKind, id: string): string => `[[${kind}:${id}]]`;
export const citeKey = (kind: CiteKind, id: string): string => `${kind}:${id}`;

/** Las citas de un texto, sin repetir y en orden, hasta CITE_MAX. */
export function extractCites(body: string): CiteRef[] {
  const out: CiteRef[] = [];
  const vistas = new Set<string>();
  for (const m of body.matchAll(new RegExp(CITE_SRC, 'g'))) {
    const ref = { kind: m[1] as CiteKind, id: m[2] };
    const k = citeKey(ref.kind, ref.id);
    if (vistas.has(k)) continue;
    vistas.add(k);
    out.push(ref);
    if (out.length >= CITE_MAX) break;
  }
  return out;
}

/** Lo que hace falta para pintar una cita: lo resuelve lib/forumcites.ts. */
export interface CiteCard {
  kind: CiteKind;
  title: string;
  /** Una línea: año y dirección, autor, cabecera… */
  meta: string;
  /** Ruta ya localizada. */
  href: string;
  image: string | null;
  /** Se puede ver entera en Cine abierto (películas de TMDB que también están allí). */
  watchHref?: string;
}

export type CiteLabels = Record<CiteKind, string> & { watch: string; missing: string; spoiler: string };

/** Lo que el formato necesita saber de fuera para las menciones. */
export interface BodyOptions {
  /** Nombres de usuario que existen (en minúsculas): solo esos se enlazan. */
  users?: Set<string>;
  /** Ruta del perfil de un usuario (ya localizada). */
  userHref?: (username: string) => string;
}

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Una dirección sin el signo de puntuación que suele ir pegado detrás («mira https://x.com.»). */
function trimUrl(url: string): [string, string] {
  const m = /[.,;:!?)\]]+$/.exec(url);
  return m ? [url.slice(0, -m[0].length), m[0]] : [url, ''];
}

function trozo(text: string, cites: Map<string, CiteCard>, labels: CiteLabels, opts: BodyOptions): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    out += escapeHtml(text.slice(last, m.index));
    last = m.index! + m[0].length;
    if (m[1]) {
      const c = cites.get(citeKey(m[1] as CiteKind, m[2]));
      out += c
        ? `<a href="${escapeHtml(c.href)}" class="forum-cite-inline">${escapeHtml(c.title)}</a>`
        : `<span class="forum-cite-missing">${escapeHtml(labels.missing)}</span>`;
    } else if (m[3]) {
      const [url, cola] = trimUrl(m[3]);
      out += `<a href="${escapeHtml(url)}" rel="ugc nofollow noopener" target="_blank">${escapeHtml(url)}</a>${escapeHtml(cola)}`;
    } else {
      const u = m[4].toLowerCase();
      out += opts.users?.has(u) && opts.userHref
        ? `<a href="${escapeHtml(opts.userHref(u))}" class="forum-mention">@${escapeHtml(u)}</a>`
        : escapeHtml(m[0]);
    }
  }
  return out + escapeHtml(text.slice(last));
}

/** Una línea: los spoilers tapados y, dentro y fuera de ellos, citas, enlaces y menciones. */
function inline(text: string, cites: Map<string, CiteCard>, labels: CiteLabels, opts: BodyOptions): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(SPOILER)) {
    out += trozo(text.slice(last, m.index), cites, labels, opts);
    last = m.index! + m[0].length;
    if (m[1].trim()) {
      out += `<span class="forum-spoiler" role="button" tabindex="0" aria-expanded="false" title="${escapeHtml(labels.spoiler)}">${trozo(m[1], cites, labels, opts)}</span>`;
    }
  }
  return out + trozo(text.slice(last), cites, labels, opts);
}

function card(c: CiteCard | undefined, labels: CiteLabels): string {
  if (!c) return `<p class="forum-cite-missing">${escapeHtml(labels.missing)}</p>`;
  const img = c.image
    ? `<img src="${escapeHtml(c.image)}" alt="" loading="lazy" decoding="async" class="forum-cite-img">`
    : `<span class="forum-cite-img forum-cite-noimg" aria-hidden="true"></span>`;
  const ver = c.watchHref ? `<a href="${escapeHtml(c.watchHref)}" class="forum-cite-watch">▶ ${escapeHtml(labels.watch)}</a>` : '';
  return (
    `<div class="forum-cite" data-kind="${c.kind}">${img}<div class="forum-cite-text">` +
    `<span class="forum-cite-kind">${escapeHtml(labels[c.kind])}</span>` +
    `<a href="${escapeHtml(c.href)}" class="forum-cite-title">${escapeHtml(c.title)}</a>` +
    (c.meta ? `<span class="forum-cite-meta">${escapeHtml(c.meta)}</span>` : '') +
    ver +
    `</div></div>`
  );
}

/** El HTML de un mensaje. Pura. */
export function renderForumBody(body: string, cites: Map<string, CiteCard>, labels: CiteLabels, opts: BodyOptions = {}): string {
  const out: string[] = [];
  let parrafo: string[] = [];
  let cita: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) out.push(`<p>${parrafo.map((l) => inline(l, cites, labels, opts)).join('<br>')}</p>`);
    parrafo = [];
  };
  const cerrarCita = () => {
    if (cita.length) out.push(`<blockquote>${cita.map((l) => inline(l, cites, labels, opts)).join('<br>')}</blockquote>`);
    cita = [];
  };
  for (const raw of spoilerLines(body.replace(/\r\n?/g, '\n').split('\n'))) {
    const linea = raw.trimEnd();
    if (/^\s*>/.test(linea)) {
      cerrarParrafo();
      cita.push(linea.replace(/^\s*>\s?/, ''));
      continue;
    }
    cerrarCita();
    const sola = CITE_LINE.exec(linea.trim());
    if (sola) {
      cerrarParrafo();
      out.push(card(cites.get(citeKey(sola[1] as CiteKind, sola[2])), labels));
    } else if (!linea.trim()) cerrarParrafo();
    else parrafo.push(linea);
  }
  cerrarParrafo();
  cerrarCita();
  return out.join('');
}

/**
 * Texto para resúmenes, avisos y datos estructurados: las citas por su título,
 * sin marcas y con lo de los spoilers fuera (ni en Notificaciones ni en Google
 * se destripa nada). Pura.
 */
export function plainForumBody(body: string, cites: Map<string, CiteCard>): string {
  return body
    .replace(/\[spoiler\][\s\S]*?(\[\/spoiler\]|$)/gi, '[…]')
    .replace(new RegExp(CITE_SRC, 'g'), (_m, k: CiteKind, id: string) => cites.get(citeKey(k, id))?.title ?? '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lo que se mete en la caja al pulsar «Citar» en un mensaje: cada línea con
 * `>` y quién lo dijo delante. Corta en 400 caracteres: se cita para situar,
 * el original sigue enlazado justo encima. Pura.
 */
export function quoteFor(username: string, text: string, max = 400): string {
  const limpio = text.replace(/\r\n?/g, '\n').trim();
  const corto = limpio.length > max ? `${limpio.slice(0, max).trimEnd()}…` : limpio;
  return [`@${username}:`, ...corto.split('\n')].map((l) => `> ${l}`.trimEnd()).join('\n') + '\n\n';
}
