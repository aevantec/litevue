import { describe, expect, test } from 'vitest';
import { evaluate, evalCacheSize, EVAL_CACHE_LIMIT } from '../src/eval';

/**
 * Compiled expressions are cached by source. Morph can stream server HTML
 * whose expressions inline per-record data — `v-scope="{ id: 812 }"` — so
 * distinct sources keep arriving for the life of the page.
 */
describe('expression cache', () => {
  test('stays bounded however many distinct expressions are compiled', () => {
    for (let i = 0; i < EVAL_CACHE_LIMIT * 3; i++) {
      evaluate({}, `{ id: ${i} }`);
    }
    expect(evalCacheSize()).toBeLessThanOrEqual(EVAL_CACHE_LIMIT);
  });

  test('expressions still evaluate correctly after the cache resets', () => {
    for (let i = 0; i < EVAL_CACHE_LIMIT + 5; i++) {
      expect(evaluate({ n: i }, `n * 2 + ${i}`)).toBe(i * 3);
    }
    expect(evaluate({ n: 4 }, 'n * 2 + 0')).toBe(8);
  });

  test('a repeated expression is cached once', () => {
    evaluate({ a: 1 }, 'a + 41');
    const after = evalCacheSize();
    expect(evaluate({ a: 2 }, 'a + 41')).toBe(43);
    expect(evalCacheSize()).toBe(after);
  });
});
