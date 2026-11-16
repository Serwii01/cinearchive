import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/db/client', () => ({ db: {} }));
const { unsubscribeToken, verifyUnsubscribe, unsubscribeUrl, buildIssueEmail } = await import('../src/lib/newsletter');
const { CURRENT_ISSUE, ISSUES } = await import('../src/data/newsletter');

describe('boletín de novedades', () => {
  it('la baja va firmada: vale para esa cuenta y no para otra', () => {
    const t = unsubscribeToken('ana');
    expect(verifyUnsubscribe('ana', t)).toBe(true);
    expect(verifyUnsubscribe('luis', t)).toBe(false);
    expect(verifyUnsubscribe('ana', t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a'))).toBe(false);
    expect(unsubscribeUrl('ana', 'gl', 'https://cinearchive.es')).toMatch(/^https:\/\/cinearchive\.es\/gl\/newsletter\/baja\?u=ana&t=/);
  });

  it('cada correo lleva la baja en un clic, la cabecera List-Unsubscribe y los enlaces en su idioma', () => {
    const c = buildIssueEmail(CURRENT_ISSUE, 'eu', 'ana', 'https://cinearchive.es');
    expect(c.headers['List-Unsubscribe']).toMatch(/^<https:\/\/cinearchive\.es\/api\/news\/unsubscribe\?u=ana&t=/);
    expect(c.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(c.html).toContain('https://cinearchive.es/eu/foro');
    expect(c.html).toContain('https://cinearchive.es/eu/estrenos#el-dia');
    expect(c.html).toContain('/eu/newsletter/baja?u=ana');
    expect(c.text).toContain('/eu/newsletter/baja?u=ana');
    expect(c.subject).toBe(CURRENT_ISSUE.copy.eu.subject);
    expect(c.replyTo).toBe('contacto@cinearchive.es');
  });

  it('el castellano va sin prefijo de idioma', () => {
    const c = buildIssueEmail(CURRENT_ISSUE, 'es', 'ana', 'https://cinearchive.es');
    expect(c.html).toContain('https://cinearchive.es/foro"');
  });

  it('cada número tiene las mismas novedades, con los mismos enlaces, en los cinco idiomas', () => {
    for (const issue of ISSUES) {
      const rutas = issue.copy.es.items.map((i) => i.path);
      for (const lang of ['en', 'gl', 'eu', 'ca'] as const) {
        expect(issue.copy[lang].items.map((i) => i.path), `${issue.id} ${lang}`).toEqual(rutas);
        expect(issue.copy[lang].subject).toBeTruthy();
      }
    }
  });

  it('la baja no se hace por GET (los antivirus del correo abren los enlaces) y el envío no repite', () => {
    const api = readFileSync('src/pages/api/news/unsubscribe.ts', 'utf8');
    expect(api).toContain('export const POST');
    expect(api).not.toContain('export const GET');
    const lib = readFileSync('src/lib/newsletter.ts', 'utf8');
    expect(lib).toContain('not exists (select 1 from');
    expect(lib).toContain('sql`coalesce(${userPreferences.newsEmail}, true)`');
    expect(lib).toContain('eq(user.emailVerified, true)');
  });

  it('el panel solo prueba con el correo del administrador y pide repetir el número para enviar', () => {
    const api = readFileSync('src/pages/api/admin/newsletter.ts', 'utf8');
    expect(api).toContain('{ id: locals.user.id, email: locals.user.email }');
    expect(api).toContain('parsed.data.confirm !== CURRENT_ISSUE.id');
  });
});
