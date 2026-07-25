---
title: intersect
---

# intersect <Badge type="plugin" text="Plugin" />

`v-intersect="expression"` runs the expression when the element enters the viewport — lazy loading, scroll-triggered reveals, analytics.

```js
import { intersect } from 'litevue/plugins';
createApp({ seen: false }).use(intersect).mount();
```

```html
<div v-intersect.once="seen = true">…</div>
```

## Modifiers

- **`.once`** — stop observing after the first trigger.
- **`.leave`** — trigger when the element *exits* the viewport instead.
- **`.full`** — require full visibility (threshold 1).

The observer disconnects automatically when the element unmounts.
