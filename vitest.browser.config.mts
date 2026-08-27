import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'path';

/**
 * The suite jsdom cannot run.
 *
 * jsdom has no layout, no focus model worth the name, no CSS transitions and
 * no IntersectionObserver — which is precisely where transition, collapse,
 * focus/trap, intersect, morph and unmount live. Four real bugs shipped past a
 * green jsdom suite before this config existed.
 *
 * Deliberately not a second copy of the whole suite: everything here needs a
 * real engine, and anything that does not belongs in the jsdom run, which is
 * an order of magnitude faster.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@aevantec/litevue': resolve(import.meta.dirname, 'src/index.ts'),
    },
  },
  test: {
    include: ['test/browser/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: 'chromium' }],
    },
  },
});
