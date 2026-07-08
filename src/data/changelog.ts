/**
 * Historial de versiones de Cine Archive, en los cinco idiomas de la interfaz
 * (es/en/gl/eu/ca). Se muestra en /changelog, enlazado desde el pie. La primera
 * entrada es la versión actual.
 *
 * Los datos viven en `changelog.json` para que la app de administración
 * (adminscinearchive) pueda crear y editar versiones sin tocar código.
 */
import data from './changelog.json';
import type { Lang } from '../i18n/ui';

export interface Release {
  version: string;
  /** Fecha ISO (YYYY-MM-DD). Aproximada para las versiones antiguas. */
  date: string;
  title: Record<Lang, string>;
  changes: Record<Lang, string[]>;
}

export const CHANGELOG: Release[] = data as Release[];

export const CURRENT_VERSION = CHANGELOG[0].version;
