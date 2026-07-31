---
title: focus
---

# focus <Badge type="section" text="Plugin" />

Focus utilities: `v-focus` for autofocus behavior and `v-trap` for accessible focus containment.

```js
import { focus } from '@aevantec/litevue/plugins';
createApp({ editing: false, open: false }).use(focus).mount();
```

## v-focus

Focuses the element whenever the expression becomes truthy (including on mount, making it an autofocus). Add `.select` to also select the text:

<<< ../.vitepress/demos/focus.html{html}

<LiveDemo src="focus" plugins="focus" />

## v-trap

While the expression is truthy, Tab / Shift+Tab focus cycling is contained within the element — wrapping at the edges and pulling stray focus back in. Focus moves to the first focusable child on activation and returns to the previously focused element on release. Accessible modals in one attribute:

```html
<div v-show="open" v-trap="open">
  <button>first</button>
  <button @click="open = false">close (restores focus)</button>
</div>
```
