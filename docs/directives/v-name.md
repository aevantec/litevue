---
title: v-name
---

# v-name <Badge type="section" text="Directive" />

Gives a scope an explicit [devtools](/devtools/panel) name, so the element doesn't need an `id`. The attribute is removed from the DOM at mount and exists only for inspection:

```html
<div v-name="cart" v-scope="{ items: [] }">…</div>
```

```js
// look a scope up by name from the console
__LITE_VUE__.getScopeByName('cart');
```

The inspector panel labels scopes as tags — `v-name` first, then element id, then tag name (e.g. `<cart>`, `<counter>`, `<div>`).
