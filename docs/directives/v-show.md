---
title: v-show
---

# v-show <Badge type="section" text="Directive" />

Toggles the element's `display` style. The element stays mounted — cheaper than [`v-if`](/directives/v-if) for frequent toggles, but hidden content still exists in the DOM.

<<< ../.vitepress/demos/v-show.html{html}

<LiveDemo src="v-show" />

## Animating v-show

Use the [transition plugin](/plugins/transition) — `v-transition:name="expression"` is an animated `v-show` replacement that only hides the element after the leave transition finishes:

```html
<div v-transition:fade="open">fades in and out</div>
```
