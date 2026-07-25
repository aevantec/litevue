---
title: v-for
---

# v-for <Badge type="section" text="Directive" />

Renders a list. litevue does real **keyed reconciliation** — with `:key`, reorders move existing DOM nodes instead of rewriting them, preserving element state.

<<< ../.vitepress/demos/v-for.html{html}

<LiveDemo src="v-for" />

Index and object forms work too:

```html
<li v-for="(item, index) in items">{{ index }}: {{ item }}</li>
<li v-for="(value, key) in object">{{ key }} = {{ value }}</li>
```

Array mutations (`push`, `splice`, `reverse`, …) and replacement are both reactive.

## Item removal transitions

An item carrying [`v-transition`](/plugins/transition) with no expression animates out before removal — see [unmount mode](/plugins/transition#unmount-mode-v-if-v-for).
