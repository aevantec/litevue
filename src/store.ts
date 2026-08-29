import { reactive } from '@vue/reactivity';
import { registerStore } from './devtools';
import { warnOnce } from './warn';

/**
 * DEV: catch `$store.typo`, which otherwise reads as `undefined` and renders a
 * blank instead of raising.
 *
 * The trap sits *under* `reactive`, not over it: `reactive` probes its target
 * for `__v_raw`, and a wrapper that forwards that probe is bypassed entirely.
 * `__v_`-prefixed keys are ignored for the same reason — they are not reads a
 * user wrote.
 *
 * Deferred to the end of the task, because reading a store before it is
 * registered is legitimate — the registry is reactive so the expression
 * re-runs. A microtask would warn on a store registered after an `await`. One
 * registered later still warns; a check cannot wait forever.
 */
const registry: Record<string, any> = Object.create(null);

// Built inside the guard, not chosen by a ternary: `new Proxy(...)` is a
// constructor call terser will not drop from an expression, so a ternary would
// ship the trap. Under `if (false)` the whole block is dead code.
let target = registry;
if (import.meta.env.DEV) {
  target = new Proxy(registry, {
    get(obj, key: string | symbol, receiver) {
      if (typeof key === 'string' && !key.startsWith('__') && !(key in obj)) {
        setTimeout(() => {
          if (key in obj) return;
          warnOnce(
            `store-missing:${key}`,
            `$store.${key} is not registered, so it reads as undefined. ` +
              `Register it with store('${key}', { … }) before mounting, or ` +
              `check the spelling.`
          );
        });
      }
      return Reflect.get(obj, key, receiver);
    },
  });
}

// reactive, so expressions reading $store.<name> re-evaluate when a store is
// registered later
export const stores: Record<string, any> = reactive(target);

/**
 * Register or retrieve a global store, shared across apps and exposed to every
 * expression as `$store.<name>`. Passing a value registers it and runs its
 * `init()` once, if present; omitting one retrieves.
 */
export const store = <T extends Record<string, any>>(
  name: string,
  value?: T
): T => {
  if (value !== undefined) {
    stores[name] = value;
    if (typeof stores[name].init === 'function') {
      stores[name].init();
    }
    registerStore(name, stores[name]);
  }
  return stores[name];
};
