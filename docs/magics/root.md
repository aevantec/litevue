---
title: $root
---

# $root <Badge type="section" text="Magic" />

The app's root scope, reachable from any nested scope — read or write:

```html
<div v-scope="{ msg: 'child' }">
  <span>{{ $root.msg }}</span>
  <button @click="$root.msg = 'set from child'">update root</button>
</div>
```

Writes through `$root` bypass the scope chain and land directly on the root scope.
