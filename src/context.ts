import {
  effect as rawEffect,
  reactive,
  ReactiveEffectRunner,
} from '@vue/reactivity';
import { hasOwn, remove } from '@vue/shared';
import { Block } from './block';
import { Directive } from './directives';
import { createId, createWatch } from './magics';
import { queueJob, stopEffect } from './scheduler';
import { inOnce, withOnce } from './walk';
import { own } from './ownership';
export interface Context {
  scope: Record<string, any>;
  dirs: Record<string, Directive>;
  blocks: Block[];
  effect: typeof rawEffect;
  effects: ReactiveEffectRunner[];
  cleanups: (() => void)[];
  delimiters: [string, string];
  delimitersRE: RegExp;
  /**
   * The framework walker, published by `mount()` and inherited by every child
   * context. Plugins that insert markup into a live tree (morph) bind it with
   * this instead of importing — and re-bundling — the core.
   */
  walk?: (node: Node, ctx: Context) => ChildNode | null | void;
  /**
   * Disposes a node and its subtree. Published alongside `walk`, so a plugin
   * that removes nodes directly can release what they owned.
   */
  dispose?: (node: Node) => void;
}

export const createContext = (parent?: Context): Context => {
  const ctx: Context = {
    delimiters: ['{{', '}}'],
    delimitersRE: /\{\{([^]+?)\}\}/g,
    ...parent,
    scope: parent ? parent.scope : reactive({}),
    dirs: parent ? parent.dirs : {},
    effects: [],
    blocks: [],
    cleanups: [],
    effect: (fn) => {
      if (inOnce) {
        // still once when it runs: v-if and v-for build their content here
        const job = () => withOnce(true, fn);
        queueJob(job);
        return job as any;
      }
      // Lazy, and run once registered: a first run that throws has already
      // subscribed, so without a runner the next write threw at the writer.
      const e: ReactiveEffectRunner = rawEffect(fn, {
        scheduler: () => queueJob(e),
        lazy: true,
      });
      ctx.effects.push(e);
      // Also owned by the walked node, so detaching it alone releases the
      // effect. Both halves matter: stopping without removing would leave a
      // dead runner in ctx.effects, one per morph cycle.
      own(() => {
        stopEffect(e);
        remove(ctx.effects, e);
      });
      e();
      return e;
    },
  };
  return ctx;
};

/**
 * Framework-provided, so non-enumerable: `Object.assign`-ing one scope onto
 * another must copy the user's data and leave these alone. v-for does exactly
 * that on every update, which reset each row's $id and wiped its $refs.
 */
const hide = (scope: any, key: string, value: any) =>
  Object.defineProperty(scope, key, {
    value,
    writable: true,
    configurable: true,
  });

export const createScopedContext = (ctx: Context, data = {}): Context => {
  const parentScope = ctx.scope;
  const mergedScope = Object.create(parentScope);
  Object.defineProperties(mergedScope, Object.getOwnPropertyDescriptors(data));
  hide(mergedScope, '$refs', Object.create(parentScope.$refs));
  const reactiveProxy = reactive(
    new Proxy(mergedScope, {
      set(target, key, val, receiver) {
        // Writes to a property this scope does not own fall through to the
        // parent rather than shadowing it. `hasOwn`, not
        // `target.hasOwnProperty`: that lookup walks into the parent reactive
        // proxy, whose instrumented version (>= 3.2.46) recurses forever.
        if (receiver === reactiveProxy && !hasOwn(target, key)) {
          return Reflect.set(parentScope, key, val);
        }
        return Reflect.set(target, key, val, receiver);
      },
    })
  );

  const scopedCtx: Context = {
    ...ctx,
    scope: reactiveProxy,
  };
  // per-scope magics — set on the raw scope, not the proxy, so the set trap
  // cannot fall them through to the parent
  hide(mergedScope, '$watch', createWatch(scopedCtx));
  hide(mergedScope, '$id', createId());
  // keys read off the raw scope: through the proxy, Object.keys tracks it, and
  // a v-for mounting rows inside its effect picked up one dependency per row
  bindContextMethods(reactiveProxy, mergedScope);
  return scopedCtx;
};

// Read from the descriptor, not the property: reading runs every getter,
// outside any error containment, so one throwing getter aborted the mount.
export const bindContextMethods = (scope: Record<string, any>, raw = scope) => {
  for (const key of Object.keys(raw)) {
    const fn = Object.getOwnPropertyDescriptor(raw, key)!.value;
    if (typeof fn === 'function') {
      scope[key] = fn.bind(scope);
    }
  }
};
