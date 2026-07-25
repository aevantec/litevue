---
title: store()
---

# store() <Badge type="section" text="Global" />

A first-class global store, shared across every app on the page and exposed to expressions as [`$store`](/magics/store).

```js
import { createApp, store } from 'litevue';

store('cart', {
  items: [],
  add(item) {
    this.items.push(item);
  },
  get count() {
    return this.items.length;
  },
  init() {
    // runs once when the store is registered
  },
});

createApp().mount();

// read/mutate from JS anywhere — apps react
store('cart').add('book');
```

```html
<div v-scope>
  <button @click="$store.cart.add('thing')">add</button>
  <span>{{ $store.cart.count }}</span>
</div>
```

- `store(name, value)` registers (and returns) a reactive store; `store(name)` retrieves it.
- Getters are reactive computed values.
- `init()` runs once at registration.
- Registering a store **after** mount is picked up reactively by expressions referencing it.
- Stores appear in the [devtools panel](/devtools/panel) under the Stores tab.
