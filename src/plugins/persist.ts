import type { Plugin } from '../app';

/**
 * v-persist="storage-key" — syncs the element's scope to localStorage.
 * Saved values are restored on mount, and every change (including nested
 * objects and arrays) is written back automatically.
 *
 * The attribute value is used verbatim as the storage key (it is not
 * evaluated as an expression); it falls back to the element id.
 */
export const persist: Plugin = (app) => {
  app.directive('persist', ({ ctx, el, exp, effect }) => {
    const key = 'litevue:' + (exp || el.id);
    if (import.meta.env.DEV && key === 'litevue:') {
      console.error(`v-persist needs a key: v-persist="my-key".`);
    }
    const scope = ctx.scope;
    const keys = Object.keys(scope).filter(
      (k) => k[0] !== '$' && typeof scope[k] !== 'function'
    );

    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved) {
        for (const k of keys) {
          if (k in saved) scope[k] = saved[k];
        }
      }
    } catch {}

    effect(() => {
      const snapshot: Record<string, any> = {};
      for (const k of keys) snapshot[k] = scope[k];
      try {
        // stringify reads nested values inside the effect, so deep changes
        // are tracked and re-saved too
        localStorage.setItem(key, JSON.stringify(snapshot));
      } catch {}
    });
  });
};
