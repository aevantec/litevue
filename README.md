# lite-vue

`lite-vue` is a fork of [petite-vue](https://github.com/vuejs/petite-vue) by Evan You — an alternative distribution of [Vue](https://vuejs.org) optimized for [progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement). It provides the same template syntax and reactivity mental model as standard Vue. However, it is specifically optimized for "sprinkling" a small amount of interactions on an existing HTML page rendered by a server framework. See more details on [how it differs from standard Vue](#comparison-with-standard-vue).

- Only ~7kb
- Vue-compatible template syntax
- DOM-based, mutates in place
- Driven by `@vue/reactivity`
- Built-in [devtools](#devtools)

## Status

- `lite-vue` continues from petite-vue 0.4.1, which is no longer actively maintained upstream. Additions so far: a devtools registry and in-page inspector panel, plus compatibility fixes for modern `@vue/reactivity`.

- Published on npm as **`litevue`** (the hyphenated name was already taken).

## Usage

`lite-vue` can be used without a build step. Simply load it from a CDN:

```html
<script src="https://unpkg.com/litevue" defer init></script>

<!-- anywhere on the page -->
<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

- Use `v-scope` to mark regions on the page that should be controlled by `lite-vue`.
- The `defer` attribute makes the script execute after HTML content is parsed.
- The `init` attribute tells `lite-vue` to automatically query and initialize all elements that have `v-scope` on the page.

### Manual Init

If you don't want the auto init, remove the `init` attribute and move the scripts to end of `<body>`:

```html
<script src="https://unpkg.com/litevue"></script>
<script>
  LiteVue.createApp().mount();
</script>
```

Or, use the ES module build:

```html
<script type="module">
  import { createApp } from 'https://unpkg.com/litevue?module';
  createApp().mount();
</script>
```

### Production CDN URLs

The short CDN URL is meant for prototyping. For production usage, use a fully resolved CDN URL to avoid resolving and redirect cost:

- Global build: `https://unpkg.com/litevue@0.5.0/dist/litevue.iife.js`
  - exposes `LiteVue` global, supports auto init
- ESM build: `https://unpkg.com/litevue@0.5.0/dist/litevue.es.js`
  - Must be used with `<script type="module">`

### Root Scope

The `createApp` function accepts a data object that serves as the root scope for all expressions. This can be used to bootstrap simple, one-off apps:

```html
<script type="module">
  import { createApp } from 'https://unpkg.com/litevue?module';

  createApp({
    // exposed to all expressions
    count: 0,
    // getters
    get plusOne() {
      return this.count + 1;
    },
    // methods
    increment() {
      this.count++;
    },
  }).mount();
</script>

<!-- v-scope value can be omitted -->
<div v-scope>
  <p>{{ count }}</p>
  <p>{{ plusOne }}</p>
  <button @click="increment">increment</button>
</div>
```

Note `v-scope` doesn't need to have a value here and simply serves as a hint for `lite-vue` to process the element.

`createApp` also accepts a setup function, similar in spirit to Vue's `<script setup>`: it runs once and the object it returns becomes the root scope. This gives you a private closure for helpers and shared reactive state:

```js
import { createApp, reactive } from 'litevue';

createApp(() => {
  const store = reactive({ items: [] }); // closure state, shared by reference

  function formatItem(item) {
    // private helper — not exposed to templates unless returned
    return item.toUpperCase();
  }

  return {
    store,
    count: 0,
    inc() {
      this.count++;
    },
    labels() {
      return store.items.map(formatItem);
    },
  };
}).mount();
```

Plain local variables (like `let count = 0`) captured in the closure are **not** reactive — mutate state through `this`, the returned object, or a `reactive()` object instead.

### Explicit Mount Target

You can specify a mount target (selector or element) to limit `lite-vue` to only that region of the page:

```js
createApp().mount('#only-this-div');
```

This also means you can have multiple `lite-vue` apps to control different regions on the same page:

```js
createApp({
  // root scope for app one
}).mount('#app1');

createApp({
  // root scope for app two
}).mount('#app2');
```

### Initializing Dynamic Content

Markup added to the DOM after the initial mount (htmx swaps, `fetch` + `innerHTML`, CMS embeds) is **deliberately inert** — expressions in injected HTML never execute on their own, so an HTML injection can't become script execution. To initialize a new fragment, call `mount()` again on the same app (the equivalent of Alpine's `Alpine.initTree`):

```js
const app = createApp({ shared: 'state' }).mount();

// later, after inserting new markup:
container.innerHTML = '<div v-scope="{ n: 0 }">{{ n }} / {{ shared }}</div>';
app.mount(container);
```

Fragments mounted this way join the same app, so they see the root scope and `$store`, and a single `unmount()` tears down every mounted batch.

### Lifecycle Events

You can listen to the special `mounted` and `unmounted` lifecycle events for each element (the petite-vue `vue:` prefix still works but is deprecated):

```html
<div
  v-if="show"
  @mounted="console.log('mounted on: ', $el)"
  @unmounted="console.log('unmounted: ', $el)"
></div>
```

### `v-effect`

Use `v-effect` to execute **reactive** inline statements:

```html
<div v-scope="{ count: 0 }">
  <div v-effect="$el.textContent = count"></div>
  <button @click="count++">++</button>
</div>
```

The effect uses `count` which is a reactive data source, so it will re-run whenever `count` changes.

Another example of replacing the `todo-focus` directive found in the original Vue TodoMVC example:

```html
<input v-effect="if (todo === editedTodo) $el.focus()" />
```

### Components

The concept of "Components" are different in `lite-vue`, as it is much more bare-bones.

First, reusable scope logic can be created with functions:

```html
<script type="module">
  import { createApp } from 'https://unpkg.com/litevue?module';

  function Counter(props) {
    return {
      count: props.initialCount,
      inc() {
        this.count++;
      },
      mounted() {
        console.log(`I'm mounted!`);
      },
    };
  }

  createApp({
    Counter,
  }).mount();
