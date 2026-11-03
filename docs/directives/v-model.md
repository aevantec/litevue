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
| Multiple select | Array of the selected values; start it as `[]` |

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.lazy` | Sync on `change` rather than `input` |
| `.number` | Cast to a number; input that does not parse, including an empty field, stays a string |
| `.trim` | Trim whitespace; with `.number`, the trimmed value is then cast |
| `.debounce` / `.debounce-<ms>` | Delay writes from input events; default 250ms |
| `.fill` | Seed an empty model from the control's initial value, checked state or selected option |

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

- A model that is `null` or `undefined` renders an empty text field, so a field bound to a key that does not exist yet, such as `form.name` on `{ form: {} }`, starts blank.
- `<input type="number">` casts to a number without needing `.number`. Clearing it writes `''`, as in Vue, not `0`.
- Writes are batched with every other reactive update. Read the DOM after [`$nextTick`](/magics/next-tick).
- `.fill` only seeds when the model is `null`, `undefined` or an empty string — it never overwrites existing state. A radio seeds only when it is checked, and a select whose selected option has an empty `value`, such as a placeholder, seeds nothing.
- A pending `.debounce` is cancelled when the region unmounts, so a late write cannot land on a torn-down scope.
- Radios and checkboxes re-sync on every update, since the browser retoggles them natively, and when their bound `:value` changes. A select re-syncs when its options change, so options rendered after the model, such as from a request, still show the selected value.

## Related

[v-bind](/directives/v-bind) · [mask](/plugins/mask) · [Templating](/essentials/templating)
