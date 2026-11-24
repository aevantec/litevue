import { reactive } from '@vue/reactivity';
import { remove } from '@vue/shared';
import { Block } from './block';
import { Directive, isBuiltInDirective } from './directives';
import { bindContextMethods, createContext, hide } from './context';
import { toDisplayString } from './directives/text';
import { nextTick, stopEffect } from './scheduler';
import { walk } from './walk';
import {
  devtools,
  pluginsWatched,
  registerComponent,
  registerPlugin,
  registerScope,
} from './devtools';
import { createId, createWatch } from './magics';
import { stores } from './store';
import { addErrorHandler, handleError, type ErrorHandler } from './errors';
import { warn } from './warn';
import { SCOPE_SELECTOR } from './lazy';

const mountedRoots = new WeakMap<Element, ChildNode | null>();
import { disposeSubtree, own } from './ownership';

const escapeRegex = (str: string) =>
  str.replace(/[-.*+?^${}()|[\]/\\]/g, '\\$&');

const isInert = (el: any): any =>
  el && (el.__r || el.hasAttribute('v-pre') || isInert(el.parentElement));

export interface App {
  /**
   * The reactive root scope. Plugins may attach helpers here (conventionally
   * $-prefixed) to make them available to all expressions.
   */
  scope: Record<string, any>;
  directive(name: string, def?: Directive): any;
  /**
   * Register a component — a function returning a scope object, used from
   * `v-scope="Name()"` — or retrieve one by name.
   */
  component(name: string, factory?: ComponentFactory): any;
  /**
   * Install a plugin. A plugin is a function (or object with an install
   * method) that receives the app and optional options. Installing the same
   * plugin twice is a no-op.
   */
  use<Options>(plugin: Plugin<Options>, options?: Options): App;
  /**
   * Register a handler for every runtime error LiteVue catches. Runs in
   * production too — this is where an app forwards errors to monitoring.
   * Returns an unregister function; a full `unmount()` also releases it.
   */
  onError(handler: ErrorHandler): () => void;
  mount(el?: Element | null): App;
  /** A selector that matches no element mounts nothing and returns undefined. */
  mount(el: string): App | undefined;
  /**
   * Tear down every mounted root, or — given an element or selector — only the
   * roots at or inside it, leaving the rest of the app running.
   */
  unmount(el?: string | Element | null): void;
}

/**
 * A plugin may return a teardown function, run on full unmount; returning
 * nothing stays valid.
 */
export type PluginTeardown = () => void;

/**
 * A component factory. Called from an expression —
 * `v-scope="Counter({ n: 1 })"` — returning that region's scope object.
 */
export type ComponentFactory = (...props: any[]) => Record<string, any>;

export type Plugin<Options = any> =
  | ((app: App, options?: Options) => PluginTeardown | void)
  | { install(app: App, options?: Options): PluginTeardown | void };

