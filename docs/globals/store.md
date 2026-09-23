---
title: store()
---

# store() <Badge type="section" text="Global" />

Register named state that every app on the page shares, reachable in
expressions as [`$store`](/magics/store).

```js
import { createApp, store } from '@aevantec/litevue';

store('cart', {
  items: [],
  add(item) {
    this.items.push(item);
  },
  get count() {
    return this.items.length;
  },
});

createApp().mount();
```

```html
<button @click="$store.cart.add('book')">Add</button>
<span>{{ $store.cart.count }}</span>
```

## Signature

```ts
store<T extends object>(name: string, value: T): T  // register
store<T extends object>(name: string): T | undefined  // read
```

Registering returns the reactive store. Reading returns `undefined` for a name
that was never registered.

### Special keys

| Key | Meaning |
| --- | --- |
| `init()` | Runs once, when the store is registered, with `this` as the store |

## Examples

### From JavaScript

Read and change a store from any script — every app reading it updates:

```js
store('cart').add('book');
```

### Initializing

```js
store('session', {
  user: null,
  async init() {
    this.user = await fetch('/api/me').then((r) => r.json());
  },
});
```

### Persisting

Keep a store in `localStorage` across page loads with the
[persist plugin](/plugins/persist#persisting-a-store):

```js
import { persistStore } from '@aevantec/litevue/plugins';

store('cart', { items: [], coupon: '' });

persistStore('cart'); // the whole store
persistStore('cart', { keys: ['items'] }); // selected properties
persistStore('cart', { storage: 'session' }); // sessionStorage instead
```

## Behavior

- Registering a name again replaces the store and runs its `init()` again.
- A store registered after mount still reaches expressions that already reference it.
- Getters are reactive but not cached; they run on every read. Use [`computed()`](/globals/computed) for expensive derivations.
- Stores appear in the [inspector panel](/devtools/panel) under the Stores tab.

## Related

[$store](/magics/store) · [persist](/plugins/persist) · [computed()](/globals/computed) · [State](/essentials/state#sharing-state-across-apps)
