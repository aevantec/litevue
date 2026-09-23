---
title: State
---

# State <Badge type="section" text="Essentials" />

State lives in scopes. The root scope comes from `createApp()`; any element can
add its own with [`v-scope`](/directives/v-scope). A nested scope sees its
parents' state, and writing to an inherited key updates the parent that owns it.

| Kind of state | Where it goes |
| --- | --- |
| One region's UI state — open, selected, a draft | `v-scope` on that region |
| Shared by every region of one app | The root scope, via `createApp()` |
| Shared across apps, or with plain scripts | A [store](/globals/store) |

## The root scope

`createApp` accepts a data object exposed to every expression:

```js
import { createApp } from '@aevantec/litevue';

createApp({
  count: 0,
  get plusOne() {
    return this.count + 1;
  },
  increment() {
    this.count++;
  },
}).mount();
```

```html
<div v-scope>
  <p>{{ count }} / {{ plusOne }}</p>
  <button @click="increment">increment</button>
</div>
```

## Setup functions

`createApp` also accepts a function (in the spirit of Vue's `<script setup>`): it runs once and its returned object becomes the root scope, giving you a private closure:

```js
import { createApp, reactive } from '@aevantec/litevue';

createApp(() => {
  const store = reactive({ items: [] });
  const format = (s) => s.toUpperCase(); // private helper

  return {
    store,
    count: 0,
    inc() {
      this.count++;
    },
    labels() {
      return store.items.map(format);
    },
  };
}).mount();
```

::: warning
Plain closure variables (`let count = 0`) are **not** reactive — mutate state through `this`, the returned object, or a `reactive()` object.
:::

## Nested scopes

```html
<div v-scope="{ outer: 'a' }">
  <div v-scope="{ inner: 'b' }">
    {{ outer }} / {{ inner }}
    <!-- writing `outer` here updates the parent scope -->
  </div>
</div>
```

## Methods and getters

Methods are bound to their scope, so `this` works even when a method is passed
as a handler — `@click="increment"`. Getters are reactive but not cached; use
[`computed()`](/globals/computed) for expensive values.

## Sharing state across apps

Use a [store](/globals/store) for state shared between apps or with plain
JavaScript.

## What state can hold

Plain objects, arrays, strings, numbers, booleans, `null` and dates. A `Map` or
`Set` works but is not tracked: changing its contents does not update the page,
while assigning a new one does — see [reactive()](/globals/reactive#behavior).

## Next

Render that state with [Templating](/essentials/templating).
