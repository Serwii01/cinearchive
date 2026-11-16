import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * El camino «puntuar → diario» y «vista otra vez». Las funciones tocan la base
 * de datos, así que aquí se comprueba el cableado; el recorrido entero se probó
 * contra Postgres en local (puntuar, cambiar la fecha, revisionado, mismo día).
 */
describe('visionados desde la ficha', () => {
  const api = readFileSync('src/pages/api/me/films.ts', 'utf8');
  const lib = readFileSync('src/lib/viewings.ts', 'utf8');
  const panel = readFileSync('src/components/ViewingsPanel.astro', 'utf8');

  it('la nota que se da va también al último visionado, que es la que enseña el diario', () => {
    expect(api).toContain('if (rating !== undefined) await rateLatestViewing(');
    expect(lib).toMatch(/rateLatestViewing[\s\S]*orderBy\(desc\(userViewings\.watchedOn\), desc\(userViewings\.id\)\)/);
  });

  it('cambiar solo «Cuándo la vi» mueve el visionado si es el único y es de la web', () => {
    expect(api).toContain("if (typeof parsed.data.reviewedAt === 'string') await moveOnlyViewing(");
    expect(lib).toMatch(/vs\.length !== 1 \|\| vs\[0\]\.source !== 'manual'/);
  });

  it('«Vista otra vez» apunta un revisionado y avisa a la lista para repintarse', () => {
    expect(panel).toContain("fetch('/api/me/viewings'");
    expect(panel).toContain("method: 'POST'");
    expect(panel).toContain("new CustomEvent('film:saved'");
    expect(panel).toContain('res.status === 409');
  });
});

describe('reseñas: lo que manda la web', () => {
  const api = readFileSync('src/pages/api/me/films.ts', 'utf8');
  const controles = readFileSync('src/components/FilmControls.astro', 'utf8');
  const editor = readFileSync('src/pages/[...lang]/u/[username]/review/[tmdbId].astro', 'utf8');

  it('la ficha ya no manda «pendiente» al guardar la reseña', () => {
    expect(controles).not.toContain("status: status || 'want'");
  });

  it('guardar sin nada que guardar no crea la película en la colección', () => {
    expect(api).toContain('if (nadaQueGuardar)');
  });

  it('una reseña sin nota apunta el primer visionado, como puntuar', () => {
    expect(api).toMatch(/rating != null \|\| reseña \? hoyEnEspana\(now\)/);
  });

  it('la fecha del editor de la reseña mueve el visionado', () => {
    expect(api).toContain("if (typeof parsed.data.reviewedAt === 'string') await moveOnlyViewing(");
  });

  it('las dos cajas de texto tienen el tope del servidor y avisan si no se guarda', () => {
    expect(controles).toContain('maxlength="2000"');
    expect(editor).toContain('maxlength="2000"');
    expect(controles).toContain('msg.textContent = L.error');
    expect(editor).toContain('else fallo();');
    expect(api).toContain('.max(2000)');
  });
});