</script>

<div v-scope="Counter({ initialCount: 1 })" @mounted="mounted">
  <p>{{ count }}</p>
  <button @click="inc">increment</button>
</div>

<div v-scope="Counter({ initialCount: 2 })">
  <p>{{ count }}</p>
  <button @click="inc">increment</button>
</div>
```

### Components with Template

If you also want to reuse a piece of template, you can provide a special `$template` key on a scope object. The value can be the template string, or an ID selector to a `<template>` element:

```html
<script type="module">
  import { createApp } from 'https://unpkg.com/litevue?module';

  function Counter(props) {
    return {
      $template: '#counter-template',
      count: props.initialCount,
      inc() {
        this.count++;
      },
    };
  }

  createApp({
    Counter,
  }).mount();
</script>

<template id="counter-template">
  My count is {{ count }}
  <button @click="inc">++</button>
</template>

<!-- reuse it -->
<div v-scope="Counter({ initialCount: 1 })"></div>
<div v-scope="Counter({ initialCount: 2 })"></div>
```

The `<template>` approach is recommended over inline strings because it is more efficient to clone from a native template element.

### Global State Management

lite-vue has a first-class global store, shared across every app on the page and available to all expressions as `$store.<name>`:

```html
<script type="module">
  import { createApp, store } from 'litevue';

  store('cart', {
    items: [],
    add(item) {
      this.items.push(item);
    },
    get count() {
      return this.items.length;
    },
    init() {
      // runs once when the store is registered
    },
  });

  createApp().mount();

  // read/mutate from JS anywhere — apps react
  store('cart').add('book');
</script>

<div v-scope>
  <button @click="$store.cart.add('thing')">add</button>
  <span>{{ $store.cart.count }}</span>
</div>
```

Stores are reactive (getters included), an `init()` method runs once at registration, and registering a store _after_ mount is picked up reactively by expressions that reference it.

Alternatively, you can use the `reactive` method (re-exported from `@vue/reactivity`) to create your own state singletons:

```html
<script type="module">
  import { createApp, reactive } from 'https://unpkg.com/litevue?module';

  const store = reactive({
    count: 0,
    inc() {
      this.count++;
    },
  });

  // manipulate it here
  store.inc();

  createApp({
    // share it with app scopes
    store,
  }).mount();
