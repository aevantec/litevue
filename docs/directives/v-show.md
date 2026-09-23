---
title: v-show
---

# v-show <Badge type="section" text="Directive" />

Toggle an element's visibility without removing it from the DOM.

```html
<p v-show="open">Details stay mounted.</p>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-show="expression"` | Show while the value is truthy, hide when it is not |

No argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-show.html{html}

<LiveDemo src="v-show" />

### Animating v-show

Use the [transition plugin](/plugins/transition) instead. `v-transition:name="expression"`
is an animated `v-show` that hides the element only once the leave transition
finishes — do not put both directives on one element.

```html
<div v-transition:fade="open">fades in and out</div>
```

## Behavior

- Hiding sets inline `display: none`; showing restores the element's previous inline value.
- The subtree stays mounted. Effects, watchers and listeners keep running, and no lifecycle hooks fire on toggle.
- Cheaper than [`v-if`](/directives/v-if) for frequent toggles, but the hidden content is still in the DOM and still reachable.
- Needs a real element. Use `v-if` on a `<template>`.

## Related

[v-if](/directives/v-if) · [transition](/plugins/transition) · [collapse](/plugins/collapse)
