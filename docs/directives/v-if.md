---
title: v-if
---

# v-if <Badge type="section" text="Directive" />

Conditionally mounts an element. Unlike [`v-show`](/directives/v-show), the element and its scope are fully created and destroyed — [lifecycle events](/essentials/lifecycle) fire on each toggle.

```html
<div v-scope="{ status: 'loading' }">
  <p v-if="status === 'loading'">Loading…</p>
  <p v-else-if="status === 'error'">Something broke.</p>
  <p v-else>Ready.</p>
</div>
```

`v-else` / `v-else-if` branches must be immediate siblings.

## Animating v-if

Add [`v-transition`](/plugins/transition) with no expression to animate mount and unmount — DOM removal (and `@unmounted`) waits for the leave transition:

```html
<div v-if="open" v-transition:fade>animates in and out</div>
```

## With v-teleport

`v-if` composes with [`v-teleport`](/directives/v-teleport) — the branch mounts into the teleport target and is removed from it on toggle.
