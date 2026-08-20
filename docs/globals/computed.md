---
title: computed()
---

# computed() <Badge type="section" text="Global" />

Derived state that **caches**. The getter runs once, and re-runs only when the reactive state it read actually changes — no matter how many bindings read the result.

```js
import { computed, createApp, reactive } from '@aevantec/litevue';

const cart = reactive({ items: [], shipping: 5 });
const total = computed(() =>
  cart.items.reduce((sum, i) => sum + i.price, 0) + cart.shipping
);

createApp({ cart, total }).mount();
```

```html
<div v-scope>
  <span>{{ total }}</span>
  <em v-if="total > 50">free shipping</em>
</div>
```

No `.value` in templates — a scope unwraps refs on read, the same way Vue does.

## Compared with a plain getter

A getter on a scope works and stays reactive, but it is **not memoized** — it re-runs on every read:

```js
createApp({
  price: 10,
  qty: 2,
  get total() {
    return this.price * this.qty; // runs once per binding, every update
  },
});
```

Three bindings reading `total` means three evaluations per update. With `computed`, one.

Getters are still the right default for cheap derivations — they need no import and read naturally inline. Reach for `computed` when the work is **actually expensive** (filtering or sorting a large list, formatting dates in a loop, reducing over collections) or when many bindings share one derived value.

::: tip Rule of thumb
Sorting a 500-row table? `computed`. Multiplying two numbers? A getter is fine.
:::

## The source must be reactive first

This is the one real constraint, and it follows from *when* the getter runs. A `computed` tracks whatever reactive state it reads — so that state has to exist, and be reactive, before you create it.

`createApp` makes its argument reactive, which happens **after** your object literal is built. So a `computed` cannot reach a sibling property of the same literal:

```js
// ✗ broken: `data.qty` is read off a plain object, so nothing is tracked
const data = { qty: 2, total: computed(() => data.qty * 10) };
createApp(data).mount();
```

Three patterns that work:

**A store** — already reactive when `store()` returns it. The cleanest option for anything shared:

```js
store('cart', { items: [] });
const count = computed(() => store('cart').items.length);
```

**`reactive()` first**, then hand both to `createApp`:

```js
const state = reactive({ price: 10, qty: 2 });
const total = computed(() => state.price * state.qty);
createApp({ state, total }).mount();
```

**Setup-style `createApp`**, assigning the computed onto the reactive object — the closest thing to Vue's `setup()`:

```js
createApp(() => {
  const s = reactive({ price: 10, qty: 2 });
  s.total = computed(() => s.price * s.qty);
  return s;
}).mount();
```

::: warning Not available inside expressions
`computed` is a JavaScript import, not a magic property, so `v-scope="{ total: computed(...) }"` won't work — expressions can't see it. Use a getter inline, or build the scope in a `<script>` with one of the patterns above.
:::

## Writable computeds

Pass `get` and `set` for two-way derived state — useful with [`v-model`](/directives/v-model):

```js
const state = reactive({ celsius: 0 });
const fahrenheit = computed({
  get: () => state.celsius * 1.8 + 32,
  set: (f) => (state.celsius = (f - 32) / 1.8),
});
```

A getter-only computed **silently ignores writes** — assigning to it is a no-op rather than an error, so reach for the object form when a binding needs to write back.

## In the devtools

Computed values appear in the [inspector panel](/devtools/panel) alongside ordinary state, rendered **read-only** (no input) so an edit can't vanish into a rejected write. Getter-only properties are shown the same way.

## Lifecycle

A `computed` is lazy and pull-based: it does nothing until something reads it, and needs no cleanup. Unlike [`watchEffect`](/globals/watch-effect) there is nothing to stop — it is garbage-collected with the state it closes over.

## Use cases

| Use case                  | Example                                                 |
| ------------------------- | ------------------------------------------------------- |
| Expensive derivation      | filter/sort a long list once per change, not per binding |
| Store-wide totals         | cart totals, unread counts, validation summaries         |
| Values many bindings read | a flag driving several `v-if` / `:class` / `:disabled`   |
| Two-way conversion        | unit conversion behind `v-model`, via `get`/`set`        |

For reacting to changes with a side effect rather than producing a value, use [`watchEffect()`](/globals/watch-effect) or [`$watch`](/magics/watch).
