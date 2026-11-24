import {
  effect as rawEffect,
  reactive,
  ReactiveEffectRunner,
} from '@vue/reactivity';
import { hasOwn, remove } from '@vue/shared';
import { Block } from './block';
import { Directive } from './directives';
import { createId, createWatch } from './magics';
import { queueJob, stampJob, stopEffect } from './scheduler';
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
        const job = () => withOnce(true, fn);
        queueJob(job);
        return job as any;
      }
      // Lazy, and run once registered: a first run that throws has already
      // subscribed, so without a runner the next write threw at the writer.
      const e: ReactiveEffectRunner = stampJob(
        rawEffect(fn, { scheduler: () => queueJob(e), lazy: true })
      );
      ctx.effects.push(e);
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

export const hide = (scope: any, key: string, value: any) =>
  Object.defineProperty(scope, key, {
    value,
    writable: true,
    configurable: true,
  });

export const createScopedContext = (
  ctx: Context,
  data = {},
  isRow?: boolean
): Context => {
  const parentScope = ctx.scope;
  const mergedScope = Object.create(parentScope);
  Object.defineProperties(mergedScope, Object.getOwnPropertyDescriptors(data));
  hide(mergedScope, '$refs', Object.create(parentScope.$refs));
  const reactiveProxy = reactive(
    new Proxy(mergedScope, {
      set(target, key, val, receiver) {
        // `hasOwn`, not `target.hasOwnProperty`: that lookup walks into the
        // parent reactive proxy, whose instrumented version (>= 3.2.46)
        // recurses forever.
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
  hide(mergedScope, '$watch', createWatch(scopedCtx));
  hide(mergedScope, '$id', createId());
  if (!isRow) bindContextMethods(reactiveProxy, mergedScope);
  return scopedCtx;
};

export const bindContextMethods = (scope: Record<string, any>, raw = scope) => {
  for (const key of Object.keys(raw)) {
    const { value: fn, writable } = Object.getOwnPropertyDescriptor(raw, key)!;
    if (typeof fn === 'function' && writable) {
      scope[key] = Object.setPrototypeOf(fn.bind(scope), fn);
    }
  }
};
