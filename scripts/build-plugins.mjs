// Builds one bundle per plugin alongside the combined `litevue-plugins.*`, so
// a page wanting only `intersect` doesn't pay for morph and persist: 307–1279
// bytes gzipped each, against 3065 for the set.
//
// One vite invocation per plugin, because rollup refuses multiple entry points
// for iife and umd — the formats a <script src> user needs.
import { build } from 'vite';
import { readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = resolve(root, 'src/plugins');

// every directory under src/plugins is a plugin; index.ts is the barrel
const plugins = readdirSync(pluginsDir)
  .filter((name) => statSync(resolve(pluginsDir, name)).isDirectory())
  .sort();

// UpperCamelCase for the global: intersect -> LiteVueIntersect
const globalName = (name) =>
  'LiteVue' + name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());

const PKG = '@aevantec/litevue';

for (const name of plugins) {
  await build({
    configFile: false,
    root,
    logLevel: 'warn',
    build: {
      target: 'esnext',
      minify: 'terser',
      terserOptions: { format: { ascii_only: true } },
      outDir: 'dist/plugins',
      emptyOutDir: false,
      // the core stays external here for the same reason it does in the
      // combined bundle: inlining it would give each plugin its own store
      // registry (see scripts/check-bundles.mjs)
      rollupOptions: {
        external: [PKG],
        output: { globals: { [PKG]: 'LiteVue' } },
      },
      lib: {
        entry: resolve(pluginsDir, name, 'index.ts'),
        name: globalName(name),
        formats: ['es', 'umd', 'iife'],
        fileName: (format) =>
          format === 'es' ? `${name}.mjs` : `${name}.${format}.js`,
      },
    },
  });
}

console.log(`Built ${plugins.length} standalone plugin bundles.`);
