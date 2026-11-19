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
- A character that equals the next literal in the pattern is read as that literal, so a value that already contains its literals is not doubled: pasting `15551234567` into `+1 (999) 999-9999` shows `+1 (555) 123-4567`. The same rule takes such a character as the literal even when it was meant for a slot. Typing `1` into an empty `+1 (999) 999-9999` leaves the field empty, and pasting `D12` into `ID-***` shows `ID-12`. A pattern whose literals contain letters or digits works as expected when the value is entered either without those literals or with all of them.
- Literals at the end of the pattern are added once every slot is filled: typing `123` into `(999)` shows `(123)`. Deleting such a literal does not add it back, so Backspace keeps working from the end of the value.
- [`v-model`](/directives/v-model) receives the formatted value. Its initial value is formatted on mount too, and the model is updated to match, including with the `.lazy` modifier. To do this, the input dispatches one `input` event and one `change` event when the initial value needs formatting, whether it comes from `v-model`, a `:value` binding or the `value` attribute, so the element's own `@input` and `@change` handlers also run once at mount.
- Editing in the middle of the value keeps the caret where it was, after the characters before it. Literals before the next slot count as before it, so deleting the first digit of `(123) 456` leaves the caret after the `(`.
- A value set from a script after mount is not formatted until the next input. Set it already formatted, or as the user would type it and dispatch an `input` event.
- Masking formats input; it does not validate it. Check the value before submitting.

## Related

[v-model](/directives/v-model) · [Installation](/plugins/installation)
