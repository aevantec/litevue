---
title: focus
---

# focus <Badge type="section" text="Plugin" />

Move focus to an element, or keep focus inside one.

```js
import { focus } from '@aevantec/litevue/plugins';
createApp({ editing: false, open: false }).use(focus).mount();
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-focus="expression"` | Focus the element whenever the value becomes truthy, including on mount |
| `v-trap="expression"` | While truthy, keep keyboard focus inside the element |

### Modifiers

| Modifier | Applies to | Meaning |
| --- | --- | --- |
| `.select` | `v-focus` | Also select the text of an input or textarea |

## Examples

### Focusing an input

<<< ../.vitepress/demos/focus.html{html}

<LiveDemo src="focus" plugins="focus" />

### An accessible modal

```html
<div v-show="open" v-trap="open" role="dialog" aria-modal="true">
  <button>First</button>
  <button @click="open = false">Close</button>
</div>
```

## Behavior

- `v-focus` with a constant `true` works as an autofocus.
- When `v-trap` activates, focus moves to the first focusable child. Tab and Shift+Tab wrap at the edges, and focus that strays outside is pulled back in.
- When it deactivates, focus returns to the element that had it before.
- Focusable means links, buttons, form fields, `details` and elements with a non-negative `tabindex`.

## Related

[v-show](/directives/v-show) · [v-teleport](/directives/v-teleport) · [Installation](/plugins/installation)
