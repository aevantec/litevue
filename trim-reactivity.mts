import type { Plugin } from 'vite';

// @vue/reactivity's Map/Set support costs ~880 bytes gzipped, so it is cut:
// collections become invalid targets that reactive() returns unproxied —
// usable, not tracked. Applied to dev, tests and build alike; cutting it from
// the build alone once shipped a crash no test could see.
const COLLECTION_CASES =
  /case "Map":\s*case "Set":\s*case "WeakMap":\s*case "WeakSet":\s*return 2[^;]*;/;

export const trimReactivity = (): Plugin => ({
  name: 'trim-reactivity',
  enforce: 'pre',
  transform(code, id) {
    if (!id.split('?')[0].endsWith('reactivity.esm-bundler.js')) return;
    if (!COLLECTION_CASES.test(code)) {
      // A new @vue/reactivity changed the source: fail rather than ship
      // collections that reach a missing handler.
      throw new Error(
        'trim-reactivity: collection cases not found in @vue/reactivity'
      );
    }
    return code
      .replace(COLLECTION_CASES, '')
      .replace('mutableCollectionHandlers,', 'null,')
      .replace('readonlyCollectionHandlers,', 'null,');
  },
});
