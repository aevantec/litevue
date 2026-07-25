---
title: intersect
---

# intersect <Badge type="section" text="Plugin" />

`v-intersect="expression"` runs the expression when the element enters the viewport — lazy loading, scroll-triggered reveals, analytics.

```js
import { intersect } from 'litevue/plugins';
createApp({ seen: false }).use(intersect).mount();
```

<<< ../.vitepress/demos/intersect.html{html}

<LiveDemo src="intersect" plugins="intersect" />

## Modifiers

- **`.once`** — stop observing after the first trigger.
- **`.leave`** — trigger when the element *exits* the viewport instead.
- **`.full`** — require full visibility (threshold 1).

The observer disconnects automatically when the element unmounts.
