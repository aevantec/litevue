---
title: v-if
---

# v-if <Badge type="section" text="Directive" />

Render an element only while a condition is true.

```html
<p v-if="user">Welcome back, {{ user.name }}</p>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-if="expression"` | Render while the value is truthy |
| `v-else-if="expression"` | Checked when every earlier branch is false |
| `v-else` | Rendered when every earlier branch is false |

`v-else-if` and `v-else` must be the immediate next sibling of the branch before
them. No argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-if.html{html}

<LiveDemo src="v-if" />

### Grouping without a wrapper

Put `v-if` on a `<template>` to toggle several elements at once:

```html
<template v-if="step === 2">
  <h2>Shipping</h2>
  <form>…</form>
</template>
```

### Animating

Add [`v-transition`](/plugins/transition) with no expression. Removal, and
`@unmounted`, wait for the leave transition:

```html
<div v-if="open" v-transition:fade>animates in and out</div>
```

### With v-teleport

The branch mounts into the [`v-teleport`](/directives/v-teleport) target and is
removed from it when the condition turns false.

```html
<div v-if="showModal" v-teleport="#modals">…</div>
```

## Behavior

- A false branch is removed from the DOM. Its effects and listeners stop, and [`@unmounted`](/essentials/lifecycle) fires; showing it again builds it fresh, so any state inside it resets.
- `v-if` is processed before `v-for` on the same element, so it cannot read the loop variable. Move the condition to an inner element or filter the list.
- For frequent toggles where state should survive, use [`v-show`](/directives/v-show).

## Related

[v-show](/directives/v-show) · [v-for](/directives/v-for) · [transition](/plugins/transition) · [Lifecycle](/essentials/lifecycle)
