import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  esbuild: {
    minify: true
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      format: {
        // escape non-ASCII so bundles render correctly on pages served
        // without an explicit utf-8 charset
        ascii_only: true
      }
    },
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LiteVue',
      formats: ['es', 'umd', 'iife']
    },
    rollupOptions: {
      plugins: [
        {
          name: 'remove-collection-handlers',
          transform(code, id) {
            if (id.endsWith('reactivity.esm-bundler.js')) {
              return code
                .replace(`mutableCollectionHandlers,`, `null,`)
                .replace(`readonlyCollectionHandlers,`, `null,`)
            }
          }
        }
      ]
    }
  }
})
