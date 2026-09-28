import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { trimReactivity } from './trim-reactivity.mts';

export default defineConfig({
  plugins: [trimReactivity()],
  // the plugins import the core by package name so the published bundles keep
  // it external (see vite.plugins.config.mts); in-repo that has to point back
  // at the source rather than at dist
  resolve: {
    alias: {
      '@aevantec/litevue': resolve(import.meta.dirname, 'src/index.ts'),
      // the file the build bundles; under Node the `node` export condition
      // would load reactivity.cjs.js instead, which the transform never sees
      '@vue/reactivity': resolve(
        import.meta.dirname,
        'node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js'
      ),
    },
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
    // node_modules are externalised by default, which would skip the transform
    server: { deps: { inline: [/@vue\/reactivity/] } },
  },
});
