---
title: v-bind
---

# v-bind <Badge type="directive" text="Directive" />

Binds an attribute to an expression. Shorthand: `:`.

```html
<div v-scope="{ url: '/a', active: true }">
  <a :href="url" :class="{ active }" :style="{ color: active ? 'green' : '' }">
    link
  </a>
</div>
```

- `:class` accepts Vue's string / object / array forms and merges with the static `class` attribute.
- `:style` accepts object syntax, `!important`, and auto-prefixing.
- Boolean-ish attributes are removed when the value is `false`/`null`/`undefined`.

## `ref` binding

`:ref` is treated as the [ref](/directives/ref) directive, letting the ref name be dynamic.
