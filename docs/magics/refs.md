---
title: $refs
---

# $refs <Badge type="section" text="Magic" />

Elements registered with the [ref](/directives/ref) attribute, keyed by name:

```html
<div v-scope="{}">
  <input ref="field" />
  <button @click="$refs.field.select()">select</button>
</div>
```

Each `v-scope` gets its own `$refs` object that inherits from the parent scope's refs.
