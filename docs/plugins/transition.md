---
title: transition
---

# transition <Badge type="section" text="Plugin" />

Vue-style enter/leave transitions.

```js
import { transition } from 'litevue/plugins';
createApp({ open: false }).use(transition).mount();
```

## Show/hide mode

`v-transition:name="expression"` is an animated [`v-show`](/directives/v-show) replacement. On show it applies `name-enter-from` → `name-enter-active` → `name-enter-to`; on hide the `leave-*` equivalents — and the element is only hidden **after** the leave transition finishes. Durations (including delays and keyframe animations) are read from computed styles:

<<< ../.vitepress/demos/transition.html{html}

<LiveDemo src="transition" plugins="transition" />

- The name defaults to `v` (`v-enter-from`, …).
- **`.appear`** animates the initial render.
- Use it *instead of* `v-show`.

## Unmount mode (v-if / v-for)

With **no expression**, the element's lifetime is controlled by [`v-if`](/directives/v-if) or [`v-for`](/directives/v-for): the enter transition runs when the element is inserted, and the core **delays DOM removal** (and `@unmounted`) until the leave transition finishes:

```html
<div v-if="open" v-transition:fade>animates in and out with v-if</div>
```

Rapid toggling is safe — interrupted transitions settle cleanly.
