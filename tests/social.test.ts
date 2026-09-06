import { describe, it, expect } from 'vitest';
import { canViewActivity, normalizeUsername, usernameError, normalizeInstagram, instagramUrl } from '../src/lib/social';

const publico = { userId: 'u1', isPrivate: false };
const privado = { userId: 'u1', isPrivate: true };

/**
 * canViewActivity decide si alguien puede ver reseñas, listas y seguidores de
 * otra persona. Es la única puerta de la capa social: si se abriera de más,
 * expondría la actividad de cuentas privadas.
 */
describe('canViewActivity', () => {
  it('el dueño siempre ve lo suyo, aunque su perfil sea privado', () => {
    expect(canViewActivity('u1', privado, 'self')).toBe(true);
  });

  it('un perfil público lo ve cualquiera, incluso sin sesión', () => {
    expect(canViewActivity(null, publico, 'none')).toBe(true);
    expect(canViewActivity('otro', publico, 'none')).toBe(true);
  });

  it('un perfil privado NO lo ve un anónimo', () => {
    expect(canViewActivity(null, privado, 'none')).toBe(false);
  });

  it('un perfil privado NO lo ve alguien que no lo sigue', () => {
    expect(canViewActivity('otro', privado, 'none')).toBe(false);
  });

  it('una solicitud PENDIENTE todavía no da acceso', () => {
    expect(canViewActivity('otro', privado, 'pending')).toBe(false);
  });

  it('solo el seguimiento ACEPTADO abre un perfil privado', () => {
    expect(canViewActivity('otro', privado, 'accepted')).toBe(true);
  });
});

describe('usernames', () => {
  it('normaliza quitando @, espacios y mayúsculas', () => {
    expect(normalizeUsername('  @Sergio_M  ')).toBe('sergio_m');
  });

  it('acepta nombres válidos', () => {
    for (const u of ['ana', 'cine_fan', 'user2000', 'a_b_c']) {
      expect(usernameError(u)).toBeNull();
    }
  });

  it('rechaza por formato: cortos, largos, con símbolos o mal puntuados', () => {
    for (const u of ['ab', 'x'.repeat(21), 'con-guion', 'con espacio', 'ácentos', '_borde', 'borde_', 'do__ble']) {
      expect(usernameError(u)).toBe('format');
    }
  });

  it('rechaza los nombres reservados, escritos como sea', () => {
    for (const u of ['admin', '@ADMIN', 'api', 'sergio', 'cinearchive']) {
      expect(usernameError(u)).toBe('reserved');
    }
  });
});

describe('instagram', () => {
  it('acepta handle pelado, con @ y como URL completa', () => {
    expect(normalizeInstagram('cinearchive')).toBe('cinearchive');
    expect(normalizeInstagram('@CineArchive')).toBe('cinearchive');
    expect(normalizeInstagram('https://instagram.com/CineArchive/')).toBe('cinearchive');
    expect(normalizeInstagram('https://www.instagram.com/cine.archive?hl=es')).toBe('cine.archive');
  });

  it('vacío es null (el usuario borra el campo)', () => {
    expect(normalizeInstagram('   ')).toBeNull();
  });

  it('rechaza lo que no es un handle', () => {
    expect(() => normalizeInstagram('con espacio')).toThrow(RangeError);
    expect(() => normalizeInstagram('x'.repeat(31))).toThrow(RangeError);
  });

  it('construye la URL pública', () => {
    expect(instagramUrl('cinearchive')).toBe('https://instagram.com/cinearchive');
  });
});
