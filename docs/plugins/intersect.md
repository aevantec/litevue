---
title: intersect
---

# intersect <Badge type="section" text="Plugin" />

Run an expression when an element enters or leaves the viewport.

```js
import { intersect } from '@aevantec/litevue/plugins';
createApp({ seen: false }).use(intersect).mount();
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-intersect="expression"` | Run each time any part of the element enters the viewport |

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.once` | Stop observing after the first run |
| `.leave` | Run when the element leaves the viewport instead |
| `.full` | Only when the whole element is visible |

## Examples

<<< ../.vitepress/demos/intersect.html{html}

<LiveDemo src="intersect" plugins="intersect" />

### Lazy loading and infinite scroll

```html
<img v-intersect.once="$el.src = $el.dataset.src" data-src="/photo.jpg" />
<div v-intersect="loadMore()"></div>
```

## Behavior

- Backed by one `IntersectionObserver` per element, relative to the viewport.
- The observer disconnects when the element unmounts.
- Modifiers combine: `.once.full` runs once, the first time the element is fully visible.

## Related

[resize](/plugins/resize) · [v-effect](/directives/v-effect) · [Installation](/plugins/installation)
