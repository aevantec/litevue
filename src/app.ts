import { reactive } from '@vue/reactivity';
import { Block } from './block';
import { Directive } from './directives';
import { bindContextMethods, createContext } from './context';
import { toDisplayString } from './directives/text';
import { nextTick } from './scheduler';
import { walk } from './walk';
import { devtools, registerComponent, registerScope } from './devtools';
import { createId, createWatch } from './magics';
import { stores } from './store';
import { warn } from './warn';

// DEV: elements this app has already walked, so a second mount of the same
// element can say why nothing happened. Weak, and never read in production.
const mountedRoots = new WeakSet<Element>();
import { disposeSubtree } from './ownership';

const escapeRegex = (str: string) =>
  str.replace(/[-.*+?^${}()|[\]\/\\]/g, '\\$&');

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
   *
   * Components have always been plain functions reachable from an expression;
   * this gives them a named home, so a plugin can contribute one without
   * reaching into `app.scope`, and so a name can be looked up rather than
   * guessed at.
   */
  component(name: string, factory?: ComponentFactory): any;
  /**
   * Install a plugin. A plugin is a function (or object with an install
   * method) that receives the app and optional options. Installing the same
   * plugin twice is a no-op.
   */
  use<Options>(plugin: Plugin<Options>, options?: Options): App;
  mount(el?: string | Element | null): App | void;
  /**
   * Tear down every mounted root, or — given an element or selector — only the
   * roots at or inside it, leaving the rest of the app running.
   */
  unmount(el?: string | Element | null): void;
}

/**
 * A plugin may return a teardown function, which runs when the app is fully
 * unmounted. Returning nothing is still valid, so existing plugins are
 * unaffected.
 *
 * The shape matches directives, which already return their cleanup. Without
 * it a plugin could acquire page-wide resources — observers, listeners,
 * matchMedia subscriptions — and had no way to give them back: the media
 * plugin held five MediaQueryList subscriptions for the life of the page
 * whether or not any app was still running.
 */
export type PluginTeardown = () => void;

/**
 * A component factory. Called from an expression — `v-scope="Counter({ n: 1 })"`
 * — and returns the scope object for that region. Props are whatever the
 * expression passes.
 */
export type ComponentFactory = (...props: any[]) => Record<string, any>;

export type Plugin<Options = any> =
  | ((app: App, options?: Options) => PluginTeardown | void)
  | { install(app: App, options?: Options): PluginTeardown | void };

