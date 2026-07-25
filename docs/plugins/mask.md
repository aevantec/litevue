---
title: mask
---

# mask <Badge type="section" text="Plugin" />

`v-mask` formats an input's value as the user types.

```js
import { mask } from 'litevue/plugins';
createApp({ phone: '' }).use(mask).mount();
```

<<< ../.vitepress/demos/mask.html{html}

<LiveDemo src="mask" plugins="mask" />

- The attribute value is the **literal** mask (not evaluated).
- Tokens: `9` = digit, `a` = letter, `*` = alphanumeric; every other character is a literal.
- Literals appear lazily — typing `12` into the mask above shows `(12`, not `(12) `.
- Works with [`v-model`](/directives/v-model), which receives the masked value.
