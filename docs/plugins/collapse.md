---
title: collapse
---

# collapse <Badge type="section" text="Plugin" />

Expand and collapse an element's height with a transition.

```js
import { collapse } from '@aevantec/litevue/plugins';
createApp({ open: false }).use(collapse).mount();
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-collapse="expression"` | Expanded while truthy, collapsed to zero height while falsy |

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.duration-<ms>` | Transition length. Default 250ms |

## Examples

<<< ../.vitepress/demos/collapse.html{html}

<LiveDemo src="collapse" plugins="collapse" />

### Accordion

```html
<div v-scope="{ open: null }">
  <button @click="open = open === 1 ? null : 1">Shipping</button>
  <div v-collapse="open === 1">…</div>
  <button @click="open = open === 2 ? null : 2">Returns</button>
  <div v-collapse.duration-150="open === 2">…</div>
</div>
```

## Behavior

- The initial state applies without animating.
- Once expanded, the fixed height is released, so the content can grow or shrink freely.
- Collapsed content gets `visibility: hidden` once the height reaches 0, so Tab skips it and screen readers do not read it. It becomes visible as soon as it starts to expand.
- On unmount, the element gets back the inline `height`, `overflow`, `transition` and `visibility` it had before.
- For hiding without animating height, use [`v-show`](/directives/v-show).

## Related

[transition](/plugins/transition) · [v-show](/directives/v-show) · [Installation](/plugins/installation)
