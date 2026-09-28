---
title: v-teleport
---

# v-teleport <Badge type="section" text="Directive" />

Move an element under a different parent, while it keeps its original scope.

```html
<div v-teleport="body" v-show="open">Modal</div>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-teleport="selector"` | Move the element to the end of the first match for a CSS selector |

The value is a literal selector, not an expression: `v-teleport="#modals"`, not
`v-teleport="'#modals'"`. No argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-teleport.html{html}

<LiveDemo src="v-teleport" />

### Conditional modal

```html
<div v-if="showModal" v-teleport="#modals" class="modal">…</div>
```

## Behavior

- Use it for modals, dropdowns and toasts that must escape an `overflow: hidden` or stacking-context parent.
- The target must exist when the region mounts. A missing target logs a development error and leaves the element where it was.
- The element is removed from the target when its region unmounts, or when its `v-if` turns false.
- LiteVue addition; the Vue equivalent is the `<Teleport>` component.

## Related

[v-if](/directives/v-if) · [v-show](/directives/v-show)
