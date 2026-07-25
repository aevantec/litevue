# collapse

`v-collapse="expression"` expands and collapses the element's height with a transition — accordions and disclosure panels without measuring anything yourself.

```js
import { collapse } from 'litevue/plugins';
createApp({ open: false }).use(collapse).mount();
```

```html
<button @click="open = !open">toggle</button>
<div v-collapse="open">
  <p>collapsible content</p>
</div>
```

- The initial state applies without animating.
- After expanding, the fixed height is released so content can resize freely.
- **`.duration-<ms>`** overrides the default 250ms: `v-collapse.duration-100="open"`.
