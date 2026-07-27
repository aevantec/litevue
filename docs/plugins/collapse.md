---
title: collapse
---

# collapse <Badge type="section" text="Plugin" />

`v-collapse="expression"` expands and collapses the element's height with a transition — accordions and disclosure panels without measuring anything yourself.

```js
import { collapse } from '@aevantec/litevue/plugins';
createApp({ open: false }).use(collapse).mount();
```

<<< ../.vitepress/demos/collapse.html{html}

<LiveDemo src="collapse" plugins="collapse" />

- The initial state applies without animating.
- After expanding, the fixed height is released so content can resize freely.
- **`.duration-<ms>`** overrides the default 250ms: `v-collapse.duration-100="open"`.
