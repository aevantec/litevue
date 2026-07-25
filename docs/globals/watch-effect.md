---
title: watchEffect()
---

# watchEffect() <Badge type="section" text="Global" />

Runs a function now, then again whenever any reactive state it read changes — the JS-side counterpart to [`v-effect`](/directives/v-effect), for work that isn't tied to an element.

```js
import { store, watchEffect } from 'litevue';

store('cart', { items: [] });

const stop = watchEffect(() => {
  document.title = `Cart (${store('cart').items.length})`;
});
```

It returns a function that **stops watching**:

```js
stop();
```

## What it tracks

Any read of reactive state during the run: [stores](/globals/store), objects from [`reactive()`](/globals/create-app#other-exports), and element scopes (reachable through the [devtools registry](/globals/devtools)). Plain objects and local variables are not reactive and are never tracked.

```js
const state = reactive({ n: 0 });
watchEffect(() => console.log(state.n)); // logs 0, then on every change
```

Dependencies are collected **per run**, so a branch that isn't taken isn't tracked — the effect starts tracking `b` only once it actually reads it:

```js
watchEffect(() => (state.useA ? state.a : state.b));
```

## Timing

Re-runs are batched through the framework scheduler:

- the **first run is synchronous**, when you call `watchEffect`;
- afterwards, a burst of mutations in one tick produces **one** re-run;
- by the time it re-runs, the DOM already reflects the new state — so reading elements inside is safe.

This is the difference from `@vue/reactivity`'s low-level `effect`, which fires synchronously on every single mutation and would see the DOM mid-update.

## Lifecycle

Nothing stops a `watchEffect` automatically — it is not bound to a scope or an app, so `unmount()` does not clear it. Hold onto the returned function for anything shorter-lived than the page:

```js
const stop = watchEffect(() => syncChart(store('metrics')));
// later
stop();
```

For per-element reactions that clean themselves up on unmount, use [`v-effect`](/directives/v-effect) or the [`$watch`](/magics/watch) magic instead.

## Use cases

| Use case                        | Example                                              |
| ------------------------------- | ---------------------------------------------------- |
| Sync state outside templates    | write to storage, URL query params, cookies          |
| Reflect state onto the document | `document.title`, a theme class on `<html>`          |
| Drive non-litevue widgets       | `chart.update(…)`, `map.setView(…)`, a web component |
| Cross-cutting reactions         | autosave, analytics, unsaved-changes warnings        |

The [persist plugin](/plugins/persist) is built on it — `persistStore()` is a `watchEffect` that snapshots a store into storage.
