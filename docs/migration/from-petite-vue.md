---
title: Migrating from petite-vue
---

# Migrating from petite-vue <Badge type="migration" text="Migration" />

litevue continues from petite-vue 0.4.1, which is no longer actively maintained upstream. Everything petite-vue does still works — the changes below are the full migration surface.

## Package and globals

| | petite-vue | litevue |
| --- | --- | --- |
| npm package | `petite-vue` | `litevue` |
| IIFE/UMD global | `PetiteVue` | `LiteVue` |
| Bundle files | `dist/petite-vue.*.js` | `dist/lite-vue.*.js` |

```diff
- import { createApp } from 'petite-vue';
+ import { createApp } from 'litevue';
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
- `mount()` can be called repeatedly on one app; `unmount()` tears down every batch instead of only the last.
- Reserved scope keys grew: `$store`, `$watch`, `$id`, `$root` join `$refs` / `$nextTick` / `$s`. Rename any conflicting data properties.

## Everything new is opt-in

The [devtools](/globals/devtools), [plugin system](/plugins/), [global store](/globals/store), [magic properties](/magics/el), [extra event modifiers](/directives/v-on#litevue-extras), [`v-teleport`](/directives/v-teleport), and [transitions](/plugins/transition) are all additions — no petite-vue template needs to change to adopt litevue.
