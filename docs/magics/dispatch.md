# $dispatch

Fires a bubbling `CustomEvent` from the current element — the standard way for a child scope to notify a parent:

```html
<div v-scope="{ got: '' }" @notify="got = $event.detail.from">
  <button @click="$dispatch('notify', { from: 'child' })">notify up</button>
  <span>{{ got }}</span>
</div>
```

The second argument becomes `$event.detail`. Listen with plain [`v-on`](/directives/v-on) anywhere up the tree.
