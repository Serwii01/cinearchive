/**
 * Generación de la imagen de historia (1080×1920) para compartir un perfil en
 * Instagram — SOLO SERVIDOR. Reúne un fondo de collage de carteles (difuminado y
 * oscurecido con sharp), y un primer plano vectorial (avatar, nombre, @usuario,
 * stats, QR y URL) maquetado con Satori → SVG → PNG (resvg). Ambos se componen con
 * sharp en el PNG final. Satori convierte el texto en trazos, así que resvg no
 * necesita fuentes: solo rasteriza.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { EB_GARAMOND_600, SPACE_MONO_400, SPACE_MONO_700 } from './fonts.data';

export const STORY_W = 1080;
export const STORY_H = 1920;

// --- Fuentes (TTF de marca en base64; se decodifican una vez y se cachean) ----
type Font = { name: string; data: Buffer; weight: 400 | 600 | 700; style: 'normal' };
let fontsCache: Font[] | null = null;
function fonts(): Font[] {
  if (!fontsCache) {
    fontsCache = [
      { name: 'EB Garamond', data: Buffer.from(EB_GARAMOND_600, 'base64'), weight: 600, style: 'normal' },
      { name: 'Space Mono', data: Buffer.from(SPACE_MONO_400, 'base64'), weight: 400, style: 'normal' },
      { name: 'Space Mono', data: Buffer.from(SPACE_MONO_700, 'base64'), weight: 700, style: 'normal' },
    ];
  }
  return fontsCache;
}

// --- Mini-hiperscript para Satori (evita necesitar JSX en un .ts) ------------
type Style = Record<string, string | number>;
type Node = { type: string; props: Record<string, unknown> } | string | null | false;
function el(type: string, style: Style, children?: Node | Node[]): Node {
  const kids = Array.isArray(children) ? children.filter(Boolean) : children;
  return { type, props: { style, children: kids } };
}
function img(src: string, size: number, style: Style): Node {
  return { type: 'img', props: { src, width: size, height: size, style: { width: size, height: size, ...style } } };
}

// Paleta de marca (modo oscuro).
const OCHRE = '#f2be1d';
const INK = '#f4f4f4';
const MUTED = '#a89f8c';

export interface StoryData {
  name: string;
  username: string;
  bio: string | null;
  stats: { value: string; label: string }[]; // ya formateadas y etiquetadas
  genres: string | null;
  avatarDataUrl: string | null; // PNG data URL, o null → iniciales
  initials: string;
  qrDataUrl: string;
}

function statCell(value: string, label: string): Node {
  return el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }, [
    el('div', { fontFamily: 'EB Garamond', fontWeight: 600, fontSize: 74, color: '#ffffff', lineHeight: 1 }, value),
    el('div', { fontFamily: 'Space Mono', fontWeight: 400, fontSize: 20, letterSpacing: '0.18em', color: MUTED }, label.toUpperCase()),
  ]);
}

function foreground(d: StoryData): Node {
  const divider = () => el('div', { width: 1, height: 64, background: 'rgba(255,255,255,0.16)' }, '');
  const statNodes: Node[] = [];
  d.stats.forEach((s, i) => {
    if (i > 0) statNodes.push(divider());
    statNodes.push(statCell(s.value, s.label));
  });

  const avatar = d.avatarDataUrl
    ? img(d.avatarDataUrl, 248, { border: `3px solid ${OCHRE}`, objectFit: 'cover' })
    : el(
        'div',
        {
          width: 248, height: 248, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#1a1a1a', border: `3px solid ${OCHRE}`, fontFamily: 'EB Garamond', fontWeight: 600,
          fontSize: 112, color: INK,
        },
        d.initials,
      );

  return el(
    'div',
    {
      width: STORY_W, height: STORY_H, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '104px 88px', fontFamily: 'Space Mono', color: INK,
    },
    [
      // Cabecera: wordmark + etiqueta.
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
        el('div', { fontFamily: 'Space Mono', fontWeight: 700, fontSize: 28, letterSpacing: '0.28em', color: OCHRE }, 'CINE ARCHIVE'),
        el('div', { fontFamily: 'Space Mono', fontWeight: 400, fontSize: 22, letterSpacing: '0.22em', color: MUTED }, 'PERFIL'),
      ]),
      // Bloque central: avatar + nombre + @usuario + bio.
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }, [
        avatar,
        el('div', { display: 'flex', maxWidth: 880, fontFamily: 'EB Garamond', fontWeight: 600, fontSize: 94, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.04, textAlign: 'center' }, d.name),
        el('div', { display: 'flex', fontFamily: 'Space Mono', fontWeight: 400, fontSize: 34, color: OCHRE }, `@${d.username}`),
        d.bio ? el('div', { display: 'flex', maxWidth: 780, fontFamily: 'Space Mono', fontWeight: 400, fontSize: 26, color: '#d7cfbe', lineHeight: 1.5, textAlign: 'center' }, d.bio) : null,
      ]),
      // Stats + géneros.
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }, [
        el('div', { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 56 }, statNodes),
        d.genres ? el('div', { display: 'flex', fontFamily: 'Space Mono', fontWeight: 400, fontSize: 24, letterSpacing: '0.06em', color: MUTED }, d.genres) : null,
      ]),
      // Pie: QR + URL.
      el('div', { display: 'flex', alignItems: 'center', gap: 30 }, [
        img(d.qrDataUrl, 156, { border: '8px solid #ffffff', background: '#ffffff' }),
        el('div', { display: 'flex', flexDirection: 'column', gap: 8 }, [
          el('div', { fontFamily: 'Space Mono', fontWeight: 700, fontSize: 36, color: OCHRE }, 'cinearchive.es'),
          el('div', { fontFamily: 'Space Mono', fontWeight: 400, fontSize: 28, color: INK }, `/u/${d.username}`),
        ]),
      ]),
    ],
  );
}

/** Construye el fondo: collage de carteles difuminado y oscurecido, o fondo sólido. */
export async function buildBackground(posters: Buffer[]): Promise<Buffer> {
  const solid = () =>
    sharp({ create: { width: STORY_W, height: STORY_H, channels: 4, background: '#0d0d0d' } }).png().toBuffer();
  if (posters.length === 0) return solid();

  const cols = 3, rows = 4;
  const cw = Math.ceil(STORY_W / cols); // 360
  const ch = Math.ceil(STORY_H / rows); // 480
  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const src = posters[i % posters.length];
    try {
      const tile = await sharp(src).resize(cw, ch, { fit: 'cover' }).toBuffer();
      composites.push({ input: tile, left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
    } catch {
      /* cartel ilegible: se omite ese hueco (queda el fondo oscuro debajo) */
    }
  }
  if (composites.length === 0) return solid();

  const mosaic = await sharp({ create: { width: STORY_W, height: STORY_H, channels: 4, background: '#0d0d0d' } })
    .composite(composites)
    .png()
    .toBuffer();

  // Oscurecido uniforme + degradado vertical (viñeta) para legibilidad del texto.
  const darken = await sharp({ create: { width: STORY_W, height: STORY_H, channels: 4, background: { r: 5, g: 5, b: 5, alpha: 0.6 } } }).png().toBuffer();
  const grad = Buffer.from(
    `<svg width="${STORY_W}" height="${STORY_H}" xmlns="http://www.w3.org/2000/svg"><defs>` +
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#000" stop-opacity="0.6"/>` +
      `<stop offset="0.4" stop-color="#000" stop-opacity="0.12"/>` +
      `<stop offset="0.72" stop-color="#000" stop-opacity="0.35"/>` +
      `<stop offset="1" stop-color="#000" stop-opacity="0.9"/>` +
      `</linearGradient></defs><rect width="${STORY_W}" height="${STORY_H}" fill="url(#g)"/></svg>`,
  );
  return sharp(mosaic).blur(18).composite([{ input: darken }, { input: grad }]).png().toBuffer();
}

/** Renderiza el primer plano con Satori y lo compone sobre el fondo → PNG final. */
export async function renderProfileStory(data: StoryData, background: Buffer): Promise<Buffer> {
  const svg = await satori(foreground(data) as never, { width: STORY_W, height: STORY_H, fonts: fonts() });
  const fg = new Resvg(svg, { background: 'rgba(0,0,0,0)' }).render().asPng();
  return sharp(background).composite([{ input: fg }]).png().toBuffer();
}
