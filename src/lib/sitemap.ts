/**
 * Piezas de los sitemaps dinámicos (fichas de película y de persona). Pura:
 * las rutas de src/pages/sitemap-*.xml.ts hacen la consulta y esto el XML.
 *
 * Cada URL lleva sus versiones en otros idiomas (xhtml:link hreflang): así
 * Google sabe que /film/x y /en/film/x son la misma ficha traducida y no
 * contenido duplicado, aunque todavía no haya rastreado la página.
 */

export const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface SitemapUrl {
  loc: string;
  lastmod?: Date | null;
  /** Todas las versiones, la propia incluida: { es: url, en: url }. */
  alternates?: Record<string, string>;
  /** El idioma de x-default (el que se sirve a quien no encaja en ninguno). */
  xDefault?: string;
}

export function urlEntry(u: SitemapUrl): string {
  const lines = [`  <url>`, `    <loc>${xmlEscape(u.loc)}</loc>`];
  if (u.lastmod) lines.push(`    <lastmod>${u.lastmod.toISOString()}</lastmod>`);
  const alts = Object.entries(u.alternates ?? {});
  for (const [lang, href] of alts) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(href)}"/>`);
  }
  if (alts.length && u.xDefault && u.alternates?.[u.xDefault]) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(u.alternates[u.xDefault])}"/>`);
  }
  lines.push(`  </url>`);
  return lines.join('\n');
}

export function urlset(urls: SitemapUrl[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.map(urlEntry).join('\n') +
    (urls.length ? '\n' : '') +
    `</urlset>\n`
  );
}

/**
 * Una entrada por idioma, cada una con todas las demás como alternativas.
 * `paths` es idioma → URL absoluta.
 */
export function localizedEntries(paths: Record<string, string>, lastmod: Date | null, xDefault: string): SitemapUrl[] {
  return Object.values(paths).map((loc) => ({ loc, lastmod, alternates: paths, xDefault }));
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
