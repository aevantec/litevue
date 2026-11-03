import type { Plugin } from 'vite';

// @vue/reactivity's Map/Set support costs ~880 bytes gzipped, so it is cut:
// collections become invalid targets that reactive() returns unproxied —
// usable, not tracked. Applied to dev, tests and build alike; cutting it from
// the build alone once shipped a crash no test could see.
const COLLECTION_CASES =
  /case "Map":\s*case "Set":\s*case "WeakMap":\s*case "WeakSet":\s*return 2[^;]*;/;

type Cut = [what: string, pattern: RegExp | string, replacement: string];

const REACTIVITY_CUTS: Cut[] = [
  ['collection cases', COLLECTION_CASES, ''],
  ['mutable collection handlers', 'mutableCollectionHandlers,', 'null,'],
  ['readonly collection handlers', 'readonlyCollectionHandlers,', 'null,'],
  // with collections cut, no target is a Map and nothing triggers "clear"
  ['isMap(target)', /isMap\(target\)/g, 'false'],
  ['the "clear" trigger', /if \(type === "clear"\) \{[^}]*\} else /, ''],
  // a Vue <= 3.3 shim on computed refs; nothing here reads _dirty
  [
    'the _dirty polyfill',
    /\/\/ #region polyfill _dirty[^]*?\/\/ #endregion/,
    '',
  ],
];

// @vue/shared builds its string caches with unannotated calls, so an unused
// one (toHandlerKey, capitalize) survives tree-shaking
const SHARED_CUTS: Cut[] = [
  [
    'cacheStringFunction calls',
    /= cacheStringFunction\(/g,
    '= /* @__PURE__ */ cacheStringFunction(',
  ],
];

// A cut that no longer matches means a new Vue changed the source: fail the
// build rather than ship what the cut was meant to remove, or a half-cut.
const apply = (code: string, cuts: Cut[], pkg: string) =>
  cuts.reduce((out, [what, pattern, replacement]) => {
    const next = out.replace(pattern, replacement);
    if (next === out) {
      throw new Error(`trim-reactivity: ${what} not found in ${pkg}`);
    }
    return next;
  }, code);

export const trimReactivity = (): Plugin => ({
  name: 'trim-reactivity',
  enforce: 'pre',
  transform(code, id) {
    const file = id.split('?')[0];
    if (file.endsWith('shared.esm-bundler.js')) {
      return apply(code, SHARED_CUTS, '@vue/shared');
    }
    if (file.endsWith('reactivity.esm-bundler.js')) {
      return apply(code, REACTIVITY_CUTS, '@vue/reactivity');
    }
  },
});