</script>

<div v-scope="{ localCount: 0 }">
  <p>Global {{ store.count }}</p>
  <button @click="store.inc">increment</button>

  <p>Local {{ localCount }}</p>
  <button @click="localCount++">increment</button>
</div>
```

### `v-teleport`

`v-teleport="selector"` moves the element under a different parent (a literal CSS selector) while it keeps rendering with its original scope — for modals, dropdowns, and toasts that must escape overflow/z-index contexts. It composes with `v-if`, and the element is removed from the target when its owning scope unmounts:

```html
<div id="modals"></div>

<div v-scope="{ open: false }">
  <button @click="open = true">open</button>
  <div v-if="open" v-teleport="#modals">rendered under #modals</div>
</div>
```

### `v-model` Modifiers

Alongside Vue's `.lazy` / `.number` / `.trim`, lite-vue adds:

- **`.debounce[-ms]`** — rate-limit model writes from input events (default 250ms): `v-model.debounce-300="query"`.
- **`.fill`** — seed empty model state from the input's `value` attribute, handy for server-rendered forms: `<input value="from-server" v-model.fill="name" />`.

### Magic Properties

Every expression has access to these magic properties:

- **`$el`** — the current element.
- **`$data`** — the current scope object.
- **`$root`** — the app's root scope, from any nested scope.
- **`$refs`** — elements registered with the `ref` attribute.
- **`$nextTick(fn)`** — run `fn` after the next reactive flush.
- **`$store`** — the [global stores](#global-state-management).
- **`$dispatch(event, detail?)`** — fire a bubbling `CustomEvent` from the current element, e.g. to notify a parent scope:

  ```html
  <div @notify="handle($event.detail)">
    <button @click="$dispatch('notify', { id: 1 })">notify up</button>
  </div>
  ```

- **`$watch(source, callback)`** — watch a dot-path string or a getter function; the callback receives `(value, oldValue)`. Watchers stop automatically when their scope unmounts:

  ```html
  <div
    v-scope="{ count: 0 }"
    @mounted="$watch('count', (v, old) => save(v))"
  ></div>
  ```

- **`$id(name)`** — unique ids for accessibility attributes: stable within a scope (so pairs match), unique across scopes:

  ```html
  <label :for="$id('email')">Email</label> <input :id="$id('email')" />
  ```

### Custom Directives

Custom directives are also supported but with a different interface:

```js
const myDirective = (ctx) => {
  // the element the directive is on
  ctx.el;
  // the raw value expression
  // e.g. v-my-dir="x" then this would be "x"
  ctx.exp;
  // v-my-dir:foo -> "foo"
  ctx.arg;
  // v-my-dir.mod -> { mod: true }
  ctx.modifiers;
  // evaluate the expression and get its value
  ctx.get();
  // evaluate arbitrary expression in current scope
  ctx.get(`${ctx.exp} + 10`);

  // run reactive effect
  ctx.effect(() => {
    // this will re-run every time the get() value changes
    console.log(ctx.get());
  });

  return () => {
    // cleanup if the element is unmounted
  };
};

// register the directive
createApp().directive('my-dir', myDirective).mount();
```

This is how `v-html` is implemented:

```js
const html = ({ el, get, effect }) => {
  effect(() => {
    el.innerHTML = get();
  });
};
```

### Extra Event Modifiers

On top of Vue's standard `v-on` modifiers (`.stop`, `.prevent`, `.self`, key/mouse filters, `.once`, `.capture`, `.passive`), lite-vue adds:

- **`.window` / `.document`** — attach the listener to `window`/`document` instead of the element (cleaned up when the element unmounts):

  ```html
  <div @scroll.window.throttle-100="onScroll"></div>
  ```

- **`.outside`** — fire only for events originating outside the element (dropdowns, modals):

  ```html
  <div v-show="open" @click.outside="open = false">…</div>
  ```

- **`.debounce` / `.throttle`** — rate-limit the handler, with an optional duration: `.debounce-300` (default 250ms). Guards like `.prevent` still run synchronously; only your callback is delayed.

- **Animation event filters** — `.prop-<propertyName>` on transition events and `.name-<animationName>` on animation events let you sequence complex, multi-property animations without manual checks in the handler:

  ```html
  <!-- advance the sequence only when the opacity transition finishes,
       and only for the `bounce` keyframes animation -->
  <div
    @transitionend.prop-opacity="stage = 'next'"
    @animationend.name-bounce="done()"
  ></div>
  ```

### Plugins

Apps can install plugins with `use()`. A plugin is a function — or an object with an `install` method — that receives the app and optional options. Installing the same plugin twice is a no-op, and `use()` chains:

```js
import { createApp, Plugin } from 'litevue';

