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

::: info Manual init required
Plugins need an app reference to call `use()` on, so use [manual init](/start-here/installation#manual-init) rather than the `init` script attribute.
:::

## First-party plugins

Shipped in a separate bundle so they add zero weight to the core — import from `litevue/plugins`, or load `dist/litevue-plugins.iife.js` for the `LiteVuePlugins` global:

```js
import { createApp } from '@aevantec/litevue';
import {
  intersect,
  persist,
  focus,
  collapse,
  mask,
  morph,
  transition,
} from '@aevantec/litevue/plugins';

createApp({ open: false }).use(transition).use(persist).mount();
```

::: warning Load the core first
The plugins bundle keeps the core **external** rather than carrying its own copy, so with `<script>` tags it must come after LiteVue:

```html
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script src="https://unpkg.com/@aevantec/litevue/dist/litevue-plugins.iife.js"></script>
```

That's what lets `persistStore()` reach the same store registry `store()` writes to — a bundled second copy would give the plugins their own, and persistence would silently do nothing.
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
