---
title: Globals
---

# Globals <Badge type="global" text="Global" />

The JavaScript API exported by the `litevue` package.

| Export | Purpose |
| --- | --- |
| [createApp()](/globals/create-app) | create an app: `mount`, `unmount`, `use`, `directive`, `scope` |
| [store()](/globals/store) | register/retrieve global stores backing [`$store`](/magics/store) |
| [Devtools API](/globals/devtools) | the `__LITE_VUE__` registry, its events, and `disableDevtools()` |
| `reactive` | re-export of `@vue/reactivity` for shared state singletons |
| `nextTick` | JS-side counterpart of [`$nextTick`](/magics/next-tick) |
| `App`, `Plugin` | TypeScript types for [plugin](/plugins/) authors |
