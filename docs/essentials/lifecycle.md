---
title: Lifecycle
---

# Lifecycle <Badge type="essentials" text="Essentials" />

Listen to the special `mounted` and `unmounted` events on any element:

```html
<div
  v-if="show"
  @mounted="console.log('mounted on: ', $el)"
  @unmounted="console.log('unmounted: ', $el)"
></div>
```

- `@mounted` fires after the element is compiled and inserted (next tick).
- `@unmounted` fires when the owning block is torn down — for example when a [`v-if`](/directives/v-if) branch switches or the app unmounts.
- With a [leave transition](/plugins/transition#unmount-mode-v-if-v-for), `@unmounted` waits until the animation finishes.

Combine with [`$watch`](/magics/watch) to react to state from a lifecycle hook:

```html
<div v-scope="{ count: 0 }" @mounted="$watch('count', (v) => save(v))"></div>
```

::: info Deprecated aliases
The petite-vue names `@vue:mounted` / `@vue:unmounted` still work but log a deprecation warning in dev. See [migrating from petite-vue](/migration/from-petite-vue).
:::
