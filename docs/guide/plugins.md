# Plugins

## The plugin system

Apps install plugins with `use()`. A plugin is a function — or an object with an `install` method — receiving the app and optional options. Installing the same plugin twice is a no-op, and `use()` chains:

```js
import { createApp } from 'litevue';

// function style, with options
const intersectLike = (app, options) => {
  app.directive('my-dir', ({ el, get, effect }) => {
    // ...
  });
};

// object style
const helpers = {
  install(app) {
    // app.scope is the reactive root scope — attach $-prefixed helpers
    app.scope.$format = (n) => n.toLocaleString();
  },
};

createApp({ count: 0 }).use(intersectLike, { rootMargin: '0px' }).use(helpers).mount();
```

Plugins can register custom directives via `app.directive()` and extend the root scope via `app.scope`. `App` and `Plugin<Options>` types are exported for TypeScript authors. Note that plugins require the manual-init style — the `init` script attribute auto-mounts without an app reference to call `use()` on.

## First-party plugins

Shipped in a separate bundle (`litevue/plugins`, or `dist/lite-vue-plugins.iife.js` exposing a `LiteVuePlugins` global) so they add zero weight to the core:

```js
import { createApp } from 'litevue';
import { intersect, persist, focus, collapse, transition, mask } from 'litevue/plugins';

createApp({ open: false }).use(transition).use(persist).mount();
```

### intersect

`v-intersect="expression"` runs the expression when the element enters the viewport. Modifiers: `.once` (stop after the first trigger), `.leave` (trigger on exit instead), `.full` (require full visibility).

```html
<div v-intersect.once="loaded = true">…</div>
```

### persist

`v-persist="storage-key"` syncs the element's scope to localStorage: saved values restore on mount, and every change (deep ones included) writes back automatically. The attribute value is the literal storage key (falls back to the element id).

```html
<div v-scope="{ count: 0 }" v-persist="counter">…</div>
```

### focus & trap

`v-focus="expression"` focuses the element whenever the expression becomes truthy (including on mount). Add `.select` to also select the text.

`v-trap="expression"` contains Tab / Shift+Tab focus cycling within the element while truthy — wrapping at the edges, pulling stray focus back in, focusing the first focusable child on activation, and restoring the previously focused element on release. Accessible modals in one attribute:

```html
<input v-focus.select="editing" />

<div v-show="open" v-trap="open">
  <button>…</button>
  <button @click="open = false">close</button>
</div>
```

### collapse

`v-collapse="expression"` expands/collapses the element's height with a transition; the initial state applies without animating. `.duration-<ms>` overrides the default 250ms.

### mask

`v-mask="(999) 999-9999"` formats the input's value as the user types. The attribute value is the literal mask: `9` = digit, `a` = letter, `*` = alphanumeric, everything else literal. Plays well with `v-model`, which receives the masked value.

### transition

`v-transition:name="expression"` is an animated `v-show` with Vue-style transition classes — `name-enter-from` / `name-enter-active` / `name-enter-to` on show, and the `leave-*` equivalents before hiding. The element is only hidden after the leave transition finishes (durations are read from computed styles). The name defaults to `v`; `.appear` animates the initial render:

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

With **no expression** — `v-transition:fade` on a `v-if`/`v-for` element — it switches to **unmount mode**: the enter transition runs when the element is inserted, and the core delays DOM removal (and `@unmounted`) until the leave transition finishes:

```html
<div v-if="open" v-transition:fade>animates in and out with v-if</div>
```
