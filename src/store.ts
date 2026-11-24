import { reactive } from '@vue/reactivity';
import { registerStore } from './devtools';
import { warnOnce } from './warn';

const registry: Record<string, any> = Object.create(null);

let target = registry;
if (import.meta.env.DEV) {
  target = new Proxy(registry, {
    get(obj, key: string | symbol, receiver) {
      if (
        typeof key === 'string' &&
        !key.startsWith('__') &&
        key !== 'toJSON' &&
        !(key in obj) &&
        !(key in Object.prototype)
      ) {
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

export const stores: Record<string, any> = reactive(target);

/**
 * Register or retrieve a global store, shared across apps and exposed to every
 * expression as `$store.<name>`. Passing a value registers it and runs its
 * `init()` once, if present; omitting one retrieves.
 */
export const store: {
  <T extends Record<string, any>>(name: string, value: T): T;
  /** A name that was never registered reads as undefined. */
  <T extends Record<string, any>>(name: string): T | undefined;
} = (name: string, value?: Record<string, any>) => {
  if (value !== undefined) {
    stores[name] = value;
    if (typeof stores[name].init === 'function') {
      stores[name].init();
    }
    registerStore(name, stores[name]);
  }
  return stores[name];
};
