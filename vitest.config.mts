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
  },
});
