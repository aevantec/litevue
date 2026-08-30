import { pauseTracking, resetTracking } from '@vue/reactivity';
import type { Context } from './context';

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
 * $watch(source, callback) — watches a dot-path string or getter and calls
 * back with (value, oldValue). Tied to the owning scope's effects, so it stops
 * when the scope unmounts.
 */
export const createWatch =
  (ctx: Context) =>
  (source: string | (() => any), cb: (value: any, oldValue: any) => void) => {
    const getter =
      typeof source === 'function'
        ? source
        : () =>
            source
              .split('.')
              .reduce((o: any, k) => (o == null ? o : o[k]), ctx.scope);
    let oldValue: any;
    let init = false;
    ctx.effect(() => {
      const value = getter();
      if (init && value !== oldValue) {
        // don't let reads inside the callback become dependencies
        pauseTracking();
        cb(value, oldValue);
        resetTracking();
      }
      init = true;
      oldValue = value;
    });
  };
