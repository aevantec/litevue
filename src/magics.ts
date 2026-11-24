import { pauseTracking, resetTracking } from '@vue/reactivity';
import { hasChanged, remove } from '@vue/shared';
import type { Context } from './context';
import { stopEffect } from './scheduler';

let uid = 0;

export const createId = () => {
  const memo: Record<string, string> = Object.create(null);
  return (name = 'id') => memo[name] || (memo[name] = `${name}-${++uid}`);
};

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
      oldValue = value;
      if (init ? hasChanged(value, previous) : options?.immediate) {
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
    return () => {
      stopEffect(runner);
      remove(ctx.effects, runner);
    };
  };
