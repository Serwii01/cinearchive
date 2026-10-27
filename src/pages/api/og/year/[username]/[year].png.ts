import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { getProfileByUsername } from '../../../../../lib/social';
import { loadYearReview } from '../../../../../lib/viewings';
import { normalizeLang, useTranslations, localizePath } from '../../../../../i18n/ui';
import { buildBackground, renderYearStory } from '../../../../../lib/og/story';

export const prerender = false;

/**
 * GET — imagen de historia (1080×1920 PNG) de «Tu año en cine», para
 * Instagram. Como la del perfil: SOLO perfiles públicos (los privados dan
 * 404 y no se filtra nada). Se cachea 1 h.
 */
export const GET: APIRoute = async ({ params, url, site }) => {
  const target = await getProfileByUsername(params.username ?? '');
  if (!target || target.isPrivate) return new Response(null, { status: 404 });
  const year = Number((params.year ?? '').replace(/\.png$/, ''));
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getUTCFullYear()) return new Response(null, { status: 404 });

  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  const t = useTranslations(lang);
  const { review, briefs } = await loadYearReview(target.userId, year, lang);
  if (review.viewings === 0) return new Response(null, { status: 404 });

  const nf = new Intl.NumberFormat(lang);
  const top = review.topRated.slice(0, 5).map((f) => (briefs.get(f.tmdbId)?.title ?? '').slice(0, 34)).filter(Boolean);

  // Fondo: carteles de las mejor puntuadas (o de las primeras del año si no
  // puntuó ninguna).
  const ids = review.topRated.length ? review.topRated.map((f) => f.tmdbId) : [review.first?.tmdbId, review.last?.tmdbId];
  const urls = ids
    .map((id) => (id ? briefs.get(id)?.poster : null))
    .filter((u): u is string => !!u)
    .map((u) => u.replace('/w185', '/w500'));
  const posters: Buffer[] = [];
  await Promise.all(
    urls.map(async (u) => {
      try {
        const res = await fetch(u);
        if (res.ok) posters.push(Buffer.from(await res.arrayBuffer()));
      } catch {
        /* cartel que no llega: se omite */
      }
    }),
  );

  const base = site ?? new URL('https://cinearchive.es');
  const pageUrl = new URL(localizePath(lang, `u/${target.username}/year/${year}`), base).href;
  const qrDataUrl = await QRCode.toDataURL(pageUrl, { margin: 1, width: 320, color: { dark: '#0d0d0d', light: '#ffffff' } });

  try {
    const png = await renderYearStory(
      {
        year,
        kicker: t('year.kicker'),
        username: target.username,
        stats: [
          { value: nf.format(review.films), label: t('year.films') },
          { value: nf.format(review.hours), label: t('year.hours') },
          { value: nf.format(review.rewatches), label: t('year.rewatches') },
        ],
        topLabel: t('year.topRated'),
        top,
        qrDataUrl,
      },
      await buildBackground(posters),
    );
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('year story image error', err);
    return new Response(null, { status: 500 });
  }
};
