import { reactive } from '@vue/reactivity';
import { registerStore } from './devtools';

// the registry itself is reactive, so expressions reading $store.<name>
// re-evaluate when a store is registered later
export const stores: Record<string, any> = reactive(Object.create(null));

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