// function style, with options
const intersect = (app, options) => {
  app.directive('intersect', ({ el, get, effect }) => {
    // ... register an IntersectionObserver, return a cleanup
  });
};

// object style
const helpers = {
  install(app) {
    // app.scope is the reactive root scope — attach $-prefixed helpers
    // to make them available to all expressions
    app.scope.$format = (n) => n.toLocaleString();
  },
};

createApp({ count: 0 })
  .use(intersect, { rootMargin: '0px' })
  .use(helpers)
  .mount();
```

Plugins can register custom directives via `app.directive()` and extend the root scope via `app.scope`. Note that plugins require the manual-init style — the `init` script attribute auto-mounts without an app reference to call `use()` on.

### First-Party Plugins

A set of official plugins ships in a separate bundle (`litevue/plugins`, also `dist/litevue-plugins.iife.js` exposing a `LiteVuePlugins` global) so they add zero weight to the core — install only what you use:

```js
import { createApp } from 'litevue';
import { intersect, persist, focus, collapse } from 'litevue/plugins';

createApp({ open: false }).use(intersect).use(persist).mount();
```

- **intersect** — `v-intersect="expression"` runs the expression when the element enters the viewport. Modifiers: `.once` (stop after the first trigger), `.leave` (trigger on exit instead), `.full` (require full visibility).

  ```html
  <div v-intersect.once="loaded = true">…</div>
  ```

- **persist** — `v-persist="storage-key"` syncs the element's scope to localStorage: saved values restore on mount, and every change (deep ones included) writes back automatically. The attribute value is the literal storage key (falls back to the element id).

  ```html
  <div v-scope="{ count: 0 }" v-persist="counter">…</div>
  ```

- **focus** — `v-focus="expression"` focuses the element whenever the expression becomes truthy (including on mount). Add `.select` to also select the text. The same plugin also provides **`v-trap="expression"`**: while truthy, Tab / Shift+Tab focus cycling is contained within the element (wrapping at the edges, pulling stray focus back in), focus moves to the first focusable child on activation, and the previously focused element is restored on release — accessible modals in one attribute.

  ```html
  <input v-focus.select="editing" />

  <div v-show="open" v-trap="open">
    <button>…</button>
    <button @click="open = false">close</button>
  </div>
  ```

- **collapse** — `v-collapse="expression"` expands/collapses the element's height with a transition; the initial state applies without animating. `.duration-<ms>` overrides the default 250ms.

- **mask** — `v-mask="(999) 999-9999"` formats the input's value as the user types. The attribute value is the literal mask: `9` = digit, `a` = letter, `*` = alphanumeric, everything else literal. Plays well with `v-model`, which receives the masked value.

- **transition** — `v-transition:name="expression"` is an animated `v-show` with Vue-style transition classes: `name-enter-from` / `name-enter-active` / `name-enter-to` on show, and the `leave-*` equivalents before hiding — the element is only hidden after the leave transition finishes (durations are read from computed styles). The name defaults to `v`; add `.appear` to animate the initial render. Use it _instead of_ `v-show`.

  With **no expression** — `v-transition:fade` on a `v-if`/`v-for` element — it switches to unmount mode: the enter transition runs when the element is inserted, and the core delays DOM removal (and `@unmounted`) until the leave transition finishes.

  ```html
  <div v-if="open" v-transition:fade>animates in and out with v-if</div>
  ```

  ```html
  <style>
    .fade-enter-active,
    .fade-leave-active {
      transition: opacity 0.2s;
    }
    .fade-enter-from,
    .fade-leave-to {
      opacity: 0;
    }
  </style>
  <div v-transition:fade="open">…</div>
  ```

  ```html
  <div v-collapse.duration-150="open">…</div>
  ```

### Custom Delimiters (0.3+)

### Custom Delimiters (0.3+)

You can use custom delimiters by passing `$delimiters` to your root scope. This is useful when working alongside a server-side templating language that also uses mustaches:

```js
createApp({
  $delimiters: ['${', '}'],
}).mount();
```

## Devtools

Every mounted app exposes a devtools registry on `window.__LITE_VUE__` (also exported as `devtools`). Scopes are live reactive objects — reading them is always current, and writing to them updates the page.

From the browser console:

```js
// inspect the scope governing the element selected in the elements panel
__LITE_VUE__.getScope($0);

