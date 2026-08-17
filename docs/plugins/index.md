---
title: Plugins
---

# Plugins <Badge type="section" text="Plugin" />

Apps install plugins with `use()`. A plugin is a function — or an object with an `install` method — receiving the app and optional options. Installing the same plugin twice is a no-op, and `use()` chains:

```js
import { createApp } from '@aevantec/litevue';

// function style, with options
const myPlugin = (app, options) => {
  app.directive('my-dir', ({ el, get, effect }) => {
    // ...
  });
};

// object style
const helpers = {
  install(app) {
    // app.scope is the reactive root scope
    app.scope.$format = (n) => n.toLocaleString();
  },
};

createApp({ count: 0 }).use(myPlugin, { speed: 2 }).use(helpers).mount();
```

Plugins can register custom directives via `app.directive()` and extend the root scope via `app.scope`. `App` and `Plugin<Options>` types are exported for TypeScript authors.

A directive that registers anything outside `effect()` — a listener, an observer, a timer — must [return a cleanup](/globals/create-app#returning-a-cleanup). `unmount(el)` tears down a region whose elements stay in the document, so whatever you left attached keeps running.

## First-party plugins

Every plugin ships three ways, and none of them add weight to the core.

## Installing a plugin

::: code-group

```js [npm — one plugin]
import { createApp } from '@aevantec/litevue';
import { mask } from '@aevantec/litevue/plugins/mask';

createApp().use(mask).mount();
```

```js [npm — several]
import { createApp } from '@aevantec/litevue';
import { transition, persist } from '@aevantec/litevue/plugins';

createApp({ open: false }).use(transition).use(persist).mount();
```

```html [CDN — one plugin]
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script src="https://unpkg.com/@aevantec/litevue/dist/plugins/mask.iife.js"></script>

<script>
  LiteVue.createApp().use(LiteVueMask.mask).mount();
</script>
```

```html [CDN — all of them]
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script src="https://unpkg.com/@aevantec/litevue/dist/litevue-plugins.iife.js"></script>

<script>
  LiteVue.createApp().use(LiteVuePlugins.mask).mount();
</script>
```

:::

Each plugin has its own subpath (`@aevantec/litevue/plugins/mask`) and its own standalone file (`dist/plugins/mask.iife.js`) exposing a `LiteVue`-prefixed global — `LiteVueMask`, `LiteVuePersist`, `LiteVueMorph`, and so on. The named exports sit on that global, so `persistStore` is `LiteVuePersist.persistStore`.

**Load only what you use.** Individually the plugins are 291–1244 bytes gzipped against 3065 for the whole set, so a page needing just `intersect` ships 291 bytes instead of 3065. Bundler users get the same effect from tree-shaking whichever import style they pick; the subpath is mainly there for `<script>` tags and for keeping intent obvious.

::: warning Load the core first, and mount manually
Plugin bundles keep the core **external** rather than carrying a copy, so with `<script>` tags LiteVue has to come first — a plugin loaded before it throws `ReferenceError: LiteVue is not defined`.

That externalisation is what lets `persistStore()` reach the same store registry `store()` writes to. A bundled second copy would give the plugin its own registry and persistence would silently do nothing.

It also means the `init` attribute is not usable with plugins: `init` mounts as soon as the core script runs, before your `use()` calls. Use [manual init](/start-here/installation#manual-init) instead.
:::

| Plugin                            | Directives          | Purpose                           |
| --------------------------------- | ------------------- | --------------------------------- |
| [intersect](/plugins/intersect)   | `v-intersect`       | run expressions on viewport entry |
| [persist](/plugins/persist)       | `v-persist`         | sync scope state to localStorage  |
| [focus](/plugins/focus)           | `v-focus`, `v-trap` | autofocus and focus trapping      |
| [collapse](/plugins/collapse)     | `v-collapse`        | animated height expand/collapse   |
| [mask](/plugins/mask)             | `v-mask`            | input masking                     |
| [morph](/plugins/morph)           | `$morph`            | patch a live region from new HTML |
| [transition](/plugins/transition) | `v-transition`      | Vue-style enter/leave transitions |