export const createApp = (initialData?: any) => {
  const ctx = createContext();
  if (typeof initialData === 'function') {
    initialData = initialData();
    if (
      import.meta.env.DEV &&
      (!initialData || typeof initialData !== 'object')
    ) {
      console.error(`createApp setup function must return an object.`);
    }
  }
  if (initialData) {
    ctx.scope = reactive(initialData);
    bindContextMethods(ctx.scope);

    if (initialData.$delimiters) {
      const [open, close] = (ctx.delimiters = initialData.$delimiters);
      ctx.delimitersRE = new RegExp(
        escapeRegex(open) + '([^]+?)' + escapeRegex(close),
        'g'
      );
    }
  }

  hide(ctx.scope, '$s', toDisplayString);
  hide(ctx.scope, '$nextTick', nextTick);
  hide(ctx.scope, '$refs', Object.create(null));
  hide(ctx.scope, '$store', stores);
  hide(ctx.scope, '$watch', createWatch(ctx));
  hide(ctx.scope, '$id', createId());
  Object.defineProperty(ctx.scope, '$root', {
    value: ctx.scope,
    enumerable: false,
  });

  const components: Record<string, ComponentFactory> = Object.create(null);
  let rootBlocks: Block[] = [];
  const pluginDeregisters: (() => void)[] = [];
  const installedPlugins = new Set<Plugin>();
  const pluginTeardowns: PluginTeardown[] = [];
  const ownErrorHandlers: (() => void)[] = [];

  const app: App = {
    get scope() {
      return ctx.scope;
    },

    directive(name: string, def?: Directive) {
      if (def) {
        if (import.meta.env.DEV && isBuiltInDirective(name)) {
          warn(
            `app.directive("${name}") registered a directive that never ` +
              `runs: v-${name} is built in, and LiteVue always uses its own ` +
              `ahead of a registered one. Register it under another name.`
          );
        }
        ctx.dirs[name] = def;
        return this;
      } else {
        return ctx.dirs[name];
      }
    },

    component(name: string, factory?: ComponentFactory) {
      if (!factory) return components[name];

      if (import.meta.env.DEV) {
        if (name in components) {
          warn(
            `component "${name}" is already registered and has been ` +
              `replaced. Registering twice is usually two modules claiming ` +
              `the same name.`
          );
        } else if (name in ctx.scope) {
          warn(
            `component "${name}" was not registered: the root scope already ` +
              `has a "${name}", and overwriting it would replace your data ` +
              `with the component. Rename one of them.`
          );
        }
      }
      if (!(name in components) && name in ctx.scope) return this;

      components[name] = factory;
      registerComponent(name);
      ctx.scope[name] = factory;
      return this;
    },

    onError(handler: ErrorHandler) {
      const off = addErrorHandler(handler);
      ownErrorHandlers.push(off);
      return () => {
        const i = ownErrorHandlers.indexOf(off);
        if (i > -1) ownErrorHandlers.splice(i, 1);
        off();
      };
    },

    use(plugin, options) {
      if (!installedPlugins.has(plugin)) {
        installedPlugins.add(plugin);
        const watched = import.meta.env.DEV && pluginsWatched();
        const dirsBefore = watched ? Object.keys(ctx.dirs) : [];
        const scopeBefore = watched ? Object.keys(ctx.scope) : [];
        const teardown =
          typeof plugin === 'function'
            ? plugin(app, options)
            : plugin.install(app, options);
        if (typeof teardown === 'function') pluginTeardowns.push(teardown);
        if (watched) {
          const off = registerPlugin({
            name:
              (typeof plugin === 'function' && plugin.name) ||
              `plugin ${installedPlugins.size}`,
            directives: Object.keys(ctx.dirs).filter(
              (d) => !dirsBefore.includes(d)
            ),
            magics: Object.keys(ctx.scope).filter(
              (k) => k[0] === '$' && !scopeBefore.includes(k)
            ),
            teardown: typeof teardown === 'function',
          });
          if (off) pluginDeregisters.push(off);
        }
      }
      return app;
    },

    mount(el?: string | Element | null): any {
      if (typeof el === 'string') {
        const target = document.querySelector(el);
        if (!target) {
          import.meta.env.DEV &&
            console.error(`mount: selector ${el} has no matching element.`);
          return;
        }
        el = target;
      }

      el = el || document.documentElement;
      let roots: Element[];
      if (el.matches(SCOPE_SELECTOR)) {
        roots = [el];
      } else {
        roots = [...el.querySelectorAll(SCOPE_SELECTOR)].filter(
          (root) => !root.matches(`:where(${SCOPE_SELECTOR}) *`)
        );
      }
      if (!roots.length) {
        roots = [el];
      }
      roots = roots.filter((root) => !isInert(root));

      if (
        import.meta.env.DEV &&
        roots.length === 1 &&
        roots[0] === document.documentElement
      ) {
        console.warn(
          `Mounting on documentElement - this is non-optimal as LiteVue ` +
            `will be forced to crawl the entire page's DOM. ` +
            `Consider explicitly marking elements controlled by LiteVue ` +
            `with \`v-scope\`.`
        );
      }

      ctx.walk ??= walk;
      ctx.dispose ??= disposeSubtree;

      for (const el of roots) {
        if (import.meta.env.DEV) {
          if (mountedRoots.has(el) && mountedRoots.get(el) === el.firstChild) {
            warn(
              `mount() was called again on an element that has already been ` +
                `mounted, so its directives were consumed by the first walk ` +
                `and nothing was bound this time. To re-activate a region, ` +
                `insert fresh markup and mount that instead.`
            );
          }
        }
        const name = el.getAttribute('v-name');
        const host = el.parentNode;
        const block = new Block(el, ctx, true);
        (block as any).host = host;
        import.meta.env.DEV && mountedRoots.set(el, el.firstChild);
        (el as any).__ctx ??= block.ctx;
        if (!devtools.scopes.has(el) && !el.matches(SCOPE_SELECTOR)) {
          block.ctx.cleanups.push(
            registerScope(el, block.ctx.scope, undefined, name || undefined)
          );
        }
        rootBlocks.push(block);
        own(() => (remove(rootBlocks, block), block.teardown()), el);
        block.ctx.cleanups.push(() => delete (el as any).__ctx);
      }
      return this;
    },

    unmount(el?: string | Element | null) {
      if (el == null) {
        rootBlocks.forEach((block) => block.teardown());
        rootBlocks = [];
        ctx.effects.splice(0).forEach(stopEffect);
        pluginDeregisters.splice(0).forEach((fn) => fn());
        pluginTeardowns.splice(0).forEach((fn) => {
          try {
            fn();
          } catch (e) {
            handleError(e, { phase: 'teardown', source: 'plugin' });
          }
        });
        installedPlugins.clear();
        ownErrorHandlers.splice(0).forEach((off) => off());
        return;
      }

      const target = typeof el === 'string' ? document.querySelector(el) : el;
      if (!target) {
        import.meta.env.DEV &&
          console.warn(`unmount: selector ${el} has no matching element.`);
        return;
      }

      const kept: Block[] = [];
      for (const block of rootBlocks) {
        const root = block.template as Element;
        if (target.contains(root) || target.contains((block as any).host)) {
          block.teardown();
        } else {
          kept.push(block);
        }
      }

      if (import.meta.env.DEV && kept.length === rootBlocks.length) {
        console.warn(
          `unmount: no mounted region found at or inside the given element. ` +
            `Pass the same element that was mounted, or one containing it.`
        );
      }
      rootBlocks = kept;
    },
  };

  return app;
};
