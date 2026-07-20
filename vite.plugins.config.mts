import { defineConfig } from 'vite';
import { resolve } from 'path';

// separate build for the first-party plugins so they never add weight to the
// core library — consumers pull in only what they use
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      format: {
        ascii_only: true,
      },
    },
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/plugins/index.ts'),
      name: 'LiteVuePlugins',
      formats: ['es', 'iife'],
      // keep the historical file names — vite 3+ would otherwise emit .mjs
      fileName: (format) => `lite-vue-plugins.${format}.js`,
    },
  },
});
