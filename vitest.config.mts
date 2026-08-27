import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // the plugins import the core by package name so the published bundles keep
  // it external (see vite.plugins.config.mts); in-repo that has to point back
  // at the source rather than at dist
  resolve: {
    alias: { '@aevantec/litevue': resolve(__dirname, 'src/index.ts') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**'],
      // the panel is a UI surface driven through its shadow DOM in
      // panel*.test.ts; line coverage of it measures very little
      exclude: ['src/devtools-panel.ts'],
    },
    // test/browser holds the cases jsdom cannot model — real focus, layout,
    // CSS transitions, IntersectionObserver. They run under
    // vitest.browser.config.mts instead; running them here would fail for the
    // reasons they exist.
    exclude: ['test/browser/**'],
  },
});
