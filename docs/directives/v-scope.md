---
title: v-scope
---

# v-scope <Badge type="section" text="Directive" />

Marks a region of the page controlled by litevue and declares its state.

```html
<div v-scope="{ open: false, items: [] }">…</div>
```

With the `init` script attribute (or a bare `createApp().mount()`), every top-level `v-scope` region becomes an app root.

## Empty scope

The value can be omitted when the region only uses inherited or root state — the attribute then simply marks the element for processing:

```html
<div v-scope>
  {{ rootStateHere }}
</div>
```

## Inheritance

Nested scopes inherit from their parents; own keys shadow, and writes to inherited keys fall through to the owning parent:

```html
<div v-scope="{ msg: 'parent' }">
  <div v-scope="{ own: 1 }">
    {{ msg }} <!-- 'parent' -->
    <button @click="msg = 'set from child'">updates the parent</button>
  </div>
</div>
```

## Component functions

The expression can call a function that returns the scope — see [Templating](/essentials/components).

## See also

- [State](/essentials/state)
- [v-name](/directives/v-name) — naming scopes for devtools
