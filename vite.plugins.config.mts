import { defineConfig } from 'vite';
import { resolve } from 'path';

// The core modules the plugins reach into at runtime. They must stay external:
// `stores` is a module-level singleton, so bundling a second copy here gave the
// plugins their own registry — persistStore('cart') then wrote to a registry
// that store('cart') never populated, and persistence silently did nothing for
// anyone loading both bundles.
const PKG = '@aevantec/litevue';

// separate build for the first-party plugins so they never add weight to the
// core library — consumers pull in only what they use
export default defineConfig({
  build: {
    rollupOptions: {
      external: [PKG],
      // import/require builds keep the bare specifier, so the consumer's
      // resolver hands back the instance their app already loaded; <script>
      // builds read it off the global the core defines.
      output: { globals: { [PKG]: 'LiteVue' } },
    },
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
