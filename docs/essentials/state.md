---
title: State
---

# State <Badge type="section" text="Essentials" />

State lives in scopes. A scope is declared either at the app level (the root scope) or on an element with [`v-scope`](/directives/v-scope). Child scopes inherit from their parents through the prototype chain, and writes to inherited properties fall through to the owning parent.

## The root scope

`createApp` accepts a data object exposed to every expression:

```js
import { createApp } from 'litevue';

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
import { createApp, reactive } from 'litevue';

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

## Sharing state across apps

Use the [global store](/globals/store) for state shared between apps or with plain JS.
