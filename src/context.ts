import {
  effect as rawEffect,
  reactive,
  ReactiveEffectRunner,
} from '@vue/reactivity';
import { hasOwn } from '@vue/shared';
import { Block } from './block';
import { Directive } from './directives';
import { createId, createWatch } from './magics';
import { queueJob } from './scheduler';
import { inOnce } from './walk';
export interface Context {
  key?: any;
  scope: Record<string, any>;
  dirs: Record<string, Directive>;
  blocks: Block[];
  effect: typeof rawEffect;
  effects: ReactiveEffectRunner[];
  cleanups: (() => void)[];
  delimiters: [string, string];
  delimitersRE: RegExp;
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
        queueJob(fn);
        return fn as any;
      }
      const e: ReactiveEffectRunner = rawEffect(fn, {
        scheduler: () => queueJob(e),
      });
      ctx.effects.push(e);
      return e;
    },
  };
  return ctx;
};

export const createScopedContext = (ctx: Context, data = {}): Context => {
  const parentScope = ctx.scope;
  const mergedScope = Object.create(parentScope);
  Object.defineProperties(mergedScope, Object.getOwnPropertyDescriptors(data));
  mergedScope.$refs = Object.create(parentScope.$refs);
  const reactiveProxy = reactive(
    new Proxy(mergedScope, {
      set(target, key, val, receiver) {
        // when setting a property that doesn't exist on current scope,
        // do not create it on the current scope and fallback to parent scope.
        // use hasOwn instead of target.hasOwnProperty: looking up
        // hasOwnProperty on the target walks its prototype chain into the
        // parent reactive proxy, whose instrumented hasOwnProperty
        // (@vue/reactivity >= 3.2.46) recurses infinitely on this proxy
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
  // per-scope magics — defined on the raw merged scope (not through the
  // proxy) so the set trap can't fall them through to the parent scope
  mergedScope.$watch = createWatch(scopedCtx);
  mergedScope.$id = createId();
  bindContextMethods(reactiveProxy);
  return scopedCtx;
};

export const bindContextMethods = (scope: Record<string, any>) => {
  for (const key of Object.keys(scope)) {
    if (typeof scope[key] === 'function') {
      scope[key] = scope[key].bind(scope);
    }
  }
};
