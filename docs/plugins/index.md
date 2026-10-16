---
title: Plugins
---

# Plugins <Badge type="section" text="Plugin" />

Optional features, each shipped and loaded separately, so a page pays only for
what it uses.

```js
import { createApp } from '@aevantec/litevue';
import { mask } from '@aevantec/litevue/plugins/mask';

createApp().use(mask).mount();
```

## First-party plugins

| Plugin | Adds | For |
| --- | --- | --- |
| [collapse](/plugins/collapse) | `v-collapse` | Animated expand and collapse |
| [focus](/plugins/focus) | `v-focus`, `v-trap` | Autofocus and focus trapping |
| [intersect](/plugins/intersect) | `v-intersect` | Running code on viewport entry or exit |
| [mask](/plugins/mask) | `v-mask` | Formatting input as it is typed |
| [media](/plugins/media) | `$mq` and helpers, `mq` | Behavior by viewport breakpoint |
| [morph](/plugins/morph) | `morph()`, `$morph` | Patching a live region from new HTML |
| [persist](/plugins/persist) | `v-persist`, `persistStore()` | Saving state to storage |
| [popover](/plugins/popover) | `v-popover`, `v-anchor` | Menus and tooltips, positioned against a trigger |
| [resize](/plugins/resize) | `v-resize` | Reacting to an element's own size |
| [transition](/plugins/transition) | `v-transition` | Enter and leave animations |

The combined bundle holds every plugin except popover: all nine together are ~4kb<!-- size:dist/litevue-plugins.iife.js --> gzipped. Popover ships only on its own, so pages without menus or tooltips never pay for it.

## Installing

From npm, import each plugin from its own subpath, or several from
`@aevantec/litevue/plugins`. From a CDN, load each plugin's standalone file
after the core. [Installing plugins](/plugins/installation) covers every method,
the global names and the load-order rules.

Install plugins before `mount()`: their directives must be registered when the
markup is walked.

## Writing your own

A plugin is a function that receives the app. See
[Writing a plugin](/plugins/authoring).
