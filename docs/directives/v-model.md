---
title: v-model
---

# v-model <Badge type="section" text="Directive" />

Keep a native form control and reactive state in sync.

```html
<input v-model="name" />
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-model="property"` | Two-way bind the control to a scope property |

No argument. Supported on text inputs, textareas, checkboxes, radios and
selects, including `multiple`.

### Controls

| Control | Model value |
| --- | --- |
| Text input, textarea | String, or a number with `.number` |
| Checkbox | Boolean, or the `:true-value` / `:false-value` pair |
| Checkbox group | Array of the checked values |
| Radio group, single select | The selected value |
| Multiple select | Array of the selected values |

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.lazy` | Sync on `change` rather than `input` |
| `.number` | Cast to a number; unparseable input stays a string |
| `.trim` | Trim whitespace; takes precedence over `.number` |
| `.debounce` / `.debounce-<ms>` | Delay writes from input events; default 250ms |
| `.fill` | Seed an empty model from the control's initial `value` |

`.debounce` and `.fill` are LiteVue additions; the rest match Vue.

## Examples

<<< ../.vitepress/demos/v-model.html{html}

<LiveDemo src="v-model" />

### Non-string values

Bind the value rather than writing it as an attribute. Checkboxes also accept
`:true-value` and `:false-value`.

```html
<input type="checkbox" v-model="plan" :true-value="pro" :false-value="free" />
```

### With v-mask

The [mask plugin](/plugins/mask) formats the value before `v-model` reads it,
so the model receives the masked string.

## Behavior

- `<input type="number">` casts to a number without needing `.number`.
- Writes are batched with every other reactive update. Read the DOM after [`$nextTick`](/magics/next-tick).
- `.fill` only seeds when the model is `null`, `undefined` or an empty string — it never overwrites existing state.
- A pending `.debounce` is cancelled when the region unmounts, so a late write cannot land on a torn-down scope.
- Radios and checkboxes re-sync on every update, since the browser retoggles them natively.

## Related

[v-bind](/directives/v-bind) · [mask](/plugins/mask) · [Templating](/essentials/templating)
