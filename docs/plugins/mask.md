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
- Literals at the end of the pattern are added once every slot is filled: typing `123` into `(999)` shows `(123)`. Deleting such a literal does not add it back, so Backspace keeps working from the end of the value.
- [`v-model`](/directives/v-model) receives the formatted value. Its initial value is formatted on mount too, and the model is updated to match, including with the `.lazy` modifier. To do this, the input dispatches one `input` event and one `change` event when the initial value needs formatting, so the element's own `@input` and `@change` handlers also run once at mount.
- Editing in the middle of the value keeps the caret where it was, after the characters before it. Literals before the next slot count as before it, so deleting the first digit of `(123) 456` leaves the caret after the `(`.
- A value set from a script after mount is not formatted until the next input. Set it already formatted, or as the user would type it and dispatch an `input` event.
- Masking formats input; it does not validate it. Check the value before submitting.

## Related

[v-model](/directives/v-model) · [Installation](/plugins/installation)
