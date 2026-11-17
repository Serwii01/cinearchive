import data from '../data/critica.json';
import { pdFilms } from './pdfilms';
import { periodicals } from './periodicals';
import type { Lang } from '../i18n/ui';

/**
 * «La crítica de su época»: lo que dijo la prensa de una película de Cine
 * abierto cuando se estrenó, con el fragmento original (de dominio público) y
 * el enlace a la página escaneada en Internet Archive.
 *
 * Los candidatos los busca scripts/fetch-critica.mjs; lo que entra aquí está
 * leído y elegido a mano (critica.json). Es lo que no tiene ninguna otra web de
 * cine, y lo que hace que una ficha no sea una copia más de TMDB.
 */
export interface Critica {
  /** Película de Cine abierto (id de pdfilms.json). */
  film: string;
  /** Número de revista en Internet Archive. */
  ia: string;
  /** Cabecera tal como se conoce («Variety», «Photoplay»…). */
  revista: string;
  /** Fecha del número, AAAA-MM-DD (o AAAA-MM si es mensual). */
  fecha: string;
  /** Página del escaneo: índice del visor de Internet Archive (/page/n…), desde 0. */
  pagina: number;
  /** Número impreso en la página, si se lee: es el que se enseña. */
  impresa?: number;
  /** Firma, si la hay («Sime», «Mordaunt Hall»…). */
  autor?: string;
  /** Idioma del fragmento (en, es, de…). */
  lang: string;
  /** El fragmento, copiado del escaneo y limpio de erratas del OCR. */
  texto: string;
  /** Qué dice, en una o dos frases, en cada idioma de la web. */
  nota_es: string;
  nota_en: string;
  nota_gl: string;
  nota_eu: string;
  nota_ca: string;
}

export const criticas = (data.items as Critica[]).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));

/** Largo máximo de un fragmento: una cita, no la revista entera. */
export const TEXTO_MAX = 1400;

export function criticasDe(filmId: string, list: Critica[] = criticas): Critica[] {
  return list.filter((c) => c.film === filmId);
}

/** Para las fichas de TMDB: las críticas de la película de Cine abierto con ese id de TMDB. */
export function criticasDeTmdb(tmdbId: number, list: Critica[] = criticas): Critica[] {
  const pelis = new Set(pdFilms.filter((f) => f.tmdbId === tmdbId).map((f) => f.id));
  return pelis.size ? list.filter((c) => pelis.has(c.film)) : [];
}

/** Las de un número de la hemeroteca, para enlazar desde su página. */
export function criticasEnNumero(ia: string, list: Critica[] = criticas): Critica[] {
  return list.filter((c) => c.ia === ia);
}

export function paginaUrl(c: Pick<Critica, 'ia' | 'pagina'>): string {
  return `https://archive.org/details/${encodeURIComponent(c.ia)}/page/n${c.pagina}/mode/1up`;
}

/** El número está también en nuestra hemeroteca: mejor enlazar a casa. */
export function numeroPropio(ia: string): boolean {
  return periodicals.some((p) => p.id === ia);
}

export function notaDe(c: Critica, lang: Lang): string {
  return (c as unknown as Record<string, string>)[`nota_${lang}`] || c.nota_es;
}

/** «28 de septiembre de 1927» o «septiembre de 1927», en el idioma de la página. */
export function fechaCritica(fecha: string, lang: Lang): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const opts: Intl.DateTimeFormatOptions = d ? { day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' };
  try {
    return new Intl.DateTimeFormat(lang, { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, (m || 1) - 1, d || 1)));
  } catch {
    return fecha;
  }
}

/** Errores de los datos (los usa el test): mejor fallar en la CI que enseñar una cita rota. */
export function problemas(list: Critica[] = criticas): string[] {
  const out: string[] = [];
  const ids = new Set(pdFilms.map((f) => f.id));
  const vistas = new Set<string>();
  for (const c of list) {
    const k = `${c.film} · ${c.ia}`;
    if (!ids.has(c.film)) out.push(`${k}: la película no está en Cine abierto`);
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(c.fecha)) out.push(`${k}: fecha «${c.fecha}»`);
    if (!Number.isInteger(c.pagina) || c.pagina < 0) out.push(`${k}: página`);
    if (!c.texto?.trim() || c.texto.length > TEXTO_MAX) out.push(`${k}: texto vacío o de más de ${TEXTO_MAX}`);
    for (const l of ['es', 'en', 'gl', 'eu', 'ca']) {
      if (!(c as unknown as Record<string, string>)[`nota_${l}`]?.trim()) out.push(`${k}: falta nota_${l}`);
    }
    const dup = `${k} · ${c.pagina}`;
    if (vistas.has(dup)) out.push(`${k}: repetida`);
    vistas.add(dup);
  }
  return out;
}
