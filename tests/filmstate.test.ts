import { describe, it, expect } from 'vitest';
import { aplicarReglas, fechaVista, aInputDate } from '../src/lib/filmstate';

describe('aplicarReglas', () => {
  it('pendiente se queda en pendiente: no la asciende a vista', () => {
    expect(aplicarReglas({ status: 'want' }).status).toBe('want');
  });

  it('marcarla favorita la marca también como vista', () => {
    const r = aplicarReglas({ favorite: true });
    expect(r.status).toBe('seen');
    expect(r.favorite).toBe(true);
  });

  it('marcarla vista NO la hace favorita', () => {
    // La asimetría es el punto: son dos cosas distintas.
    expect(aplicarReglas({ status: 'seen' }).favorite).toBeUndefined();
    expect(aplicarReglas({ status: 'seen', favorite: false }).favorite).toBe(false);
  });

  it('puntuarla implica haberla visto', () => {
    // Es el caso real: al pulsar una estrella la interfaz manda la nota SIN
    // estado, y el servidor rellena el hueco con «vista».
    expect(aplicarReglas({ rating: 4 }).status).toBe('seen');
    expect(aplicarReglas({ status: undefined, rating: 5 }).status).toBe('seen');
  });

  it('quitar la puntuación no la mueve de estado', () => {
    expect(aplicarReglas({ rating: null }).status).toBeUndefined();
    expect(aplicarReglas({ status: 'want', rating: null }).status).toBe('want');
  });

  it('devolverla a pendiente le quita lo de favorita', () => {
    // Es la misma regla leída al revés: si favorita implica vista, no puede
    // haber una favorita pendiente.
    expect(aplicarReglas({ status: 'want', favorite: true }).favorite).toBe(false);
  });

  it('un estado explícito gana al ascenso implícito', () => {
    // Pulsar «pendiente» en una favorita tiene que dejarla pendiente. Si el
    // ascenso a «vista» se aplicara primero, la marca volvería sola a vista.
    const r = aplicarReglas({ status: 'want', favorite: true });
    expect(r.status).toBe('want');
    expect(r.favorite).toBe(false);
  });

  it('no inventa campos que no se han mandado', () => {
    expect(aplicarReglas({ rating: 3 }).favorite).toBeUndefined();
    expect(aplicarReglas({ favorite: false }).status).toBeUndefined();
  });
});

describe('fechaVista', () => {
  const AHORA = Date.parse('2026-09-08T10:00:00.000Z');

  it('ancla el día a las 12:00 UTC', () => {
    // A medianoche, cualquier huso al oeste retrasaría el día un puesto y una
    // película vista «ayer» saldría como anteayer.
    expect(fechaVista('2026-05-03', AHORA)?.toISOString()).toBe('2026-05-03T12:00:00.000Z');
  });

  it('acepta hoy', () => {
    expect(fechaVista('2026-09-08', AHORA)).not.toBeNull();
  });

  it('rechaza el futuro', () => {
    expect(fechaVista('2026-09-20', AHORA)).toBeNull();
    expect(fechaVista('2030-01-01', AHORA)).toBeNull();
  });

  it('deja un día de margen para los husos por delante de UTC', () => {
    // A las 00:30 en España todavía es el día anterior en UTC: sin margen,
    // elegir «hoy» en el calendario fallaría un rato cada noche.
    const medianocheEsp = Date.parse('2026-09-08T22:30:00.000Z'); // 00:30 del 9 en Madrid
    expect(fechaVista('2026-09-09', medianocheEsp)).not.toBeNull();
    expect(fechaVista('2026-09-11', medianocheEsp)).toBeNull();
  });

  it('rechaza lo que no sea una fecha', () => {
    expect(fechaVista('ayer', AHORA)).toBeNull();
    expect(fechaVista('2026-13-40', AHORA)).toBeNull();
    expect(fechaVista('', AHORA)).toBeNull();
  });
});

describe('aInputDate', () => {
  it('devuelve el YYYY-MM-DD que espera un input de tipo date', () => {
    expect(aInputDate(new Date('2026-05-03T12:00:00Z'))).toBe('2026-05-03');
    expect(aInputDate('2026-05-03T12:00:00.000Z')).toBe('2026-05-03');
  });

  it('sin fecha, cadena vacía: el campo sale en blanco', () => {
    expect(aInputDate(null)).toBe('');
    expect(aInputDate(undefined)).toBe('');
    expect(aInputDate('no es una fecha')).toBe('');
  });
});
