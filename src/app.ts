import { reactive } from '@vue/reactivity';
import { Block } from './block';
import { Directive } from './directives';
import { bindContextMethods, createContext } from './context';
import { toDisplayString } from './directives/text';
import { nextTick } from './scheduler';
import { devtools, registerScope } from './devtools';
import { createId, createWatch } from './magics';
import { stores } from './store';

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
   * Install a plugin. A plugin is a function (or object with an install
   * method) that receives the app and optional options. Installing the same
   * plugin twice is a no-op.
   */
  use<Options>(plugin: Plugin<Options>, options?: Options): App;
  mount(el?: string | Element | null): App | void;
  unmount(): void;
}

export type Plugin<Options = any> =
  | ((app: App, options?: Options) => void)
  | { install(app: App, options?: Options): void };

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

  let rootBlocks: Block[];
  const installedPlugins = new Set<Plugin>();

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

    use(plugin, options) {
      if (!installedPlugins.has(plugin)) {
        installedPlugins.add(plugin);
        (typeof plugin === 'function' ? plugin : plugin.install)(app, options);
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
          `Mounting on documentElement - this is non-optimal as lite-vue ` +
            `will be forced to crawl the entire page's DOM. ` +
            `Consider explicitly marking elements controlled by lite-vue ` +
            `with \`v-scope\`.`
        );
      }

      rootBlocks = roots.map((el) => {
        // read v-name before walk strips it from the element
        const name = el.getAttribute('v-name');
        const block = new Block(el, ctx, true);
        // roots with v-scope are registered with their scoped context during
        // walk; only register roots the walk didn't claim
        if (!devtools.scopes.has(el)) {
          ctx.cleanups.push(
            registerScope(el, ctx.scope, undefined, name || undefined)
          );
        }
        return block;
      });
      return this;
    },

    unmount() {
      rootBlocks.forEach((block) => block.teardown());
    },
  };

  return app;
};
