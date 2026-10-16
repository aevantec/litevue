---
title: Inspector Panel
---

# Inspector Panel <Badge type="section" text="Devtools" />

An in-page inspector for checking and changing state while you develop. It ships
as a separate bundle (~7kb<!-- size:dist/litevue-devtools.iife.js --> gzipped),
so it adds nothing to the core. Load it **after** the library, and **only during
development**.

## Load it with a script tag

```html
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>
<script
  src="https://unpkg.com/@aevantec/litevue/dist/litevue-devtools.iife.js"
  defer
></script>
```

## Load it from npm

The panel is a **side-effect import**: importing it mounts the inspector, and
there is nothing to call.

```js
import { createApp } from '@aevantec/litevue';
import '@aevantec/litevue/devtools';

createApp().mount();
```

Guard it so it never reaches production. With Vite, or anything that exposes
`import.meta.env`, a dynamic import keeps the bundle out of the production build:

```js
import { createApp } from '@aevantec/litevue';

if (import.meta.env.DEV) {
  await import('@aevantec/litevue/devtools');
}

createApp().mount();
```

The webpack and Node equivalent:

```js
if (process.env.NODE_ENV !== 'production') {
  await import('@aevantec/litevue/devtools');
}
```

::: tip Import it before mounting
The panel picks up apps and stores through registry events, so import order is
not critical. Importing before `mount()` means the first render is already
captured when the panel opens.
:::

## Find a scope

A `⚡ LiteVue` pill appears at the bottom right and expands into the panel.

- **Elements** and **Stores** tabs list every scope and store, with live counts.
- Scopes are labelled as tags. The name comes from [`v-name`](/directives/v-name),
  then the [component](/essentials/components#registering-by-name) the scope came
  from, then the id, then the tag: `v-scope="Cart()"` reads as `<Cart>`.
- Nested `v-scope` regions form a **collapsible tree**.
- The **filter** matches names *and* state, case-insensitively: `2026` finds the
  scope holding it, and the row shows the path that matched, such as
  `user.meta.tags.0`. A match keeps its ancestors visible, so it is never left
  indented under nothing. Escape clears the filter.
- Hovering a row highlights its element. **Pick mode** works the other way:
  click any element on the page to select its scope.
- The selected scope or store is exposed as `window.$scope`, for the console.

## Read and edit state

- The state view separates a scope's own state from what it inherits.
- Arrays and objects render as an **expandable tree**.
- Every primitive value edits inline, keeping its type; booleans get a checkbox.
- Derived values, getter-only properties and [`computed()`](/globals/computed),
  are read-only.
- An **add-key row** adds a top-level key, and each top-level row has a ✕ to
  delete it.

## See installed plugins

The puzzle-piece button in the panel bar opens the **plugins view**, which
lists each [`app.use()`](/globals/create-app#the-app-instance) in install order. Its tooltip
shows the count.

- Each row shows the directives and magics the plugin registered, such as
  `v-focus v-trap` or `$morph`. A plugin is identified by these rather than by
  name, because minified builds have no function names.
- **no teardown** marks a plugin that returned no cleanup function. Most
  plugins only register directives and need none. It matters for a plugin that
  adds page-wide listeners or timers, which a full `unmount()` cannot then
  release.
- The view takes the whole panel. Press the button again to return to scopes.
- Plugins are recorded in [development builds](/start-here/installation#development-builds)
  only. Against a production build the view is empty.

## Arrange the panel

- One icon cycles three layouts: **floating**, **docked to the bottom** at full
  width, and **docked to the right** at full height.
- The panel **drags** by its header. It **resizes** by a handle on the edge that
  moves in each layout: a corner when floating, the top edge when docked to the
  bottom, and the left edge when docked to the right.
- Each layout keeps its own size. Both dimensions are bounded, no smaller than
  320&nbsp;×&nbsp;320 and no larger than the viewport.
- The theme cycles through dark, light and system.
- Open state, position, size, layout and theme are remembered between reloads.

Everything the panel shows comes from the public [Devtools API](/globals/devtools),
and one line [disables it all in production](/globals/devtools#disabling-in-production).

## Next

Inspect from the browser's own devtools with the
[Browser Extension](/devtools/extension).
