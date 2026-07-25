---
title: v-teleport
---

# v-teleport <Badge type="directive" text="Directive" />

Moves the element under a different parent — a **literal CSS selector** — while it keeps rendering with its original scope. For modals, dropdowns, and toasts that must escape `overflow` or `z-index` contexts.

```html
<div id="modals"></div>

<div v-scope="{ open: false }">
  <button @click="open = true">open</button>
  <div v-if="open" v-teleport="#modals">rendered under #modals</div>
</div>
```

- The selector is not evaluated as an expression — `v-teleport="#modals"`, `v-teleport="body"`.
- Composes with [`v-if`](/directives/v-if): the branch mounts into the target and leaves it on toggle.
- The element is removed from the target when its owning scope unmounts.
- A missing target logs a dev error and leaves the element in place.
