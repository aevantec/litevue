import { reactive } from '@vue/reactivity';
import { registerStore } from './devtools';
import { warnOnce } from './warn';

/**
 * DEV: `$store.typo` reads as `undefined` and the expression carries on, which
 * turns a misspelling into a blank on the page rather than an error.
 *
 * The trap sits *under* `reactive`, not over it. Wrapping the reactive proxy
 * instead does not work: `reactive` probes its target for `__v_raw`, and a
 * wrapper that forwards that probe hands back the underlying object, so every
 * later read goes straight there and never reaches the trap. Reactivity's own
 * `__v_`-prefixed probes are ignored here for the same reason they exist —
 * they are not property reads a user wrote.
 *
 * The check is deferred to the end of the task because reading a store before
 * it is registered is legitimate: the registry is reactive precisely so an
 * expression re-runs when one appears later. A microtask is not enough — a
 * store registered after an `await` in the same task would warn — so this
 * waits for the task to drain. A store registered later than that, from a
 * dynamically imported module, still warns once; that is the accepted edge of
 * a check that cannot wait forever.
 */
const registry: Record<string, any> = Object.create(null);

// Built inside the guard, not chosen by a ternary: `new Proxy(...)` at module
// scope is a constructor call terser will not drop, so a ternary keeps the
// trap — and its message — in the production bundle. Under `if (false)` the
// whole block is dead code and goes.
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

// the registry itself is reactive, so expressions reading $store.<name>
// re-evaluate when a store is registered later
export const stores: Record<string, any> = reactive(target);

/**
 * Register or retrieve a global store, shared across all apps and available
 * to every expression as $store.<name>.
 *
 * store('cart', { items: [], add(i) { this.items.push(i) } }) registers a
 * reactive store (an init() method, if present, runs once on registration);
 * store('cart') retrieves it.
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
