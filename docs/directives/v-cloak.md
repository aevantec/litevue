---
title: v-cloak
---

# v-cloak <Badge type="directive" text="Directive" />

Removed from the element once litevue takes over — pair it with a CSS rule to hide uncompiled templates until mount:

```css
[v-cloak] {
  display: none;
}
```

```html
<div v-scope="{ msg: 'ready' }" v-cloak>{{ msg }}</div>
```

Without it, users on slow connections may briefly see raw uncompiled mustache braces.
