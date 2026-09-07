/**
 * Punto de entrada del registro de cachés — SOLO SERVIDOR.
 *
 * El registro solo conoce las cachés de los módulos que alguien haya importado,
 * y Astro carga los trozos del servidor bajo demanda: al abrir el panel,
 * `films.ts` podría no estar cargado todavía y la lista mostraría 4 cachés de
 * 11. Peor aún, cambiaría entre refrescos según qué páginas hubieran visitado
 * los usuarios mientras tanto. Una tabla que se reordena sola es peor que no
 * tener la tabla.
 *
 * Importarlos aquí de forma explícita fija la lista. Son imports por efecto
 * secundario —el módulo se registra al evaluarse— y todos son módulos de
 * servidor que ya están en el bundle SSR, así que no añaden peso.
 *
 * El endpoint y la página importan SOLO de aquí, nunca de `cache-registry.ts`.
 */
import './films';
import './tmdb';
import './people';
import './stats';
import './recs';
import './featured';
import './cinemas';
import './ratelimit';
import './probes';

export { listCaches, clearCache, clearAllCaches } from './cache-registry';
export type { CacheInfo } from './cache-registry';
