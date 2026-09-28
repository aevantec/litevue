---
title: computed()
---

# computed() <Badge type="section" text="Global" />

Derived state that is cached, and recalculated only when its sources change.

```js
import { computed, createApp, reactive } from '@aevantec/litevue';

const cart = reactive({ items: [], shipping: 5 });
const total = computed(
  () => cart.items.reduce((sum, i) => sum + i.price, 0) + cart.shipping
);

createApp({ cart, total }).mount();
```

```html
<div v-scope>
  <span>{{ total }}</span>
  <em v-if="total > 50">free shipping</em>
</div>
```

## Signature

```ts
computed<T>(getter: () => T): ComputedRef<T>
computed<T>(options: { get: () => T; set: (value: T) => void }): WritableComputedRef<T>
```

Re-exported from `@vue/reactivity`. In templates, read it without `.value` —
scopes unwrap it. In JavaScript, use `total.value`.

## Examples

### Computed or a getter?

A getter on a scope is reactive too, but it runs again on every read:

```js
createApp({
  price: 10,
  qty: 2,
  get total() {
    return this.price * this.qty; // runs once per binding, every update
  },
});
```

Use a getter for cheap values. Use `computed` when the work is expensive —
sorting or filtering a long list, formatting in a loop — or when many bindings
read the same value.

::: tip Rule of thumb
Sorting a 500-row table? `computed`. Multiplying two numbers? A getter is fine.
:::

### Make the source reactive first

A `computed` tracks the reactive state it reads, so that state must already be
reactive when the `computed` is created. `createApp` makes its argument reactive
only after your object is built, so this does not work:

```js
// ✗ `data.qty` is read from a plain object, so nothing is tracked
const data = { qty: 2, total: computed(() => data.qty * 10) };
createApp(data).mount();
```

Any of these does:

```js
// a store is reactive as soon as it is registered
store('cart', { items: [] });
const count = computed(() => store('cart').items.length);

// reactive() first, then hand both to createApp
const state = reactive({ price: 10, qty: 2 });
const total = computed(() => state.price * state.qty);
createApp({ state, total }).mount();

// a setup function, the closest thing to Vue's setup()
createApp(() => {
  const s = reactive({ price: 10, qty: 2 });
  s.total = computed(() => s.price * s.qty);
  return s;
}).mount();
```

### Writable

Pass `get` and `set` for a value [`v-model`](/directives/v-model) can write back
to:

```js
const state = reactive({ celsius: 0 });
const fahrenheit = computed({
  get: () => state.celsius * 1.8 + 32,
  set: (f) => (state.celsius = (f - 32) / 1.8),
});
```

### Common uses

| Use | Example |
| --- | --- |
| Expensive derivation | Filter or sort a long list once per change, not per binding |
| Totals over a store | Cart totals, unread counts, validation summaries |
| A value many bindings read | A flag driving several `v-if`, `:class` and `:disabled` |
| Two-way conversion | Unit conversion behind `v-model` |

## Behavior

- Lazy: the getter runs only when something reads the value, and at most once per change.
- Needs no cleanup — it is garbage-collected with the state it closes over.
- `computed` is an import, not a magic, so it cannot be called inside an expression: `v-scope="{ total: computed(…) }"` does not work.
- Writing to a getter-only computed is silently ignored. Use the `get`/`set` form when a binding writes back.
- The [inspector panel](/devtools/panel) shows computed values read-only.

## Related

[reactive()](/globals/reactive) · [watchEffect()](/globals/watch-effect) · [$watch](/magics/watch) · [store()](/globals/store)
