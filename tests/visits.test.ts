import { describe, it, expect } from 'vitest';
import { esVisita, VISITAS_INICIALES } from '../src/lib/visits';

const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const peticion = (over: Partial<Parameters<typeof esVisita>[0]> = {}) =>
  esVisita({ method: 'GET', path: '/', accept: 'text/html,application/xhtml+xml', ua: NAVEGADOR, ...over });

describe('qué cuenta como visita', () => {
  it('una página pedida por un navegador', () => {
    expect(peticion()).toBe(true);
    expect(peticion({ path: '/eu/archive' })).toBe(true);
  });

  it('no cuenta la API ni los recursos', () => {
    expect(peticion({ path: '/api/visits' })).toBe(false);
    // Un .css o una imagen no piden HTML.
    expect(peticion({ path: '/_astro/index.css', accept: 'text/css,*/*;q=0.1' })).toBe(false);
    expect(peticion({ accept: 'image/avif,image/webp,*/*' })).toBe(false);
    expect(peticion({ accept: null })).toBe(false);
  });

  it('no cuenta escrituras ni sondas', () => {
    expect(peticion({ method: 'POST' })).toBe(false);
    expect(peticion({ method: 'HEAD' })).toBe(false);
  });

  it('no cuenta robots', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'facebookexternalhit/1.1',
      'curl/8.4.0',
      'python-requests/2.32',
      'Mozilla/5.0 (compatible; SemrushBot/7)',
      'HeadlessChrome/140.0',
    ]) {
      expect(peticion({ ua }), ua).toBe(false);
    }
    expect(peticion({ ua: null })).toBe(false);
    expect(peticion({ ua: '' })).toBe(false);
  });

  it('no cuenta el panel de administración, que es tráfico de casa', () => {
    expect(peticion({ path: '/admin' })).toBe(false);
    expect(peticion({ path: '/eu/admin' })).toBe(false);
    // Pero una página que empiece por «admin» y no lo sea, sí.
    expect(peticion({ path: '/administracion-de-fincas' })).toBe(true);
  });
});

describe('cifra de partida', () => {
  it('es la que traía la analítica anterior', () => {
    expect(VISITAS_INICIALES).toBe(30800);
  });
});
