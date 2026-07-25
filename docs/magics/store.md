# $store

Access the [global stores](/globals/store) from any expression:

```html
<div v-scope>
  <button @click="$store.cart.add('thing')">add</button>
  <span>{{ $store.cart.count }}</span>
</div>
```

Stores are shared across every app on the page, fully reactive (getters included), and stores registered *after* mount are picked up reactively by expressions that reference them.
