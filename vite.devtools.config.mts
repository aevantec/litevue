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
      entry: resolve(__dirname, 'src/devtools-panel.ts'),
      name: 'LiteVueDevtoolsPanel',
      // iife for <script> tags, es so npm consumers can
      // `import 'litevue/devtools'` from a bundler
      formats: ['es', 'iife'],
      fileName: (format) => `litevue-devtools.${format}.js`,
    },
  },
});
