---
title: $watch
---

# $watch <Badge type="magic" text="Magic" />

Watches a piece of state and runs a callback with `(value, oldValue)` on change. The source is a dot-path string or a getter function:

```html
<div v-scope="{ count: 0, user: { name: '' } }"
     @mounted="$watch('count', (v, old) => save(v))">
</div>
```

```js
// getter form, from a setup function or method
$watch(() => this.user.name, (name) => sync(name));
```

Watchers are tied to their scope's lifecycle — they stop automatically when the scope unmounts. Reads inside the callback don't become dependencies.
