import { defineConfig } from 'vite'
import { resolve } from 'path'

// separate build for the standalone devtools panel bundle so it never adds
// weight to the core library
export default defineConfig({
  esbuild: {
    minify: true
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/devtools-panel.ts'),
      name: 'LiteVueDevtoolsPanel',
      formats: ['iife'],
      fileName: () => 'lite-vue-devtools.iife.js'
    }
  }
})
