import { pauseTracking, resetTracking } from '@vue/reactivity';
import { hasChanged, remove } from '@vue/shared';
import type { Context } from './context';
import { stopEffect } from './scheduler';

let uid = 0;

/**
 * $id('name') — unique ids for accessibility attributes. Stable within a scope
 * so label/input pairs match, unique across scopes.
 */
export const createId = () => {
  const memo: Record<string, string> = Object.create(null);
  return (name = 'id') => memo[name] || (memo[name] = `${name}-${++uid}`);
};

/**
 * $watch(source, callback, { immediate }) — watches a dot-path string or getter
 * and calls back with (value, oldValue). Returns a stop function; it also stops
 * when the owning scope unmounts.
 */
export const createWatch =
  (ctx: Context) =>
  (
    source: string | (() => any),
    cb: (value: any, oldValue: any) => void,
    options?: { immediate?: boolean }
  ) => {
    const getter =
      typeof source === 'function'
        ? source
        : () =>
            source
              .split('.')
              .reduce((o: any, k) => (o == null ? o : o[k]), ctx.scope);
    let oldValue: any;
    let init = false;
    const runner = ctx.effect(() => {
      const value = getter();
      const previous = oldValue;
      // recorded first, so a callback that throws cannot leave it stale
      oldValue = value;
      // Object.is, as Vue: a value that stays NaN has not changed
      if (init ? hasChanged(value, previous) : options?.immediate) {
        // don't let reads inside the callback become dependencies; the
        // finally matters, since a paused tracker stays paused page-wide
        pauseTracking();
        try {
          cb(value, previous);
        } finally {
          resetTracking();
          // re-read: a callback that wrote its own source does not re-run
          // this effect, and the next change must compare with what it wrote
          oldValue = getter();
        }
      }
      init = true;
    });
    // out of ctx.effects too, or each stopped watcher stays until unmount
    return () => {
      stopEffect(runner);
      remove(ctx.effects, runner);
    };
  };
