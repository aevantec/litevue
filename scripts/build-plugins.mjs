// Builds one bundle per plugin alongside the combined `litevue-plugins.*`, so
// a page wanting only `intersect` doesn't pay for morph and persist: 307–1279
// bytes gzipped each, against 3065 for the set.
//
// One vite invocation per plugin, because rollup refuses multiple entry points
// for iife and umd — the formats a <script src> user needs.
import { build } from 'vite';
import { readdirSync, readFileSync, statSync } from 'fs';
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

// A plugin with development checks also gets .dev files, found from the
// source so a new warning cannot ship without one.
const hasDevChecks = (name) =>
  readFileSync(resolve(pluginsDir, name, 'index.ts'), 'utf8').includes(
    'import.meta.env.DEV'
  );

const buildPlugin = (name, dev) =>
  build({
    configFile: false,
    root,
    logLevel: 'warn',
    ...(dev && { define: { 'import.meta.env.DEV': 'true' } }),
    build: {
      target: 'esnext',
      minify: dev ? false : 'terser',
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
        formats: dev ? ['es', 'iife'] : ['es', 'umd', 'iife'],
        fileName: (format) =>
          `${name}${dev ? '.dev' : ''}` +
          (format === 'es' ? '.mjs' : `.${format}.js`),
      },
    },
  });

const withDev = plugins.filter(hasDevChecks);
for (const name of plugins) await buildPlugin(name, false);
for (const name of withDev) await buildPlugin(name, true);

console.log(
  `Built ${plugins.length} standalone plugin bundles, and development ` +
    `files for ${withDev.join(', ')}.`
);
