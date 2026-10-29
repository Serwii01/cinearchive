import { describe, it, expect } from 'vitest';
import { alertableProviders, newArrivals, wantsProvider } from '../src/lib/streamalerts';
import type { WatchAvailability, WatchProvider } from '../src/lib/tmdb';

const p = (id: number, type: WatchProvider['type'], name = `P${id}`): WatchProvider => ({ id, name, logo: null, type });
const av = (providers: WatchProvider[]): WatchAvailability => ({ region: 'ES', link: null, providers });

describe('alertableProviders', () => {
  it('solo suscripción, gratis y con anuncios, sin repetir plataforma', () => {
    const out = alertableProviders(av([p(8, 'sub', 'Netflix'), p(2, 'rent'), p(3, 'buy'), p(8, 'ads'), p(300, 'free'), p(9, 'ads')]));
    expect(out.map((x) => x.id)).toEqual([8, 300, 9]);
  });
  it('sin datos de la región, nada', () => {
    expect(alertableProviders(undefined)).toEqual([]);
  });
});

describe('newArrivals', () => {
  it('lo que no estaba en la foto anterior', () => {
    expect(newArrivals([8], [p(8, 'sub'), p(119, 'sub')]).map((x) => x.id)).toEqual([119]);
  });
  it('la primera vez que se mira no hay novedades', () => {
    expect(newArrivals(null, [p(8, 'sub')])).toEqual([]);
  });
  it('si se va de una plataforma no es un aviso', () => {
    expect(newArrivals([8, 119], [p(8, 'sub')])).toEqual([]);
  });
});

describe('wantsProvider', () => {
  it('sin plataformas elegidas avisa de todas', () => {
    expect(wantsProvider([], 8)).toBe(true);
  });
  it('con plataformas elegidas, solo de esas', () => {
    expect(wantsProvider([8, 337], 337)).toBe(true);
    expect(wantsProvider([8, 337], 119)).toBe(false);
  });
});
