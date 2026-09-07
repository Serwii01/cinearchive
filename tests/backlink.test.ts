import { describe, it, expect } from 'vitest';
import { resolveBackLink } from '../src/lib/backlink';
import { ui, type UIKey } from '../src/i18n/ui';

const t = (k: UIKey) => ui.es[k];
/** Lo que pasan las fichas: el host de la petición y el del dominio configurado. */
const HOSTS = ['cinearchive.es', 'cinearchive.es'];
const back = (referer: string | null, hosts: readonly (string | undefined)[] = HOSTS) =>
  resolveBackLink(referer, 'es', t, hosts);

describe('resolveBackLink', () => {
  it('sin referer, cae a la filmoteca', () => {
    expect(back(null)).toEqual({ href: '/films', label: ui.es['back.films'] });
  });

  it('reconoce una sección en castellano, que ya no lleva prefijo', () => {
    // Antes se exigía que el primer segmento fuese un idioma; con el castellano
    // en la raíz eso descartaba TODA la navegación interna en español.
    expect(back('https://cinearchive.es/discover')).toEqual({
      href: '/discover',
      label: ui.es['back.discover'],
    });
  });

  it('reconoce la misma sección con prefijo de idioma', () => {
    expect(back('https://cinearchive.es/en/discover').label).toBe(ui.es['back.discover']);
    expect(back('https://cinearchive.es/ca/archive').label).toBe(ui.es['back.archive']);
  });

  it('conserva la cadena de consulta para volver al listado exacto', () => {
    expect(back('https://cinearchive.es/discover?genre=27&page=3').href).toBe(
      '/discover?genre=27&page=3',
    );
  });

  it('la portada cuenta como sección', () => {
    expect(back('https://cinearchive.es/').label).toBe(ui.es['back.home']);
    expect(back('https://cinearchive.es/en').label).toBe(ui.es['back.home']);
  });

  it('un referer externo NO cuela, aunque su ruta parezca nuestra', () => {
    // google.com/search es el caso peligroso: "search" también es sección
    // nuestra, así que sin comparar el host mandaríamos al usuario a /search
    // creyendo que venía de dentro.
    expect(back('https://www.google.com/search?q=fellini')).toEqual({
      href: '/films',
      label: ui.es['back.films'],
    });
    expect(back('https://otro-sitio.example/films').href).toBe('/films');
  });

  it('compara el host, no el origen: el esquema y el puerto no cuentan', () => {
    // El navegador manda el referer público (https) mientras que la petición le
    // llega a Astro por HTTP desde Caddy, y en local ni siquiera trae el puerto.
    // Comparando orígenes, el botón se quedaba SIEMPRE en su valor de reserva.
    expect(back('https://cinearchive.es/discover').label).toBe(ui.es['back.discover']);
    expect(back('http://cinearchive.es:8080/discover').label).toBe(ui.es['back.discover']);
    expect(back('http://localhost/discover', ['localhost', undefined]).label).toBe(
      ui.es['back.discover'],
    );
  });

  it('una sección que no es origen natural de una ficha cae a la reserva', () => {
    expect(back('https://cinearchive.es/terms').href).toBe('/films');
  });

  it('un referer ilegible no revienta', () => {
    expect(back('no-es-una-url').href).toBe('/films');
  });

  it('no acepta nada cuando no hay hosts propios que comparar', () => {
    expect(back('https://cinearchive.es/discover', [undefined]).href).toBe('/films');
  });
});
