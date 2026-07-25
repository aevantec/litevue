import { effect as rawEffect, stop } from '@vue/reactivity';
import type { Plugin } from '../app';
import { queueJob } from '../scheduler';
import { store as getStore } from '../store';

const PREFIX = 'litevue:';

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
    if (desc && desc.get && !desc.set) return false;
    return typeof target[k] !== 'function';
  });

/** Restore saved values, then keep storage in sync with every change. */
const sync = (
  target: Record<string, any>,
  key: string,
  keys: string[] | undefined,
  run: (fn: () => void) => any
) => {
  const fields = persistable(target, keys);

  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
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
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {}
  });
};

/**
 * v-persist="storage-key" — syncs the element's scope to localStorage.
 * Saved values are restored on mount, and every change (including nested
 * objects and arrays) is written back automatically.
 *
 * The attribute value is used verbatim as the storage key (it is not
 * evaluated as an expression); it falls back to the element id.
 *
 * An argument narrows what is stored to specific properties:
 *   v-persist:draft="composer"           — only `draft`
 *   v-persist:draft,recipient="composer" — only those two
 */
export const persist: Plugin = (app) => {
  app.directive('persist', ({ ctx, el, exp, arg, effect }) => {
    const key = PREFIX + (exp || el.id);
    if (import.meta.env.DEV && key === PREFIX) {
      console.error(`v-persist needs a key: v-persist="my-key".`);
    }
    const keys = arg
      ? arg
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined;
    sync(ctx.scope, key, keys, effect);
  });
};

/**
 * persistStore('cart') — the JS-side counterpart for global stores, which
 * have no element to hang a directive on. Restores immediately and saves on
 * every change; returns a function that stops persisting.
 *
 *   persistStore('cart')                      // the whole store
 *   persistStore('cart', { keys: ['items'] }) // only these properties
 *   persistStore('cart', { key: 'v2:cart' })  // custom storage key
 */
export const persistStore = (
  name: string,
  options: { key?: string; keys?: string[] } = {}
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

  let runner: any;
  sync(target, PREFIX + (options.key ?? name), options.keys, (fn) => {
    // batched through the scheduler so a burst of mutations writes once
    runner = rawEffect(fn, { scheduler: () => queueJob(runner) });
    return runner;
  });

  return () => stop(runner);
};
