import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// La cabecera daba saltos al cargar cada página (8-11-2026). Tres causas, y
// estas comprobaciones avisan si alguna vuelve.
describe('cabecera sin saltos', () => {
  it('las tres fuentes que se ven al abrir se piden desde el principio', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    for (const url of ['garamondUrl', 'geistUrl', 'spaceMonoUrl']) {
      expect(layout, url).toMatch(new RegExp(`<link rel="preload" href=\\{${url}\\} as="font"`));
    }
  });

  it('el hueco de la barra de desplazamiento está siempre reservado', () => {
    expect(readFileSync('src/styles/global.css', 'utf8')).toMatch(/scrollbar-gutter:\s*stable/);
  });

  it('los enlaces de la cuenta vienen pintados en la página, no los añade JavaScript', () => {
    const nav = readFileSync('src/components/AuthNav.astro', 'utf8');
    expect(nav).toContain('data-variant="guest"');
    expect(nav).toContain('data-variant="user"');
    expect(nav).not.toMatch(/innerHTML\s*=/);
    // Y el CSS que elige la variante existe, también para las páginas generadas de antemano.
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).toContain("html[data-auth='user'] auth-nav[data-state='auto'] [data-variant='user']");
    // theme-init.js decide antes de pintar con lo recordado.
    const init = readFileSync('public/theme-init.js', 'utf8');
    expect(init).toContain("'cine:auth'");
    expect(init).toContain("'cine:perfil'");
  });
});
