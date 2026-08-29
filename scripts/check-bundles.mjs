// Guards the bundle boundaries. These failures are silent at runtime: the
// plugins bundle once inlined the core, giving it a second `stores` singleton,
// so persistStore() wrote to a registry store() never populated. Nothing threw.
import { readFileSync, readdirSync } from 'fs';

const read = (f) =>
  readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');

// A reactivity-internal marker that survives minification and has no business
// in plugin source. Not __v_isRef/__v_isReadonly: persist.ts reads those to
// spot a computed(), so matching them would flag every build as inlined.
const REACTIVITY = /__v_raw/;
const PKG = '@aevantec/litevue';

const failures = [];
const check = (label, ok, detail) => {
  if (!ok) failures.push(`${label}: ${detail}`);
};

// the combined bundle, plus every standalone plugin build
const pluginBundles = [
  'litevue-plugins.iife.js',
  'litevue-plugins.umd.js',
  ...readdirSync(new URL('../dist/plugins', import.meta.url))
    .filter((f) => f.endsWith('.iife.js') || f.endsWith('.umd.js'))
    .map((f) => `plugins/${f}`),
];

for (const file of pluginBundles) {
  const code = read(file);
  check(
    file,
    !REACTIVITY.test(code),
    'inlines @vue/reactivity — the core must stay external, or this bundle ' +
      'gets its own store registry'
  );
}

check(
  'litevue-plugins.iife.js',
  read('litevue-plugins.iife.js').includes('LiteVue)'),
  'does not read the core off the LiteVue global'
);

// Matched by pattern, not an exact string. Quote style and spacing around
// `from` are a minifier detail that changes between bundler majors — vite 8
// emits `from"pkg"` where vite 5 emitted `from 'pkg'` — and an exact match
// reports a correct bundle as broken.
const IMPORTS_CORE = new RegExp(`from\\s*["']${PKG.replace('/', '\\/')}["']`);

check(
  'litevue-plugins.mjs',
  IMPORTS_CORE.test(read('litevue-plugins.mjs')),
  `does not import the core from "${PKG}"`
);

// the core is meant to be self-contained for <script> users
check(
  'litevue.iife.js',
  REACTIVITY.test(read('litevue.iife.js')),
  'no longer bundles @vue/reactivity'
);

if (failures.length) {
  console.error(
    'Bundle checks failed:\n' + failures.map((f) => `  - ${f}`).join('\n')
  );
  process.exit(1);
}
console.log('Bundle boundaries OK.');