// live-edit state — the page reacts immediately
__LITE_VUE__.getScope($0).count = 42;

// all mounted scope roots (app roots and v-scope elements)
__LITE_VUE__.scopes;
```

### Naming Scopes

Scopes are labeled by their element's `id` when present, but not every element needs one. Use the `v-name` attribute to give a scope an explicit devtools name — it is removed from the DOM at mount and only exists for inspection:

```html
<div v-name="cart" v-scope="{ items: [] }">...</div>
```

```js
// look a scope up by name from the console
__LITE_VUE__.getScopeByName('cart');

// all names: Map<Element, string>
__LITE_VUE__.names;
```

The inspector panel labels scopes as tags — `v-name` first, then element id, then tag name (e.g. `<cart>`, `<counter>`, `<div>`).

Subscribe to registry events (the basis for inspection UIs):

```js
const off = __LITE_VUE__.on('scope:mount', (el, scope) => { ... })
__LITE_VUE__.on('scope:unmount', (el) => { ... })
__LITE_VUE__.on('flush', () => { ... }) // reactive queue flushed; state may have changed
```

### Disabling in Production

Devtools are on by default. To turn them off in production (no `window.__LITE_VUE__`, no scope registration):

```html
<!-- script-tag users: set the flag before the library loads -->
<script>
  window.__LITE_VUE_DEVTOOLS__ = false;
</script>
<script src="https://unpkg.com/litevue" defer init></script>
```

```js
// bundler users: call it once before mounting
import { createApp, disableDevtools } from 'litevue';

