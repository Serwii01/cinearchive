import { describe, it, expect } from 'vitest';
import { langFromRequest, verificationEmail, resetEmail, testEmail, withCallback } from '../src/lib/emails';
import { languages, defaultLang, type Lang } from '../src/i18n/ui';

const LANGS = Object.keys(languages) as Lang[];
const peticion = (headers: Record<string, string>) => new Request('https://cinearchive.es/api/auth/sign-up/email', { headers });

describe('idioma del correo', () => {
  it('sale del prefijo de la página desde la que se pidió', () => {
    expect(langFromRequest(peticion({ referer: 'https://cinearchive.es/eu/register' }))).toBe('eu');
    expect(langFromRequest(peticion({ referer: 'https://cinearchive.es/ca/forgot' }))).toBe('ca');
  });

  it('sin prefijo es castellano, que es como vive el idioma por defecto', () => {
    expect(langFromRequest(peticion({ referer: 'https://cinearchive.es/register' }))).toBe('es');
  });

  it('sin referer, mira el idioma del navegador', () => {
    expect(langFromRequest(peticion({ 'accept-language': 'gl-ES,gl;q=0.9,es;q=0.8' }))).toBe('gl');
    expect(langFromRequest(peticion({ 'accept-language': 'de-DE,de;q=0.9' }))).toBe(defaultLang);
  });

  it('sin nada, el idioma por defecto', () => {
    expect(langFromRequest()).toBe(defaultLang);
    expect(langFromRequest(peticion({ referer: 'no-es-una-url' }))).toBe(defaultLang);
  });
});

describe('correos transaccionales', () => {
  const url = 'https://cinearchive.es/api/auth/verify-email?token=abc&callbackURL=%2Fverify';

  it('están escritos en los cinco idiomas', () => {
    // En el HTML el enlace va escapado (los & se convierten en &amp;), que es lo
    // correcto dentro de un atributo; en el texto plano va tal cual.
    const escapada = url.replace(/&/g, '&amp;');
    for (const lang of LANGS) {
      for (const correo of [verificationEmail(lang, url), resetEmail(lang, url)]) {
        expect(correo.subject.trim().length, lang).toBeGreaterThan(0);
        expect(correo.html, lang).toContain(escapada);
        expect(correo.text, lang).toContain(url);
      }
    }
  });

  it('cada idioma dice algo distinto (no se ha colado el castellano en todos)', () => {
    const asuntos = new Set(LANGS.map((l) => verificationEmail(l, url).subject));
    expect(asuntos.size).toBe(LANGS.length);
  });

  it('un idioma desconocido cae en el de por defecto', () => {
    expect(verificationEmail('xx' as Lang, url).subject).toBe(verificationEmail(defaultLang, url).subject);
  });

  it('el enlace va escapado: no se puede colar HTML por la URL', () => {
    const malicioso = 'https://cinearchive.es/x?a="><script>alert(1)</script>';
    const html = resetEmail('es', malicioso).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('el de prueba lleva la dirección del sitio', () => {
    expect(testEmail('https://cinearchive.es').html).toContain('https://cinearchive.es');
  });
});

describe('withCallback', () => {
  it('cambia a dónde vuelve el enlace de confirmación', () => {
    const url = 'https://cinearchive.es/api/auth/verify-email?token=abc&callbackURL=%2F';
    expect(withCallback(url, '/eu/verify')).toContain('callbackURL=%2Feu%2Fverify');
    expect(withCallback(url, '/eu/verify')).toContain('token=abc');
  });

  it('una URL ilegible se queda como está en vez de romper el envío', () => {
    expect(withCallback('esto-no-es-una-url', '/verify')).toBe('esto-no-es-una-url');
  });
});
