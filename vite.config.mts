import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  // vite 3+ preserves process.env.NODE_ENV in lib builds, but the
  // esm-bundler build of @vue/reactivity guards its dev-only code with it —
  // left unreplaced it would crash iife/umd usage in plain browsers and
  // ship all the dev warning code. Build only: the dev server handles it.
  define:
    command === 'build'
      ? { 'process.env.NODE_ENV': JSON.stringify('production') }
      : undefined,
  // keep the historical dev port (vite 5 defaults to 5173)
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      format: {
        // escape non-ASCII so bundles render correctly on pages served
        // without an explicit utf-8 charset
        ascii_only: true,
      },
    },
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LiteVue',
      formats: ['es', 'umd', 'iife'],
      // keep the historical file names — vite 3+ would otherwise emit .mjs
      fileName: (format) => `litevue.${format}.js`,
    },
    rollupOptions: {
      plugins: [
        {
          name: 'remove-collection-handlers',
          transform(code, id) {
            if (id.endsWith('reactivity.esm-bundler.js')) {
              return code
                .replace(`mutableCollectionHandlers,`, `null,`)
                .replace(`readonlyCollectionHandlers,`, `null,`);
            }
          },
        },
      ],
    },
  },
}));