if (import.meta.env.PROD) disableDevtools();
createApp().mount();
```

`disableDevtools()` also clears anything already registered, so calling it late is safe.

### Inspector Panel

A standalone in-page inspector ships as a separate bundle (`dist/litevue-devtools.iife.js`, ~2.7kb gzipped) so it adds zero weight to the core. Load it after the library, during development only:

```html
<script src="https://unpkg.com/litevue" defer init></script>
<script src="/path/to/litevue-devtools.iife.js" defer></script>
```

A `⚡ litevue` pill appears bottom-right and expands into a panel with:

- a scope tree (app roots and `v-scope` elements, labeled with their expressions)
- a state view separating own from inherited state; arrays and objects render as an expandable tree, and every primitive leaf (including nested ones) is editable inline with type coercion
- hover-to-highlight the owning element on the page, and a `pick` mode to select a scope by clicking the page
- a name filter above the scope tree (matches `v-name`/id/tag, case-insensitive; Escape clears)
- an "elements" / "stores" tab pair with live counts — elements lists the scope tree, stores lists global stores; select either to inspect and edit it live (getter-only props are read-only), and stores registered after mount appear automatically
- the selected scope exposed as `window.$scope` for console access
- a color mode toggle cycling dark → light → system (default dark, persisted in localStorage; system follows `prefers-color-scheme` live)

## Examples

Check out the [examples directory](https://github.com/abiacarl/litevue/tree/main/examples).

## Features

### `lite-vue` only

- `v-scope`
- `v-effect`
- `@mounted` & `@unmounted` events

### Has Different Behavior

- In expressions, `$el` points to the current element the directive is bound to (instead of component root element)
- `createApp()` accepts global state instead of a component
- Components are simplified into object-returning functions
- Custom directives have a different interface

### Vue Compatible

- `{{ }}` text bindings (configurable with custom delimiters)
- `v-bind` (including `:` shorthand and class/style special handling)
- `v-on` (including `@` shorthand and all modifiers)
- `v-model` (all input types + non-string `:value` bindings)
- `v-if` / `v-else` / `v-else-if`
- `v-for`
- `v-show`
- `v-html`
- `v-text`
- `v-pre`
- `v-once`
- `v-cloak`
- `reactive()`
- `nextTick()`
- Template refs

### Not Supported

Some features are dropped because they have a relatively low utility/size ratio in the context of progressive enhancement. If you need these features, you should probably just use standard Vue.

- `ref()`, `computed()` etc.
- Render functions (`lite-vue` has no virtual DOM)
- Reactivity for Collection Types (Map, Set, etc., removed for smaller size)
- Transition, KeepAlive, Teleport, Suspense
- `v-for` deep destructure
- `v-on="object"`
- `v-is` & `<component :is="xxx">`
- `v-bind:style` auto-prefixing

## Comparison with standard Vue

The point of `lite-vue` is not just about being small. It's about using the optimal implementation for the intended use case (progressive enhancement).

Standard Vue can be used with or without a build step. When using a build setup (e.g. with Single-File Components), we pre-compile all the templates so there's no template processing to be done at runtime. And thanks to tree-shaking, we can ship optional features in standard Vue that doesn't bloat your bundle size when not used. This is the optimal usage of standard Vue, but since it involves a build setup, it is better suited when building SPAs or apps with relatively heavy interactions.

When using standard Vue without a build step and mounting to in-DOM templates, it is much less optimal because:

- We have to ship the Vue template compiler to the browser (13kb extra size)
- The compiler will have to retrieve the template string from already instantiated DOM
- The compiler then compiles the string into a JavaScript render function
- Vue then replaces existing DOM templates with new DOM generated from the render function.

`lite-vue` avoids all this overhead by walking the existing DOM and attaching fine-grained reactive effects to the elements directly. The DOM _is_ the template. This means `lite-vue` is much more efficient in progressive enhancement scenarios.

This is also how Vue 1 worked. The trade-off here is that this approach is coupled to the DOM and thus not suitable for platform agnostic rendering or JavaScript SSR. We also lose the ability to work with render functions for advanced abstractions. However as you can probably tell, these capabilities are rarely needed in the context of progressive enhancement.

## Comparison with Alpine

`lite-vue` is indeed addressing a similar scope to [Alpine](https://alpinejs.dev), but aims to be (1) even more minimal and (2) more Vue-compatible.

- `lite-vue` is around half the size of Alpine.

- `lite-vue` ships transitions as an opt-in plugin — see [v-transition](#first-party-plugins) (Vue-style classes on `v-show`-like toggling; `v-if` leave transitions are not supported).

- Although Alpine largely resembles Vue's design, there are various cases where the behavior is different from Vue itself. It may also diverge more from Vue in the future. This is good because Alpine shouldn't have to restrict its design to strictly follow Vue - it should have the freedom to develop in a direction that makes sense for its goals.

  In comparison, `lite-vue` will try to align with standard Vue behavior whenever possible so that there is less friction moving to standard Vue if needed. It's intended to be **part of the Vue ecosystem** to cover the progressive enhancement use case where standard Vue is less optimized for nowadays.

## Security and CSP

`lite-vue` evaluates JavaScript expressions in the templates. This means **if** `lite-vue` is mounted on a region of the DOM that contains non-sanitized HTML from user data, it may lead to XSS attacks. **If your page renders user-submitted HTML, you should prefer initializing `lite-vue` using [explicit mount target](#explicit-mount-target) so that it only processes parts that are controlled by you**. You can also sanitize any user-submitted HTML for the `v-scope` attribute.

`lite-vue` evaluates the expressions using `new Function()`, which may be prohibited in strict CSP settings. There is no plan to provide a CSP build because it involves shipping an expression parser which defeats the purpose of being lightweight. If you have strict CSP requirements, you should probably use standard Vue and pre-compile the templates.

## License

MIT
