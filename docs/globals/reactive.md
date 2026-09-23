---
title: reactive()
---

# reactive() <Badge type="section" text="Global" />

Make an object reactive, so templates and effects that read it update when it
changes.

```js
import { createApp, reactive } from '@aevantec/litevue';

const session = reactive({ user: null, theme: 'light' });

createApp({ session }).mount();

// later, anywhere — the page updates
session.theme = 'dark';
```

## Signature

```ts
reactive<T extends object>(target: T): T
```

Returns a reactive proxy of `target`. Re-exported from `@vue/reactivity`.

## Examples

### Shared state without a store

Hand the same object to several apps, or to code outside LiteVue:

```js
export const filters = reactive({ query: '', tags: [] });

createApp({ filters }).mount('#sidebar');
createApp({ filters }).mount('#results');
```

For named state that expressions reach as `$store.name`, use
[`store()`](/globals/store) instead.

### As a source for computed()

`computed()` only tracks state that is already reactive, so create the object
first:

```js
const state = reactive({ price: 10, qty: 2 });
const total = computed(() => state.price * state.qty);
createApp({ state, total }).mount();
```

## Behavior

- Deep: nested objects and arrays become reactive when read.
- Always read and write through the returned proxy. Changes made to the original object are not seen.
- Destructuring copies the values out and loses reactivity: `const { theme } = session` is a plain string.
- Takes objects and arrays only. `Map`, `Set`, `WeakMap` and `WeakSet` are not supported — their support is removed from the build for size, and one reachable from reactive state throws when read. Use plain objects and arrays.
- `createApp()` and `v-scope` already make their state reactive; you need `reactive()` only for state created in JavaScript.

## Related

[store()](/globals/store) · [computed()](/globals/computed) · [watchEffect()](/globals/watch-effect) · [State](/essentials/state)
