import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { db } from '../../../../../db/client';
import { profile, userFilms } from '../../../../../db/schema';
import { getProfileByUsername } from '../../../../../lib/social';
import { getFilmsBrief } from '../../../../../lib/films';
import { normalizeLang, localizePath } from '../../../../../i18n/ui';
import { buildReviewBackground, renderReviewStory, type ReviewStoryData } from '../../../../../lib/og/story';

export const prerender = false;

/**
 * GET — imagen de historia (1080×1920 PNG) de una RESEÑA, para compartir en
 * Instagram. Pública, pero SOLO para perfiles públicos (los privados devuelven 404,
 * como el perfil): no se filtra actividad de cuentas privadas. Se cachea 1 h.
 */
export const GET: APIRoute = async ({ params, url, site }) => {
  const target = await getProfileByUsername(params.username ?? '');
  if (!target || target.isPrivate) return new Response(null, { status: 404 });

  const tmdbId = Number((params.tmdbId ?? '').replace(/\.png$/, ''));
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return new Response(null, { status: 404 });

  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);

  // La reseña: solo existe si hay valoración o comentario.
  const [row] = await db
    .select({ rating: userFilms.rating, note: userFilms.note })
    .from(userFilms)
    .where(and(eq(userFilms.userId, target.userId), eq(userFilms.tmdbId, tmdbId)))
    .limit(1);
  if (!row || (row.rating == null && !row.note)) return new Response(null, { status: 404 });

  // Ficha básica (título, director, año, cartel).
  const brief = (await getFilmsBrief([tmdbId], lang)).get(tmdbId);
  const meta = [brief?.director, brief?.year].filter(Boolean).join(' · ') || null;

  // Cartel: se descarga una vez (a w500) y se usa para el fondo difuminado y para
  // el primer plano nítido.
  let posterBuf: Buffer | null = null;
  if (brief?.poster) {
    try {
      const res = await fetch(brief.poster.replace('/w185', '/w500'));
      if (res.ok) posterBuf = Buffer.from(await res.arrayBuffer());
    } catch {
      /* cartel no disponible → fondo oscuro */
    }
  }
  let posterDataUrl: string | null = null;
  if (posterBuf) {
    try {
      const png = await sharp(posterBuf).resize(384, 576, { fit: 'cover' }).png().toBuffer();
      posterDataUrl = `data:image/png;base64,${png.toString('base64')}`;
    } catch {
      /* cartel ilegible → hueco de grano */
    }
  }

  // Avatar → PNG cuadrado en data URL (o iniciales como respaldo).
  let avatarDataUrl: string | null = null;
  if (target.avatarType) {
    const [av] = await db
      .select({ avatar: profile.avatar })
      .from(profile)
      .where(eq(profile.userId, target.userId))
      .limit(1);
    const buf = av?.avatar as Buffer | null | undefined;
    if (buf) {
      try {
        const png = await sharp(buf).resize(84, 84, { fit: 'cover' }).png().toBuffer();
        avatarDataUrl = `data:image/png;base64,${png.toString('base64')}`;
      } catch {
        /* avatar ilegible → iniciales */
      }
    }
  }
  const initials = (target.name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  // QR a la URL canónica de la reseña.
  const base = site ?? new URL('https://cinearchive.es');
  const reviewUrl = new URL(localizePath(lang, `u/${target.username}/review/${tmdbId}`), base).href;
  const qrDataUrl = await QRCode.toDataURL(reviewUrl, {
    margin: 1,
    width: 320,
    color: { dark: '#0d0d0d', light: '#ffffff' },
  });

  const note = row.note ? (row.note.length > 200 ? row.note.slice(0, 200).trimEnd() + '…' : row.note) : null;

  const data: ReviewStoryData = {
    title: (brief?.title ?? `#${tmdbId}`).slice(0, 80),
    meta,
    rating: row.rating ?? null,
    note,
    name: target.name.slice(0, 40),
    username: target.username,
    avatarDataUrl,
    initials,
    posterDataUrl,
    qrDataUrl,
  };

  try {
    const background = await buildReviewBackground(posterBuf);
    const png = await renderReviewStory(data, background);
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('review story image error', err);
    return new Response(null, { status: 500 });
  }
};
