---
title: mask
---

# mask <Badge type="section" text="Plugin" />

Format an input's value as the user types.

```js
import { mask } from '@aevantec/litevue/plugins';
createApp({ phone: '' }).use(mask).mount();
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-mask="pattern"` | Format the input to a literal pattern |

The value is the pattern itself, not an expression: `v-mask="(999) 999-9999"`.

### Tokens

| Token | Accepts |
| --- | --- |
| `9` | A digit |
| `a` | A letter |
| `*` | A letter or digit |

Every other character is a literal, inserted for the user.

## Examples

<<< ../.vitepress/demos/mask.html{html}

<LiveDemo src="mask" plugins="mask" />

```html
<input v-mask="9999 9999 9999 9999" v-model="card" />
<input v-mask="aa-999" v-model="code" />
```

## Behavior

- Literals appear as they are reached: typing `12` into `(999) 999-9999` shows `(12`, not `(12) `.
- [`v-model`](/directives/v-model) receives the formatted value.
- Masking formats input; it does not validate it. Check the value before submitting.

## Related

[v-model](/directives/v-model) · [Installation](/plugins/installation)
