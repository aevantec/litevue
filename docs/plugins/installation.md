---
title: Installing Plugins
---

# Installing Plugins <Badge type="section" text="Plugin" />

Every first-party plugin ships three ways — as part of the bundle, as its own npm subpath, and as its own standalone file for a `<script>` tag. None of them add weight to the [core](/start-here/installation).

## Pick one plugin

The narrowest option, and the one to reach for by default.

::: code-group

```js [npm]
import { createApp } from '@aevantec/litevue';
import { mask } from '@aevantec/litevue/plugins/mask';

createApp().use(mask).mount();
```

```html [CDN]
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script src="https://unpkg.com/@aevantec/litevue/dist/plugins/mask.iife.js"></script>

<script>
  LiteVue.createApp().use(LiteVueMask.mask).mount();
</script>
```

:::

## Pick several

::: code-group

```js [npm]
import { createApp } from '@aevantec/litevue';
import { transition, persist } from '@aevantec/litevue/plugins';

createApp({ open: false }).use(transition).use(persist).mount();
```

```html [CDN]
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script src="https://unpkg.com/@aevantec/litevue/dist/litevue-plugins.iife.js"></script>

<script>
  LiteVue.createApp()
    .use(LiteVuePlugins.transition)
    .use(LiteVuePlugins.persist)
    .mount();
</script>
```

:::

With a bundler both import styles cost the same — the barrel is side-effect free, so anything you don't import is tree-shaken. The subpath mainly earns its place with `<script>` tags, and for making intent obvious in a diff.

## What each plugin exposes

The standalone file defines a `LiteVue`-prefixed global holding that plugin's named exports.

| Plugin                            | npm subpath                            | Global           | Exports                                                        |
| --------------------------------- | -------------------------------------- | ---------------- | -------------------------------------------------------------- |
| [collapse](/plugins/collapse)     | `…/plugins/collapse`                   | `LiteVueCollapse`   | `collapse`                                                  |
| [focus](/plugins/focus)           | `…/plugins/focus`                      | `LiteVueFocus`      | `focus`                                                     |
| [intersect](/plugins/intersect)   | `…/plugins/intersect`                  | `LiteVueIntersect`  | `intersect`                                                 |
| [mask](/plugins/mask)             | `…/plugins/mask`                       | `LiteVueMask`       | `mask`                                                      |
| [morph](/plugins/morph)           | `…/plugins/morph`                      | `LiteVueMorph`      | `morph`, `morphPlugin`                                      |
| [persist](/plugins/persist)       | `…/plugins/persist`                    | `LiteVuePersist`    | `persist`, `persistStore`, `registerStorage`, `setDefaultStorage` |
| [transition](/plugins/transition) | `…/plugins/transition`                 | `LiteVueTransition` | `transition`                                                |

The exports sit **on** the global, so `persistStore` is `LiteVuePersist.persistStore` — not a bare `persistStore`.

## Sizes

Measured gzipped, as shipped:

| Bundle                | Size   |
| --------------------- | ------ |
| intersect             | 291 B  |
| mask                  | 389 B  |
| collapse              | 468 B  |
| focus                 | 591 B  |
| transition            | 666 B  |
| persist               | 727 B  |
| morph                 | 1244 B |
| **all seven combined**| **3065 B** |

A page that needs only `intersect` ships **291 bytes instead of 3065**. Loading all seven as separate files costs roughly 45% more than the combined bundle, because each carries its own wrapper — so if you genuinely use most of them, prefer the combined file.

## Pin a version in production

Unpinned URLs resolve to the latest release, which is convenient in development and a liability in production. Pin the version and use a fully resolved path:

- Core: `https://unpkg.com/@aevantec/litevue@0.5.3/dist/litevue.iife.js` <!-- x-release-please-version -->
- One plugin: `https://unpkg.com/@aevantec/litevue@0.5.3/dist/plugins/mask.iife.js` <!-- x-release-please-version -->
- All plugins: `https://unpkg.com/@aevantec/litevue@0.5.3/dist/litevue-plugins.iife.js` <!-- x-release-please-version -->

jsDelivr serves the same files — swap the host for `https://cdn.jsdelivr.net/npm/`.

## Two rules that will bite you otherwise

### Load the core first

Plugin bundles keep the core **external** rather than carrying a copy, so LiteVue has to be loaded before any plugin:

```html
<script src="https://unpkg.com/@aevantec/litevue"></script>
<!-- plugins after, never before -->
<script src="https://unpkg.com/@aevantec/litevue/dist/plugins/persist.iife.js"></script>
```

That externalisation is not incidental. It is what lets `persistStore()` reach the same store registry `store()` writes to — a bundled second copy would give the plugin its own registry, and persistence would silently do nothing at all.

### `init` cannot be used with plugins

The [`init` attribute](/start-here/installation#manual-init) mounts as soon as the core script executes, which is before your `use()` calls have run. Mount manually instead:

```html
<script src="https://unpkg.com/@aevantec/litevue"></script>
<!-- no init attribute -->
<script src="https://unpkg.com/@aevantec/litevue/dist/plugins/mask.iife.js"></script>

<script>
  LiteVue.createApp().use(LiteVueMask.mask).mount();
</script>
```

## TypeScript

Each subpath carries its own types, resolvable under `node10`, `node16` (both CJS and ESM) and `bundler`:

```ts
import type { Plugin } from '@aevantec/litevue';
import { persist, type PersistStorage } from '@aevantec/litevue/plugins/persist';
```

## Troubleshooting

**`ReferenceError: LiteVue is not defined`** — a plugin script ran before the core. Move the core `<script>` above it.

**A plugin's directive does nothing, and there's no error** — the plugin was loaded but never installed. Loading the file only defines the global; `app.use(...)` is what registers the directive.

**`persistStore()` runs but nothing reaches storage** — you are on a version before 0.5.3, where the plugins bundle inlined its own copy of the core and therefore its own store registry. Upgrade.

**The app mounted but plugins are missing** — the core script still has the `init` attribute. See above.

## Writing your own

See [Plugins](/plugins/) for the authoring API, and [`app.directive()`](/globals/create-app#custom-directives) for the directive contract — including [when a cleanup is required](/globals/create-app#returning-a-cleanup).
