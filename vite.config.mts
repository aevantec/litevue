import { defineConfig } from 'vite';
import { resolve } from 'path';
import { trimReactivity } from './trim-reactivity.mts';

// `--mode dev-bundle` builds the published development files: warnings kept,
// unminified. Everything else builds the production files the budgets measure.
export default defineConfig(({ command, mode }) => {
  const dev = mode === 'dev-bundle';
  return {
    plugins: [trimReactivity()],
    // pre-bundling runs esbuild, which skips plugin transforms
    optimizeDeps: { exclude: ['@vue/reactivity'] },
    // vite 3+ preserves process.env.NODE_ENV in lib builds, but the
    // esm-bundler build of @vue/reactivity guards its dev-only code with it —
    // left unreplaced it would crash iife/umd usage in plain browsers and
    // ship all the dev warning code. Build only: the dev server handles it.
    define:
      command === 'build'
        ? {
            'process.env.NODE_ENV': JSON.stringify(
              dev ? 'development' : 'production'
            ),
            ...(dev && { 'import.meta.env.DEV': 'true' }),
          }
        : undefined,
    // keep the historical dev port (vite 5 defaults to 5173)
    server: {
      port: 3000,
    },
    // the plugins import the core by package name so the published bundles keep
    // it external (see vite.plugins.config.mts); the playground pages load source
    // directly, so point it back at src
    resolve: {
      alias: {
        '@aevantec/litevue': resolve(import.meta.dirname, 'src/index.ts'),
      },
    },
    build: {
      target: 'esnext',
      minify: dev ? false : 'terser',
      // the dev files land beside the production ones rather than replacing them
      emptyOutDir: !dev,
      terserOptions: {
        format: {
          // escape non-ASCII so bundles render correctly on pages served
          // without an explicit utf-8 charset
          ascii_only: true,
        },
      },
      lib: {
        entry: resolve(import.meta.dirname, 'src/index.ts'),
        name: 'LiteVue',
        formats: dev ? ['es', 'iife'] : ['es', 'umd', 'iife'],
        // The package is "type": "commonjs", so .js is CJS to Node — correct for
        // the umd build, wrong for the esm one. The esm build must be .mjs or
        // `import '@aevantec/litevue'` throws "Cannot use import statement outside a
        // module" in Node. umd/iife keep their historical .js names.
        fileName: (format) =>
          (format === 'es' ? `litevue.mjs` : `litevue.${format}.js`).replace(
            'litevue.',
            dev ? 'litevue.dev.' : 'litevue.'
          ),
      },
    },
  };
});
