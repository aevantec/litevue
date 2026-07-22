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
      formats: ['iife'],
      fileName: () => 'litevue-devtools.iife.js',
    },
  },
});
