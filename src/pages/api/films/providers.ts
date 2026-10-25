import type { APIRoute } from 'astro';
import { getProviderOptions, providerLogoUrl } from '../../../lib/tmdb';
import { WATCH_REGIONS } from '../../../data/countries';
import { locales, normalizeLang } from '../../../i18n/ui';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

/**
 * Plataformas que operan en una región, para el filtro «dónde ver» de
 * Descubrir.
 *
 * Existe para que elegir el país enseñe sus servicios AL MOMENTO. Antes la
 * lista se pintaba solo en el servidor, con la región ya en la URL: había que
 * elegir país, pulsar «Aplicar», esperar a que recargara la página entera y
 * entonces aparecían las casillas. Dos pasos para una pregunta que es una.
 *
 * Sin JavaScript sigue funcionando igual que antes (la página las pinta al
 * aplicar), así que esto es una mejora, no un requisito.
 */
export const GET: APIRoute = async ({ request, url }) => {
  if (!rateLimit(`providers:${clientIp(request)}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  }

  const region = (url.searchParams.get('region') ?? '').toUpperCase();
  if (!(WATCH_REGIONS as readonly string[]).includes(region)) {
    return new Response(JSON.stringify({ error: 'bad_region' }), { status: 400 });
  }

  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  const options = await getProviderOptions(region, locales[lang]);

  return new Response(
    JSON.stringify({
      region,
      providers: options.map((p) => ({ id: p.id, name: p.name, logo: providerLogoUrl(p.logo, 'w45') })),
    }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // El catálogo de plataformas de un país cambia muy poco: una hora en el
        // navegador y un día en el servidor (lo cachea getProviderOptions).
        'cache-control': 'public, max-age=3600',
      },
    },
  );
};
