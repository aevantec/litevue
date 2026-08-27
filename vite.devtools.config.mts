import { defineConfig } from 'vite';
import { resolve } from 'path';

// separate build for the standalone devtools panel bundle so it never adds
// weight to the core library
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      format: {
        // escape non-ASCII (⚡ ▶ ƒ …) so the panel's icons render correctly
        // on pages served without an explicit utf-8 charset
        ascii_only: true,
      },
    },
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/devtools-panel.ts'),
      name: 'LiteVueDevtoolsPanel',
      // iife for <script> tags, es so npm consumers can
      // `import '@aevantec/litevue/devtools'` from a bundler, umd for `require`
      formats: ['es', 'umd', 'iife'],
      // .mjs for the esm build so Node reads it as ESM (see vite.config.mts);
      // the umd/iife builds keep their historical .js names.
      fileName: (format) =>
        format === 'es'
          ? `litevue-devtools.mjs`
          : `litevue-devtools.${format}.js`,
    },
  },
});
