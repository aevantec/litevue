# Store & Magic Properties

## Global store

litevue has a first-class global store, shared across every app on the page and available to all expressions as `$store.<name>`:

```html
<script type="module">
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
</script>

<div v-scope>
  <button @click="$store.cart.add('thing')">add</button>
  <span>{{ $store.cart.count }}</span>
</div>
```

Stores are reactive (getters included), an `init()` method runs once at registration, and registering a store *after* mount is picked up reactively by expressions that reference it.

You can also build your own singletons with `reactive` (re-exported from `@vue/reactivity`) and share them through the root scope.

## Magic properties

Every expression has access to:

- **`$el`** — the current element.
- **`$data`** — the current scope object.
- **`$root`** — the app's root scope, from any nested scope.
- **`$refs`** — elements registered with the `ref` attribute.
- **`$nextTick(fn)`** — run `fn` after the next reactive flush.
- **`$store`** — the global stores.
- **`$dispatch(event, detail?)`** — fire a bubbling `CustomEvent` from the current element:

  ```html
  <div @notify="handle($event.detail)">
    <button @click="$dispatch('notify', { id: 1 })">notify up</button>
  </div>
  ```

- **`$watch(source, callback)`** — watch a dot-path string or a getter function; the callback receives `(value, oldValue)`. Watchers stop automatically when their scope unmounts:

  ```html
  <div v-scope="{ count: 0 }" @mounted="$watch('count', (v) => save(v))"></div>
  ```

- **`$id(name)`** — unique ids for accessibility attributes: stable within a scope (so pairs match), unique across scopes:

  ```html
  <label :for="$id('email')">Email</label>
  <input :id="$id('email')" />
  ```

::: warning Reserved keys
`$store`, `$refs`, `$nextTick`, `$watch`, `$id`, `$root`, and `$s` are set on every root scope — avoid using these keys in your own data.
:::
