---
title: Installing Plugins
---

# Installing Plugins <Badge type="section" text="Plugin" />

Every first-party plugin ships three ways — as part of the bundle, as its own npm subpath, and as its own standalone file for a `<script>` tag. None of them add weight to the [core](/start-here/installation).

## Installing a single plugin

The narrowest option, and the recommended default.

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

## Installing several plugins

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

With `<script>` tags the trade is real, because each standalone file carries its own wrapper. One or two plugins are much smaller loaded individually; once you are using most of them the combined bundle wins. Check the actual byte counts against a build rather than guessing — `dist/plugins/` and `dist/litevue-plugins.iife.js` are both in the published package.

## Installing every plugin

There are seven, and each has to be passed to `use()` individually — loading a
bundle defines the exports, it does not register anything.

::: code-group

```js [npm]
import { createApp } from '@aevantec/litevue';
import {
  collapse,
  focus,
  intersect,
  mask,
  media,
  morphPlugin,
  persist,
  resize,
  transition,
} from '@aevantec/litevue/plugins';

createApp()
  .use(collapse)
  .use(focus)
  .use(intersect)
  .use(mask)
  .use(media)
  .use(morphPlugin)
  .use(persist)
  .use(resize)
  .use(transition)
  .mount();
```

```html [CDN]
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script src="https://unpkg.com/@aevantec/litevue/dist/litevue-plugins.iife.js"></script>

<script>
  const {
    collapse,
    focus,
    intersect,
    mask,
    media,
    morphPlugin,
    persist,
    resize,
    transition,
  } = LiteVuePlugins;

  LiteVue.createApp()
    .use(collapse)
    .use(focus)
    .use(intersect)
    .use(mask)
    .use(media)
    .use(morphPlugin)
    .use(persist)
    .use(resize)
    .use(transition)
    .mount();
</script>
```

:::

::: warning Install `morphPlugin`, not `morph`
The morph module exports two things: `morph(from, to)` is the function that
patches a region, and `morphPlugin` is the plugin that registers
[`$morph`](/plugins/morph#in-templates). Only the latter belongs in `use()`.

The same applies to the other non-plugin exports — `persistStore`,
`registerStorage` and `setDefaultStorage` are called directly, never installed.
:::

Installing everything is rarely the right default. Each plugin registers
directives and, in some cases, root-scope helpers whether or not the page uses
them, so prefer naming the ones you need.

## What each plugin exposes

The standalone file defines a `LiteVue`-prefixed global holding that plugin's named exports.

| Plugin                            | npm subpath                            | Global           | Exports                                                        |
| --------------------------------- | -------------------------------------- | ---------------- | -------------------------------------------------------------- |
| [collapse](/plugins/collapse)     | `…/plugins/collapse`                   | `LiteVueCollapse`   | `collapse`                                                  |
| [focus](/plugins/focus)           | `…/plugins/focus`                      | `LiteVueFocus`      | `focus`                                                     |
| [intersect](/plugins/intersect)   | `…/plugins/intersect`                  | `LiteVueIntersect`  | `intersect`                                                 |
| [mask](/plugins/mask)             | `…/plugins/mask`                       | `LiteVueMask`       | `mask`                                                      |
| [media](/plugins/media)           | `…/plugins/media`                      | `LiteVueMedia`      | `media`, `mq`                                               |
| [morph](/plugins/morph)           | `…/plugins/morph`                      | `LiteVueMorph`      | `morph`, `morphPlugin`                                      |
| [persist](/plugins/persist)       | `…/plugins/persist`                    | `LiteVuePersist`    | `persist`, `persistStore`, `registerStorage`, `setDefaultStorage` |
| [resize](/plugins/resize)         | `…/plugins/resize`                     | `LiteVueResize`     | `resize`                                                    |
| [transition](/plugins/transition) | `…/plugins/transition`                 | `LiteVueTransition` | `transition`                                                |

The exports sit **on** the global, so `persistStore` is `LiteVuePersist.persistStore` — not a bare `persistStore`.

## Pin a version in production

Unpinned URLs resolve to the latest release, which is convenient in development and a liability in production. Pin the version and use a fully resolved path:

- Core: `https://unpkg.com/@aevantec/litevue@0.5.6/dist/litevue.iife.js` <!-- x-release-please-version -->
- One plugin: `https://unpkg.com/@aevantec/litevue@0.5.6/dist/plugins/mask.iife.js` <!-- x-release-please-version -->
- All plugins: `https://unpkg.com/@aevantec/litevue@0.5.6/dist/litevue-plugins.iife.js` <!-- x-release-please-version -->

jsDelivr serves the same files — swap the host for `https://cdn.jsdelivr.net/npm/`.

## Load order and initialization

Two constraints apply when loading plugins via `<script>` tags. Neither produces a clear error when violated, so they are worth knowing in advance.

### Load the core first

Plugin bundles keep the core **external** rather than carrying a copy, so LiteVue must be loaded before any plugin:

```html
<script src="https://unpkg.com/@aevantec/litevue"></script>
<!-- plugins after, never before -->
<script src="https://unpkg.com/@aevantec/litevue/dist/plugins/persist.iife.js"></script>
```

That externalization is deliberate. It is what allows `persistStore()` to reach the same store registry `store()` writes to; a bundled second copy would give the plugin its own registry, and persistence would fail silently.

### Mount manually — `init` is not compatible with plugins

The [`init` attribute](/start-here/installation#manual-init) mounts as soon as the core script executes, which is before any `use()` call has run. Mount explicitly instead:

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
