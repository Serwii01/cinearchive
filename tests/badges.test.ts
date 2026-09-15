import { describe, it, expect } from 'vitest';
import { parseBadgeInput, badgeClasses, BADGE_NAME_MAX } from '../src/lib/badges';

describe('parseBadgeInput', () => {
  it('limpia espacios y acepta lo razonable', () => {
    const r = parseBadgeInput({ name: '  Crítica   invitada ', color: 'ink', description: ' Escribe en la revista ' });
    expect(r).toEqual({ ok: true, badge: { name: 'Crítica invitada', color: 'ink', description: 'Escribe en la revista' } });
  });

  it('el color por defecto es ocre y la descripción vacía es null', () => {
    const r = parseBadgeInput({ name: 'Fundador' });
    expect(r).toEqual({ ok: true, badge: { name: 'Fundador', color: 'ochre', description: null } });
  });

  it('rechaza nombre vacío, largo o de otro tipo', () => {
    expect(parseBadgeInput({ name: '   ' })).toEqual({ ok: false, error: 'name_required' });
    expect(parseBadgeInput({ name: 42 })).toEqual({ ok: false, error: 'name_required' });
    expect(parseBadgeInput({ name: 'x'.repeat(BADGE_NAME_MAX + 1) })).toEqual({ ok: false, error: 'name_too_long' });
  });

  it('rechaza colores inventados y descripciones kilométricas', () => {
    expect(parseBadgeInput({ name: 'A', color: 'rosa' })).toEqual({ ok: false, error: 'bad_color' });
    expect(parseBadgeInput({ name: 'A', description: 'd'.repeat(200) })).toEqual({ ok: false, error: 'desc_too_long' });
  });
});

describe('badgeClasses', () => {
  it('cada estilo lleva borde de tinta y un color desconocido cae a ocre', () => {
    for (const c of ['ochre', 'ink', 'outline', 'lo-que-sea']) expect(badgeClasses(c)).toContain('border-ink');
    expect(badgeClasses('lo-que-sea')).toBe(badgeClasses('ochre'));
  });
});
