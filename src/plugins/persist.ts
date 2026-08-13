import type { Plugin } from '../app';
// imported by package name, not by relative path: the plugins bundle keeps the
// core external, and a bare specifier is what lets it resolve to the *same*
// module instance the app loaded. `stores` is a module-level singleton, so a
// second copy would give this bundle its own registry.
import { store as getStore, watchEffect } from '@aevantec/litevue';

const PREFIX = 'litevue:';

/** The slice of the Web Storage API persistence needs. */
export interface PersistStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Custom storages registered by name, usable as a directive modifier. */
const registry: Record<string, PersistStorage> = Object.create(null);

let defaultStorage: PersistStorage | string = 'local';

// resolved lazily: touching localStorage at module scope throws when storage
// is blocked, and neither exists during SSR
const builtin = (name: string): PersistStorage | undefined => {
  try {
    if (name === 'local' || name === 'localStorage') return localStorage;
    if (name === 'session' || name === 'sessionStorage') return sessionStorage;
  } catch {}
};

const resolve = (
  storage?: PersistStorage | string
): PersistStorage | undefined => {
  const target = storage ?? defaultStorage;
  if (typeof target !== 'string') return target;
  return registry[target] ?? builtin(target);
};

/**
 * Register a custom storage under a name, so it can be selected by name from
 * anywhere — including as a directive modifier:
 *
 *   registerStorage('memory', myMemoryStorage);
 *   persistStore('scratch', { storage: 'memory' });
 *   <div v-persist.memory="scratch">…</div>
 *
 * Any object with getItem/setItem works — sessionStorage, an IndexedDB
 * shim, an in-memory map, a server-backed store.
 */
export const registerStorage = (name: string, storage: PersistStorage) => {
  registry[name] = storage;
};

/**
 * Switch the storage used when none is specified. Accepts a registered name
 * ('local', 'session', or your own) or a storage object.
 *
 *   setDefaultStorage('session'); // everything defaults to sessionStorage
 */
export const setDefaultStorage = (storage: PersistStorage | string) => {
  defaultStorage = storage;
};

/**
 * Which own properties of `target` can round-trip through storage.
 * Methods are behavior, not state; getter-only properties are derived and
 * would throw on restore. An explicit list is filtered too, so naming a
 * getter is a no-op rather than a crash.
 */
const persistable = (target: Record<string, any>, keys?: string[]) =>
  (keys ?? Object.keys(target)).filter((k) => {
    if (k[0] === '$') return false;
    const desc = Object.getOwnPropertyDescriptor(target, k);
    // derived values can't be assigned back on restore: getters without a
    // setter, and getter-only computed() refs (which the proxy already
    // unwrapped, so they're only visible on the raw descriptor).
    //
    // The reactivity flags are read directly rather than via isRef/isReadonly,
    // because importing @vue/reactivity here would pull a second copy of it
    // into the plugins bundle — which must keep the core external.
    if (desc && desc.get && !desc.set) return false;
    const raw = desc && desc.value;
    if (raw && raw.__v_isRef === true && raw.__v_isReadonly === true) {
      return false;
    }
    return typeof target[k] !== 'function';
  });

/** Restore saved values, then keep storage in sync with every change. */
const sync = <T>(
  target: Record<string, any>,
  key: string,
  keys: string[] | undefined,
  storage: PersistStorage | undefined,
  run: (fn: () => void) => T
): T => {
  if (!storage) return run(() => {});
  const fields = persistable(target, keys);

  try {
    const saved = JSON.parse(storage.getItem(key) || 'null');
    if (saved) {
      for (const k of fields) {
        if (k in saved) target[k] = saved[k];
      }
    }
  } catch {}

  return run(() => {
    const snapshot: Record<string, any> = {};
    for (const k of fields) snapshot[k] = target[k];
    try {
      // stringify reads nested values inside the effect, so deep changes
      // are tracked and re-saved too
      storage.setItem(key, JSON.stringify(snapshot));
    } catch {}
  });
};

/**
 * v-persist="storage-key" — syncs the element's scope to storage. Saved
 * values are restored on mount, and every change (including nested objects
 * and arrays) is written back automatically.
 *
 * The attribute value is used verbatim as the storage key (it is not
 * evaluated as an expression); it falls back to the element id.
 *
 * An argument narrows what is stored to specific properties:
 *   v-persist:draft="composer"           — only `draft`
 *   v-persist:draft,recipient="composer" — only those two
 *
 * A modifier picks the storage — `local` (default), `session`, or any name
 * passed to registerStorage():
 *   v-persist.session="wizard"
 *   v-persist:draft.session="composer"
 */
export const persist: Plugin = (app) => {
  app.directive('persist', ({ ctx, el, exp, arg, modifiers, effect }) => {
    const key = PREFIX + (exp || el.id);
    if (import.meta.env.DEV && key === PREFIX) {
      console.error(`v-persist needs a key: v-persist="my-key".`);
    }

    let storage: PersistStorage | string | undefined;
    for (const name in modifiers || {}) {
      if (resolve(name)) {
        storage = name;
        break;
      }
      if (import.meta.env.DEV) {
        console.error(
          `v-persist: unknown storage ".${name}" — use .local, .session, or ` +
            `a name passed to registerStorage().`
        );
      }
    }

    const keys = arg
      ? arg
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined;

    sync(ctx.scope, key, keys, resolve(storage), effect);
  });
};

/**
 * persistStore('cart') — the JS-side counterpart for global stores, which
 * have no element to hang a directive on. Restores immediately and saves on
 * every change; returns a function that stops persisting.
 *
 *   persistStore('cart')                              // the whole store
 *   persistStore('cart', { keys: ['items'] })         // only these properties
 *   persistStore('cart', { key: 'v2:cart' })          // custom storage key
 *   persistStore('draft', { storage: 'session' })     // a different storage
 *   persistStore('scratch', { storage: myStorage })   // any getItem/setItem
 */
export const persistStore = (
  name: string,
  options: {
    key?: string;
    keys?: string[];
    storage?: PersistStorage | string;
  } = {}
) => {
  const target = getStore(name);
  if (!target) {
    if (import.meta.env.DEV) {
      console.error(
        `persistStore("${name}") — no such store. Register it with ` +
          `store("${name}", { … }) first.`
      );
    }
    return () => {};
  }

  const storage = resolve(options.storage);
  if (import.meta.env.DEV && !storage) {
    console.error(
      `persistStore("${name}") — storage ` +
        `"${String(options.storage)}" is not available.`
    );
  }

  // watchEffect batches through the scheduler, so a burst of mutations in
  // one tick writes once, and it hands back the stop function
  return sync(
    target,
    PREFIX + (options.key ?? name),
    options.keys,
    storage,
    watchEffect
  );
};
