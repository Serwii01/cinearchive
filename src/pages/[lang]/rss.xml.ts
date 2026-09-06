import type { APIRoute } from 'astro';
import { CHANGELOG } from '../../data/changelog';
import { languages, useTranslations, localizePath, locales, normalizeLang, type Lang } from '../../i18n/ui';

export const prerender = true;

export function getStaticPaths() {
  return Object.keys(languages).map((lang) => ({ params: { lang } }));
}

/**
 * Feed RSS de novedades del sitio, uno por idioma (/es/rss.xml, /en/rss.xml…).
 *
 * Se alimenta del changelog, que es el único contenido con FECHA real: el resto
 * del archivo (dosieres, hemeroteca, biblioteca) es un catálogo curado, no un
 * flujo cronológico, y meterlo aquí solo generaría entradas falsamente "nuevas".
 *
 * Es el canal de retorno que encaja con la casa: sin cuentas, sin rastreadores y
 * sin depender de ninguna red social.
 */

const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fecha RFC-822, que es la que exige RSS 2.0 (distinta del ISO del sitemap). */
const rfc822 = (iso: string): string => new Date(`${iso}T12:00:00Z`).toUTCString();

export const GET: APIRoute = ({ params, site }) => {
  const lang: Lang = normalizeLang(params.lang);
  const t = useTranslations(lang);
  const base = site ?? new URL('https://cinearchive.es');
  const abs = (path: string) => new URL(path, base).href;

  const home = abs(localizePath(lang));
  const self = abs(`${localizePath(lang)}/rss.xml`);

  const items = CHANGELOG.map((release) => {
    // Ancla estable en la página de novedades: cada versión tiene su id.
    const link = `${abs(localizePath(lang, 'changelog'))}#v${release.version}`;
    const body = release.changes[lang]
      .map((c) => `<li>${xmlEscape(c)}</li>`)
      .join('');
    return [
      '    <item>',
      `      <title>${xmlEscape(`v${release.version} — ${release.title[lang]}`)}</title>`,
      `      <link>${xmlEscape(link)}</link>`,
      // El guid nunca cambia aunque se reescriba el texto: los lectores no
      // vuelven a marcar como nueva una entrada ya leída.
      `      <guid isPermaLink="false">${xmlEscape(`cinearchive:${lang}:${release.version}`)}</guid>`,
      `      <pubDate>${rfc822(release.date)}</pubDate>`,
      `      <description>${xmlEscape(`<ul>${body}</ul>`)}</description>`,
      '    </item>',
    ].join('\n');
  });

  const latest = CHANGELOG[0];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xmlEscape(`${t('site.title')} — ${t('changelog.title')}`)}</title>`,
    `    <link>${xmlEscape(home)}</link>`,
    `    <description>${xmlEscape(t('changelog.intro'))}</description>`,
    `    <language>${locales[lang]}</language>`,
    latest ? `    <lastBuildDate>${rfc822(latest.date)}</lastBuildDate>` : '',
    `    <atom:link href="${xmlEscape(self)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
