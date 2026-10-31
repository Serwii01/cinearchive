/**
 * Botón «← volver» de las fichas — SOLO CLIENTE.
 *
 * El servidor pinta el enlace hacia la página de la que se viene (cabecera
 * Referer, ver lib/backlink.ts). Entre dos fichas eso hacía un bucle: de la
 * película A a una parecida B, B ofrece «volver a la película» (A), y al llegar
 * a A por ese enlace su Referer ya es B, así que A ofrece volver a B, y así
 * siempre. Lo mismo entre película y persona.
 *
 * Cuando el enlace apunta justo a la página anterior del historial, lo correcto
 * es retroceder en vez de navegar hacia delante: así A vuelve a ser la A
 * original, con su botón hacia la búsqueda o la sección de la que se partió.
 */
import { canGoBack } from './standalone';

/**
 * Si `href` lleva a la misma página (ruta y consulta) que `referrer` dentro de
 * este sitio. El fragmento (#…) no cuenta: es la misma página.
 */
export function pointsToPrevious(href: string, referrer: string, origin: string): boolean {
  if (!referrer) return false;
  try {
    const target = new URL(href, origin);
    const prev = new URL(referrer);
    return (
      prev.origin === origin &&
      target.origin === origin &&
      target.pathname.replace(/\/$/, '') === prev.pathname.replace(/\/$/, '') &&
      target.search === prev.search
    );
  } catch {
    return false;
  }
}

/** Engancha los enlaces marcados con `data-back`. */
export function wireBackLinks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLAnchorElement>('a[data-back]').forEach((a) => {
    a.addEventListener('click', (e) => {
      // Con modificadores (abrir en pestaña nueva…) se respeta el enlace.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!canGoBack() || !pointsToPrevious(a.href, document.referrer, location.origin)) return;
      e.preventDefault();
      history.back();
    });
  });
}
