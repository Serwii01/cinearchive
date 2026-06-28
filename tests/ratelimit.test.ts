import { describe, it, expect } from 'vitest';
import { check, rateLimit, clientIp, tooMany } from '../src/lib/ratelimit';

describe('rate limiter', () => {
  it('permite hasta el límite y luego bloquea', () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(check(key, 5, 60_000).ok).toBe(true);
    }
    const blocked = check(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('rateLimit() devuelve booleano coherente con check()', () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000)).toBe(true);
    expect(rateLimit(key, 2, 60_000)).toBe(true);
    expect(rateLimit(key, 2, 60_000)).toBe(false);
  });

  it('ventanas independientes por clave', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(rateLimit(a, 1, 60_000)).toBe(true);
    expect(rateLimit(a, 1, 60_000)).toBe(false);
    // otra clave no se ve afectada
    expect(rateLimit(b, 1, 60_000)).toBe(true);
  });
});

describe('clientIp', () => {
  it('toma la primera IP de x-forwarded-for', () => {
    const req = new Request('https://x.test', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(clientIp(req)).toBe('1.2.3.4');
  });

  it('cae a x-real-ip y luego a "unknown"', () => {
    expect(clientIp(new Request('https://x.test', { headers: { 'x-real-ip': '9.9.9.9' } }))).toBe(
      '9.9.9.9',
    );
    expect(clientIp(new Request('https://x.test'))).toBe('unknown');
  });
});

describe('tooMany', () => {
  it('responde 429 con cabecera Retry-After', () => {
    const res = tooMany(30);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });
});
