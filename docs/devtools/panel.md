---
title: Inspector Panel
---

# Inspector Panel <Badge type="section" text="Devtools" />

A standalone in-page inspector ships as a separate bundle (~6kb<!-- size:dist/litevue-devtools.iife.js --> gzipped) — zero weight added to the core. Load it **after** the library, and **only during development**.

## With a script tag

```html
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>
<script
  src="https://unpkg.com/@aevantec/litevue/dist/litevue-devtools.iife.js"
  defer
></script>
```

## Installed via npm

The panel is a **side-effect import** — importing it mounts the inspector, there is nothing to call:

```js
import { createApp } from '@aevantec/litevue';
import '@aevantec/litevue/devtools';

createApp().mount();
```

Guard it so it never reaches production. With Vite (or anything exposing `import.meta.env`), a dynamic import keeps the bundle out of the production build entirely:

```js
import { createApp } from '@aevantec/litevue';

if (import.meta.env.DEV) {
  await import('@aevantec/litevue/devtools');
}

createApp().mount();
```

The webpack/Node equivalent:

```js
if (process.env.NODE_ENV !== 'production') {
  await import('@aevantec/litevue/devtools');
}
```

::: tip Import it before mounting
The panel picks up apps and stores through registry events, so import order isn't critical — but importing before `mount()` means the first render is already captured when the panel opens.
:::

A `⚡ LiteVue` pill appears bottom-right and expands into the panel:

- **Elements / Stores** tabs with live counts — scopes labeled as tags (`v-name` → id → tag name, e.g. `<cart>`)
- a name **filter** (case-insensitive; Escape clears)
- a state view separating own from inherited state; arrays and objects render as an **expandable tree**; every primitive leaf edits inline with type coercion, booleans get checkboxes, and derived values — getter-only props and [`computed()`](/globals/computed) — are read-only
- an **add-key row** and per-row ✕ delete for top-level keys
- hover-to-highlight, plus a **pick mode** — click any element on the page to select its scope
- dark / light / system **themes**; the selected scope is exposed as `window.$scope`
- the panel **drags** by its header, **resizes** via the native grip, and remembers its open state, position and size

Everything the panel shows comes from the public [Devtools API](/globals/devtools) — and one line [disables it all in production](/globals/devtools#disabling-in-production).
