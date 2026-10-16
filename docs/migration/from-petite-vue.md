---
title: Migrating from petite-vue
---

# Migrating from petite-vue <Badge type="section" text="Migration" />

LiteVue continues from petite-vue 0.4.1, which is no longer actively maintained upstream. Everything petite-vue does still works — the changes below are the full migration surface.

## Package and globals

|                 | petite-vue             | LiteVue             |
| --------------- | ---------------------- | ------------------- |
| npm package     | `petite-vue`           | `@aevantec/litevue` |
| IIFE/UMD global | `PetiteVue`            | `LiteVue`           |
| Bundle files    | `dist/petite-vue.*.js` | `dist/litevue.iife.js`, `dist/litevue.umd.js`, `dist/litevue.mjs` (ESM), plus [`.dev` builds](/start-here/installation#development-builds) |

```diff
- import { createApp } from 'petite-vue';
+ import { createApp } from '@aevantec/litevue';
```

## Lifecycle hook rename

`@vue:mounted` / `@vue:unmounted` are now `@mounted` / `@unmounted`. The old prefixed names still work but log a deprecation warning in dev:

```diff
- <div v-if="show" @vue:mounted="setup" @vue:unmounted="teardown"></div>
+ <div v-if="show" @mounted="setup" @unmounted="teardown"></div>
```

This also un-breaks petite-vue-era code written for v0.3 and earlier, which used the bare names.

## Behavioral fixes you inherit

- The scoped-context write trap no longer recurses with modern `@vue/reactivity` (petite-vue 0.4.1 breaks on fresh installs).
- Published TypeScript types actually resolve (petite-vue shipped types referencing a devDependency).
- `mount()` can be called repeatedly on one app; `unmount()` tears down every batch instead of only the last, and `unmount(el)` tears down a single region.
- `v-for` and `v-if` work as direct children of a `<template v-if>` or `<template v-for>`; petite-vue throws.
- An update made while others are being applied is no longer lost — for example, `{{ a }}-{{ x }}` beside a `v-effect` that sets `x` from `a`.
- `:title="null"` removes the attribute, as Vue does; petite-vue writes the text `"null"` on any name the element has as a property.
- `v-model.trim.number` yields a number; in petite-vue `.trim` disables `.number`.
- Keys deleted from an object bound with `v-bind="obj"` or `:style="obj"` are cleared, not only keys missing from a replacement object.
- A static `class` on an SVG element survives `:class`; petite-vue renders `class="baseVal animVal …"`.
- Vue's key aliases work — `.esc`, `.space`, `.up`, `.down`, `.delete` — and `.left` / `.right` filter arrow keys on keyboard events.
- `v-html` renders `undefined` and `null` as empty; petite-vue writes the text `"undefined"`.
- An empty `v-if=""` renders nothing; petite-vue renders the element unconditionally.
- A getter in a `v-scope` object is not run at setup, so one that throws is reported where it is read; in petite-vue it stops the whole page from mounting.
- The compiled-expression cache is bounded, so a page that morphs in server HTML with per-record data does not grow it for its whole life.
- A `<select multiple>` model must be an array. petite-vue also reads a `Set`; LiteVue selects nothing for one and warns in the development build, since a `Set` cannot update reactively here. Convert with `[...set]`.
- Reserved scope keys grew: `$store`, `$watch`, `$id`, `$root` join `$refs` / `$nextTick` / `$s`. Rename any conflicting data properties.

## Everything new is opt-in

The [devtools](/globals/devtools), [plugin system](/plugins/), [global store](/globals/store), [magic properties](/magics/el), [extra event modifiers](/directives/v-on#litevue-modifiers), [`v-teleport`](/directives/v-teleport), and [transitions](/plugins/transition) are all additions — no petite-vue template needs to change to adopt litevue.

Four later additions are worth knowing about specifically, because petite-vue has no equivalent and each addresses something you probably worked around:

- [`computed()`](/globals/computed) gives you **cached** derived state. Scope getters are reactive in petite-vue too, but they re-run on every read — so a getter read by three bindings evaluated three times per update, with no memoized option.
- [Lazy mounting](/directives/v-scope#mounting-on-demand) — `v-scope.visible`, `.idle` and `.interaction` — leaves a region unbound until it is needed. Previously every scope on the page paid its setup cost at load, and deferring one meant wiring up an `IntersectionObserver` and a manual `mount()` yourself.
- The [morph plugin](/plugins/morph) updates a live region from new server HTML **in place**. Previously the only option was replacing the markup and re-mounting, which resets scope state and loses focus, caret and scroll.
- An [event handler can `await`](/directives/v-on#async-handlers), as in `@click="result = await save()"`. In petite-vue that handler fails to compile, so the usual workaround was `save().then((r) => (result = r))`.
