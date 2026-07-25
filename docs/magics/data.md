---
title: $data
---

# $data <Badge type="magic" text="Magic" />

The current scope object — handy for debugging and serialization:

```html
<div v-scope="{ a: 1, b: 2 }">
  <pre>{{ JSON.stringify($data) }}</pre>
</div>
```

Only the scope's own state serializes; inherited parent state and `$`-helpers are excluded.
