import { describe, it, expect, vi } from 'vitest';
import { createMemo } from '../src/lib/memo';

describe('createMemo', () => {
  it('calcula una vez y reutiliza mientras no caduca', async () => {
    const fn = vi.fn(async () => 'valor');
    const memo = createMemo<string>(60_000);
    expect(await memo.get('k', fn)).toBe('valor');
    expect(await memo.get('k', fn)).toBe('valor');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recalcula cuando caduca', async () => {
    vi.useFakeTimers();
    try {
      let n = 0;
      const memo = createMemo<number>(1_000);
      const fn = async () => ++n;
      expect(await memo.get('k', fn)).toBe(1);
      vi.advanceTimersByTime(1_500);
      expect(await memo.get('k', fn)).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('colapsa peticiones simultáneas en una sola llamada (sin estampida)', async () => {
    const fn = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 10)),
    );
    const memo = createMemo<string>(60_000);
    const all = await Promise.all([memo.get('k', fn), memo.get('k', fn), memo.get('k', fn)]);
    expect(all).toEqual(['ok', 'ok', 'ok']);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('no cachea los fallos: la siguiente petición reintenta', async () => {
    let intentos = 0;
    const memo = createMemo<string>(60_000);
    const fn = async () => {
      intentos++;
      if (intentos === 1) throw new Error('red caída');
      return 'ok';
    };
    await expect(memo.get('k', fn)).rejects.toThrow('red caída');
    expect(await memo.get('k', fn)).toBe('ok');
    expect(intentos).toBe(2);
  });

  it('claves independientes', async () => {
    const memo = createMemo<string>(60_000);
    expect(await memo.get('a', async () => 'A')).toBe('A');
    expect(await memo.get('b', async () => 'B')).toBe('B');
    expect(await memo.get('a', async () => 'otro')).toBe('A');
  });

  it('acota la memoria: nunca crece más allá del tope', async () => {
    const memo = createMemo<number>(60_000, 10);
    for (let i = 0; i < 200; i++) await memo.get(`k${i}`, async () => i);
    expect(memo.size).toBeLessThanOrEqual(10);
  });

  it('clear() invalida una clave y clear() sin argumentos, todas', async () => {
    const memo = createMemo<number>(60_000);
    let n = 0;
    const fn = async () => ++n;
    await memo.get('a', fn);
    await memo.get('b', fn);
    memo.clear('a');
    expect(await memo.get('a', fn)).toBe(3);
    expect(await memo.get('b', fn)).toBe(2); // 'b' seguía cacheada
    memo.clear();
    expect(memo.size).toBe(0);
  });
});
