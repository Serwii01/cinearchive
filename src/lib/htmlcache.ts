/**
 * Caché de páginas HTML en memoria para visitantes sin sesión (SOLO SERVIDOR).
 *
 * lib/httpcache.ts ya marca las páginas públicas con `s-maxage` pensando en una
 * capa compartida, pero delante de la app solo está Caddy, que no guarda nada:
 * cada visita anónima y cada bot volvían a renderizar la página entera y a
 * consultar la BD. Esta es esa capa, dentro del propio proceso: un módulo de
 * caché en Caddy costaría otro contenedor o más memoria, y aquí no sobra.
 *
 * Qué se guarda lo decide httpcache.ts y no este módulo: solo las respuestas
 * que salen con `Cache-Control: public` (200, html, ruta de la lista y sin
 * sesión). Así hay una única lista de rutas cacheables.
 *
 * Con varias peticiones a la vez a una página caducada, solo una la renderiza;
 * las demás esperan a esa. Sin esto, un pico tras caducar la portada lanzaba
 * diez renders idénticos.
 */
import { registerCache } from './cache-registry';

interface CachedPage {
  body: Uint8Array<ArrayBuffer>;
  status: number;
  headers: [string, string][];
  expires: number;
}

/** Techo de memoria: la app tiene 512 MB y esto no debe acercarse. */
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_KEYS = 3000;
/** Una página más grande que esto es rara y no compensa guardarla. */
const MAX_PAGE_BYTES = 512 * 1024;
/** Consultas largas = casi siempre bots probando parámetros: no se guardan. */
const MAX_SEARCH = 200;

const store = new Map<string, CachedPage>();
const inflight = new Map<string, Promise<CachedPage | null>>();
let bytes = 0;

registerCache({
  id: 'html-pages',
  label: 'Páginas HTML (visitantes sin sesión)',
  maxKeys: MAX_KEYS,
  size: () => store.size,
  clear: () => {
    store.clear();
    bytes = 0;
  },
});

/** ¿Lleva la petición la cookie de sesión de Better Auth (prefijo `cine`)? */
export function hasSessionCookie(cookie: string | null): boolean {
  return !!cookie && /(?:^|;\s*)(?:__Secure-)?cine\.session_token=/.test(cookie);
}

/**
 * Clave de la página: ruta + consulta. Con trailingSlash 'ignore', /films y
 * /films/ son la misma página y comparten entrada. null = no cacheable.
 */
export function cacheKey(url: URL): string | null {
  if (url.search.length > MAX_SEARCH) return null;
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
  return path + url.search;
}

function drop(key: string): void {
  const old = store.get(key);
  if (!old) return;
  bytes -= old.body.byteLength;
  store.delete(key);
}

function put(key: string, page: CachedPage): void {
  drop(key);
  // El Map recuerda el orden de inserción: el primero es el menos usado.
  while (store.size && (store.size >= MAX_KEYS || bytes + page.body.byteLength > MAX_BYTES)) {
    drop(store.keys().next().value as string);
  }
  store.set(key, page);
  bytes += page.body.byteLength;
}

function toResponse(page: CachedPage, hit: boolean): Response {
  const headers = new Headers(page.headers);
  headers.set('X-Cache', hit ? 'HIT' : 'MISS');
  return new Response(page.body, { status: page.status, headers });
}

/** Solo lo que httpcache.ts declaró público, y nunca algo que fije cookies. */
function storable(res: Response): boolean {
  return (
    res.status === 200 &&
    /\bpublic\b/.test(res.headers.get('Cache-Control') ?? '') &&
    !res.headers.has('Set-Cookie')
  );
}

/**
 * Sirve `key` desde memoria si está vigente; si no, renderiza con `render`, y
 * guarda el resultado durante `ttlMs` cuando la respuesta es cacheable.
 */
export async function servePage(
  key: string,
  ttlMs: number,
  render: () => Promise<Response>,
  now: () => number = Date.now,
): Promise<Response> {
  const hit = store.get(key);
  if (hit && hit.expires > now()) {
    // Se reinserta para que cuente como usada recientemente.
    store.delete(key);
    store.set(key, hit);
    return toResponse(hit, true);
  }

  const waiting = inflight.get(key);
  if (waiting) {
    const page = await waiting;
    if (page) return toResponse(page, true);
    // El render compartido no era cacheable: esta petición hace el suyo.
    return render();
  }

  let res!: Response;
  const job = (async (): Promise<CachedPage | null> => {
    res = await render();
    if (!storable(res)) return null;
    const body = new Uint8Array(await res.arrayBuffer());
    const page: CachedPage = {
      body,
      status: res.status,
      headers: [...res.headers].filter(([k]) => k.toLowerCase() !== 'x-cache'),
      expires: now() + ttlMs,
    };
    if (body.byteLength <= MAX_PAGE_BYTES) put(key, page);
    return page;
  })();
  inflight.set(key, job);
  try {
    const page = await job;
    return page ? toResponse(page, false) : res;
  } finally {
    inflight.delete(key);
  }
}

/** Para los tests. */
export function _stats(): { keys: number; bytes: number } {
  return { keys: store.size, bytes };
}
