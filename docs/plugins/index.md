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

Each ships as its own npm subpath and its own standalone file, so a page loads only what it uses rather than the whole set. See **[Installing Plugins](/plugins/installation)** for every method, the global names and the two load-order rules.

```js
import { createApp } from '@aevantec/litevue';
import { mask } from '@aevantec/litevue/plugins/mask';

createApp().use(mask).mount();
```

| Plugin                            | Directives          | Purpose                           |
| --------------------------------- | ------------------- | --------------------------------- |
| [intersect](/plugins/intersect)   | `v-intersect`       | run expressions on viewport entry |
| [persist](/plugins/persist)       | `v-persist`         | sync scope state to localStorage  |
| [focus](/plugins/focus)           | `v-focus`, `v-trap` | autofocus and focus trapping      |
| [collapse](/plugins/collapse)     | `v-collapse`        | animated height expand/collapse   |
| [mask](/plugins/mask)             | `v-mask`            | input masking                     |
| [media](/plugins/media)           | `$mq`, `v-resize`   | viewport-driven behaviour         |
| [morph](/plugins/morph)           | `$morph`            | patch a live region from new HTML |
| [transition](/plugins/transition) | `v-transition`      | Vue-style enter/leave transitions |