export const createApp = (initialData?: any) => {
  // root context
  const ctx = createContext();
  // setup-function style: createApp(() => ({ count: 0, inc() {...} })) —
  // the function runs once and its returned object becomes the root scope
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

    // handle custom delimiters
    if (initialData.$delimiters) {
      const [open, close] = (ctx.delimiters = initialData.$delimiters);
      ctx.delimitersRE = new RegExp(
        escapeRegex(open) + '([^]+?)' + escapeRegex(close),
        'g'
      );
    }
  }

  // global internal helpers
  ctx.scope.$s = toDisplayString;
  ctx.scope.$nextTick = nextTick;
  ctx.scope.$refs = Object.create(null);
  ctx.scope.$store = stores;
  ctx.scope.$watch = createWatch(ctx);
  ctx.scope.$id = createId();
  // non-enumerable so serializing a scope ({{ $data }}, devtools previews)
  // doesn't recurse into the self-reference
  Object.defineProperty(ctx.scope, '$root', {
    value: ctx.scope,
    enumerable: false,
  });

  const components: Record<string, ComponentFactory> = Object.create(null);
  let rootBlocks: Block[] = [];
  const installedPlugins = new Set<Plugin>();
  const pluginTeardowns: PluginTeardown[] = [];

  const app: App = {
    get scope() {
      return ctx.scope;
    },

    directive(name: string, def?: Directive) {
      if (def) {
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
          // The root scope is the user's, and a component quietly taking a
          // name they are already using would replace their data with a
          // function. Refusing is the safe direction: the expression keeps
          // resolving to what they put there.
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
      // mirrored onto the root scope because that is what expressions resolve
      // against; a nested v-scope declaring the same name shadows it through
      // the prototype chain, as any other root value would be shadowed
      ctx.scope[name] = factory;
      return this;
    },

    use(plugin, options) {
      if (!installedPlugins.has(plugin)) {
        installedPlugins.add(plugin);
        const teardown = (
          typeof plugin === 'function' ? plugin : plugin.install
        )(app, options);
        if (typeof teardown === 'function') pluginTeardowns.push(teardown);
      }
      return app;
    },

    mount(el?: string | Element | null) {
      if (typeof el === 'string') {
        el = document.querySelector(el);
        if (!el) {
          import.meta.env.DEV &&
            console.error(`selector ${el} has no matching element.`);
          return;
        }
      }

      el = el || document.documentElement;
      let roots: Element[];
      if (el.hasAttribute('v-scope')) {
        roots = [el];
      } else {
        roots = [...el.querySelectorAll(`[v-scope]`)].filter(
          (root) => !root.matches(`[v-scope] [v-scope]`)
        );
      }
      if (!roots.length) {
        roots = [el];
      }

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

      // append rather than assign: mount() can be called repeatedly (extra
      // roots, dynamically added fragments) and unmount() must tear down
      // every mounted root, not just the last batch
      // published before any child context is spread off this one, so every
      // scope inherits it (see Context.walk)
      ctx.walk ??= walk;
      ctx.dispose ??= disposeSubtree;

      for (const el of roots) {
        if (import.meta.env.DEV) {
          // Walking an element consumes its directives — every v-scope, @click
          // and :bind is removed from the DOM as it is bound. Mounting the
          // same element again therefore walks a stripped tree and binds
          // nothing: no error, no effects, an inert region that looks mounted.
          // The DOM is the template here, so bringing a region back means
          // inserting fresh markup and mounting that.
          if (mountedRoots.has(el)) {
            warn(
              `mount() was called again on an element that has already been ` +
                `mounted, so its directives were consumed by the first walk ` +
                `and nothing was bound this time. To re-activate a region, ` +
                `insert fresh markup and mount that instead.`
            );
          }
          mountedRoots.add(el);
        }
        // read v-name before walk strips it from the element
        const name = el.getAttribute('v-name');
        const block = new Block(el, ctx, true);
        // a root without v-scope never gets a stashed context during walk;
        // seed it with the block's own one, so markup inserted there later
        // (morph) is torn down with the region rather than outliving it
        (el as any).__ctx ??= block.ctx;
        // roots with v-scope are registered with their scoped context during
        // walk; only register roots the walk didn't claim. The cleanup goes on
        // the block so unmounting this region deregisters only this scope.
        if (!devtools.scopes.has(el)) {
          block.ctx.cleanups.push(
            registerScope(el, block.ctx.scope, undefined, name || undefined)
          );
        }
        rootBlocks.push(block);
      }
      return this;
    },

    /**
     * Tear down mounted regions. With no argument every root goes, as before.
     * Given an element or selector, only roots at or inside it are torn down —
     * their effects stop, cleanups run and scopes deregister, while everything
     * else on the app keeps running.
     *
     * Needed because replacing a region's markup otherwise leaves its effects
     * subscribed, still writing to nodes that are no longer in the document.
     */
    unmount(el?: string | Element | null) {
      if (el == null) {
        rootBlocks.forEach((block) => block.teardown());
        rootBlocks = [];
        // A full unmount ends the app, so its plugins are released with it.
        // unmount(el) is a per-region teardown and deliberately leaves them:
        // the app is still running and other regions still need them.
        //
        // The install record is cleared too, so use() after this reinstalls
        // rather than silently doing nothing against a torn-down app.
        // One plugin throwing must not strand the rest, so each is isolated.
        pluginTeardowns.splice(0).forEach((fn) => {
          try {
            fn();
          } catch (e) {
            import.meta.env.DEV &&
              console.error('[litevue] a plugin teardown threw:', e);
          }
        });
        installedPlugins.clear();
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
        // `contains` covers a wrapper holding several mounted roots, and
        // reports true for the element itself
        if (target.contains(root)) {
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
