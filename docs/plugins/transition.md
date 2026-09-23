---
title: transition
---

# transition <Badge type="section" text="Plugin" />

Animate elements in and out with CSS classes, the way Vue's `<Transition>` does.

```js
import { transition } from '@aevantec/litevue/plugins';
createApp({ open: false }).use(transition).mount();
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-transition:name="expression"` | An animated [`v-show`](/directives/v-show): shown while truthy |
| `v-transition:name` | Animate insertion and removal by [`v-if`](/directives/v-if) or [`v-for`](/directives/v-for) |

`name` prefixes the classes and defaults to `v`.

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.appear` | Also animate the first render |

### Classes

| Stage | Entering | Leaving |
| --- | --- | --- |
| Start | `name-enter-from` | `name-leave-from` |
| Active | `name-enter-active` | `name-leave-active` |
| End | `name-enter-to` | `name-leave-to` |

## Examples

### Show and hide

<<< ../.vitepress/demos/transition.html{html}

<LiveDemo src="transition" plugins="transition" />

### With v-if and v-for

With no expression, `v-if` or `v-for` decides when the element exists. Removal,
and `@unmounted`, wait for the leave transition:

```html
<div v-if="open" v-transition:fade>animates in and out</div>
<li v-for="item in items" :key="item.id" v-transition:slide>{{ item.text }}</li>
```

### The CSS

```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

## Behavior

- Use it instead of `v-show`, not alongside it.
- Durations are read from computed styles, including delays and keyframe animations.
- In show/hide mode the element is hidden only after the leave transition ends.
- Toggling mid-transition is safe; the interrupted transition settles cleanly.

## Related

[v-show](/directives/v-show) · [v-if](/directives/v-if) · [collapse](/plugins/collapse) · [Installation](/plugins/installation)
