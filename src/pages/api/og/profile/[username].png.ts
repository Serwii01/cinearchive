import type { APIRoute } from 'astro';
import { and, eq, or } from 'drizzle-orm';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { db } from '../../../../db/client';
import { profile, userFilms } from '../../../../db/schema';
import { getProfileByUsername } from '../../../../lib/social';
import { getUserStats } from '../../../../lib/stats';
import { getFilmsBrief } from '../../../../lib/films';
import { normalizeLang, useTranslations, contentLang, localizePath } from '../../../../i18n/ui';
import { buildBackground, renderProfileStory, type StoryData } from '../../../../lib/og/story';

export const prerender = false;

/**
 * GET — imagen de historia (1080×1920 PNG) de un perfil, para compartir en
 * Instagram. Público, pero SOLO para perfiles públicos: los privados devuelven 404
 * (no se filtra avatar, nombre ni estadísticas). Se cachea 1 h.
 */
export const GET: APIRoute = async ({ params, url, site }) => {
  const username = (params.username ?? '').replace(/\.png$/, '');
  const target = await getProfileByUsername(username);
  if (!target || target.isPrivate) return new Response(null, { status: 404 });

  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  const t = useTranslations(lang);
  const statLocale = contentLang(lang); // 'es' | 'en' para los nombres de género

  // Datos (curados, no todo): películas vistas · horas · media + géneros.
  const stats = await getUserStats(target.userId, statLocale);
  const nf = new Intl.NumberFormat(lang);
  const statCells = [
    { value: nf.format(stats.seen), label: t('story.seen') },
    { value: nf.format(stats.hoursWatched), label: t('story.hours') },
    {
      value:
        stats.avgRating != null
          ? new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(stats.avgRating)
          : '—',
      label: t('story.rating'),
    },
  ];
  const genres = stats.topGenres.slice(0, 2).map((g) => g.label).join(' · ') || null;

  // Avatar → PNG cuadrado en data URL (o iniciales como respaldo).
  let avatarDataUrl: string | null = null;
  if (target.avatarType) {
    const [row] = await db
      .select({ avatar: profile.avatar })
      .from(profile)
      .where(eq(profile.userId, target.userId))
      .limit(1);
    const buf = row?.avatar as Buffer | null | undefined;
    if (buf) {
      try {
        const png = await sharp(buf).resize(248, 248, { fit: 'cover' }).png().toBuffer();
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

  // Fondo: carteles de películas favoritas (si no hay, el fondo cae a oscuro).
  const favRows = await db
    .select({ tmdbId: userFilms.tmdbId })
    .from(userFilms)
    .where(and(eq(userFilms.userId, target.userId), or(eq(userFilms.favorite, true), eq(userFilms.status, 'favorite'))))
    .limit(6);
  let posters: Buffer[] = [];
  if (favRows.length) {
    const briefs = await getFilmsBrief(favRows.map((r) => r.tmdbId), statLocale);
    const urls = favRows
      .map((r) => briefs.get(r.tmdbId)?.poster)
      .filter((u): u is string => !!u)
      .map((u) => u.replace('/w185', '/w500'));
    posters = (
      await Promise.all(
        urls.map(async (u) => {
          try {
            const res = await fetch(u);
            if (!res.ok) return null;
            return Buffer.from(await res.arrayBuffer());
          } catch {
            return null;
          }
        }),
      )
    ).filter((b): b is Buffer => b != null);
  }

  // QR a la URL canónica del perfil.
  const base = site ?? new URL('https://cinearchive.es');
  const profileUrl = new URL(localizePath(lang, `u/${target.username}`), base).href;
  const qrDataUrl = await QRCode.toDataURL(profileUrl, {
    margin: 1,
    width: 320,
    color: { dark: '#0d0d0d', light: '#ffffff' },
  });

  const data: StoryData = {
    name: target.name.slice(0, 40),
    username: target.username,
    bio: target.bio ? target.bio.slice(0, 120) : null,
    stats: statCells,
    genres,
    avatarDataUrl,
    initials,
    qrDataUrl,
  };

  try {
    const background = await buildBackground(posters);
    const png = await renderProfileStory(data, background);
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('story image error', err);
    return new Response(null, { status: 500 });
  }
};
