import { describe, it, expect } from 'vitest';
import { extractWatchProviders, providerLogoUrl, WATCH_TYPES, type TmdbRegionProviders } from '../src/lib/tmdb';

/** Ficha mínima con el bloque de proveedores que devuelve TMDB. */
const movie = (results: Record<string, TmdbRegionProviders>) =>
  ({ id: 1, title: 'X', 'watch/providers': { results } }) as never;

const netflix = { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png', display_priority: 0 };
const filmin = { provider_id: 63, provider_name: 'Filmin', logo_path: '/f.png', display_priority: 8 };
const rakuten = { provider_id: 35, provider_name: 'Rakuten TV', logo_path: null, display_priority: 9 };

describe('extractWatchProviders', () => {
  it('aplana las modalidades de TMDB a las nuestras', () => {
    const m = movie({
      ES: { link: 'https://jw/es', flatrate: [netflix], rent: [rakuten], buy: [rakuten], ads: [rakuten], free: [filmin] },
    });
    const out = extractWatchProviders(m, ['ES']);
    expect(out.ES.link).toBe('https://jw/es');
    expect(out.ES.providers.map((p) => `${p.name}:${p.type}`)).toEqual([
      'Netflix:sub',
      'Filmin:free',
      'Rakuten TV:ads',
      'Rakuten TV:rent',
      'Rakuten TV:buy',
    ]);
  });

  it('respeta el orden de modalidades (suscripción antes que compra)', () => {
    const m = movie({ ES: { buy: [rakuten], flatrate: [netflix] } });
    const tipos = extractWatchProviders(m, ['ES']).ES.providers.map((p) => p.type);
    // El índice de cada tipo en WATCH_TYPES nunca decrece.
    const idx = tipos.map((t) => WATCH_TYPES.indexOf(t));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it('ordena por relevancia local (display_priority) dentro de una modalidad', () => {
    const m = movie({ ES: { flatrate: [filmin, netflix] } });
    expect(extractWatchProviders(m, ['ES']).ES.providers.map((p) => p.name)).toEqual(['Netflix', 'Filmin']);
  });

  it('no repite la misma plataforma en la misma modalidad', () => {
    const m = movie({ ES: { flatrate: [netflix, netflix] } });
    expect(extractWatchProviders(m, ['ES']).ES.providers).toHaveLength(1);
  });

  it('la misma plataforma SÍ puede aparecer en dos modalidades', () => {
    const m = movie({ ES: { rent: [rakuten], buy: [rakuten] } });
    expect(extractWatchProviders(m, ['ES']).ES.providers).toHaveLength(2);
  });

  it('se queda solo con las regiones pedidas', () => {
    const m = movie({ ES: { flatrate: [netflix] }, US: { flatrate: [netflix] }, JP: { flatrate: [netflix] } });
    expect(Object.keys(extractWatchProviders(m, ['ES', 'US'])).sort()).toEqual(['ES', 'US']);
  });

  it('omite las regiones sin nada (no ocupan sitio en la caché)', () => {
    const m = movie({ ES: { flatrate: [netflix] } });
    const out = extractWatchProviders(m, ['ES', 'MX']);
    expect(out.MX).toBeUndefined();
    expect(Object.keys(out)).toEqual(['ES']);
  });

  it('BORRA el bloque en bruto: es lo que evita duplicar films_cache', () => {
    const m = movie({ ES: { flatrate: [netflix] } });
    extractWatchProviders(m, ['ES']);
    expect((m as Record<string, unknown>)['watch/providers']).toBeUndefined();
  });

  it('una película sin datos de disponibilidad no rompe nada', () => {
    const sinBloque = { id: 1, title: 'X' } as never;
    expect(extractWatchProviders(sinBloque, ['ES'])).toEqual({});
  });

  it('ignora modalidades desconocidas que TMDB pueda añadir', () => {
    const m = movie({ ES: { flatrate: [netflix], flatrate_and_buy: [rakuten] } as TmdbRegionProviders });
    expect(extractWatchProviders(m, ['ES']).ES.providers.map((p) => p.name)).toEqual(['Netflix']);
  });
});

describe('providerLogoUrl', () => {
  it('compone la URL de TMDB con el tamaño pedido', () => {
    expect(providerLogoUrl('/n.png', 'w45')).toBe('https://image.tmdb.org/t/p/w45/n.png');
    expect(providerLogoUrl('/n.png')).toBe('https://image.tmdb.org/t/p/w92/n.png');
  });

  it('sin logo devuelve null (la plantilla muestra solo el nombre)', () => {
    expect(providerLogoUrl(null)).toBeNull();
  });
});
