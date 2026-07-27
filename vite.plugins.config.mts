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
      formats: ['es', 'umd', 'iife'],
      // .mjs for the esm build so Node reads it as ESM (see vite.config.mts);
      // umd backs the `require` condition; iife keeps its historical .js name
      // for <script> tags.
      fileName: (format) =>
        format === 'es'
          ? `litevue-plugins.mjs`
          : `litevue-plugins.${format}.js`,
    },
  },
});
