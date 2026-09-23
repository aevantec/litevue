---
title: watchEffect()
---

# watchEffect() <Badge type="section" text="Global" />

Run a function now, and again whenever the reactive state it read changes.

```js
import { store, watchEffect } from '@aevantec/litevue';

store('cart', { items: [] });

const stop = watchEffect(() => {
  document.title = `Cart (${store('cart').items.length})`;
});
```

## Signature

```ts
watchEffect(fn: () => void): () => void
```

Returns a function that stops the effect. The JavaScript counterpart to
[`v-effect`](/directives/v-effect), for work not tied to an element.

## Examples

### What it tracks

Any read of reactive state during a run: [stores](/globals/store), objects from
[`reactive()`](/globals/reactive), and scopes. Plain objects and local variables
are never tracked.

```js
const state = reactive({ n: 0 });
watchEffect(() => console.log(state.n)); // logs 0, then on every change
```

Dependencies are collected on each run, so a branch that is not taken is not
tracked until it is:

```js
watchEffect(() => (state.useA ? state.a : state.b));
```

### Stopping it

Nothing stops a `watchEffect` for you — it is not tied to a scope or an app, so
`unmount()` leaves it running. Keep the returned function for anything that
lives shorter than the page:

```js
const stop = watchEffect(() => syncChart(store('metrics')));
// later
stop();
```

### Common uses

| Use | Example |
| --- | --- |
| Sync state outside templates | Storage, URL query parameters, cookies |
| Reflect state onto the document | `document.title`, a theme class on `<html>` |
| Drive other widgets | `chart.update(…)`, `map.setView(…)`, a web component |
| Cross-cutting reactions | Autosave, analytics, unsaved-changes warnings |

## Behavior

- The first run is synchronous, inside the `watchEffect` call. A throw there reaches your code.
- Re-runs are batched: several changes in one tick cause one run, after the DOM has updated — so reading elements inside is safe.
- A re-run that throws is reported to [`app.onError()`](/essentials/error-handling#app-onerror) and does not stop other updates on the page.
- Unlike `@vue/reactivity`'s low-level `effect`, it never runs mid-update.
- For reactions that stop with their element, use [`v-effect`](/directives/v-effect) or [`$watch`](/magics/watch).

## Related

[v-effect](/directives/v-effect) · [$watch](/magics/watch) · [computed()](/globals/computed) · [persist](/plugins/persist)
