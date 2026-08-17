// Guards the bundle boundaries. These failures are silent at runtime — the
// plugins bundle once inlined its own copy of the core, which gave it a second
// `stores` singleton, so persistStore() wrote to a registry that store() never
// populated and persistence just… didn't happen. Nothing threw.
import { readFileSync, readdirSync } from 'fs';

const read = (f) =>
  readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');

// A reactivity-internal marker that survives minification, and that plugin
// source has no legitimate reason to contain. Not __v_isRef/__v_isReadonly:
// persist.ts reads those flags directly to spot a computed() without importing
// @vue/reactivity, so matching on them reports every build as inlined.
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

check(
  'litevue-plugins.mjs',
  read('litevue-plugins.mjs').includes(`from '${PKG}'`),
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
