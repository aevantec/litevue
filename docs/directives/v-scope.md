---
title: v-scope
---

# v-scope <Badge type="section" text="Directive" />

Mark a region for LiteVue and declare its state.

```html
<div v-scope="{ count: 0 }">
  <button @click="count++">{{ count }}</button>
</div>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-scope="{ … }"` | A region with its own state |
| `v-scope="Component(props)"` | State returned by a [component](/essentials/components) function |
| `v-scope` | A region that only uses inherited or root state |

### Modifiers

Defer mounting a region until it is needed. Until then nothing inside is bound —
no scope, effects or listeners.

| Modifier | Mounts when |
| --- | --- |
| `.visible` | The region scrolls into view |
| `.idle` | The browser is next idle |
| `.interaction` | The first pointer press, key press or focus inside the region |

### Special keys

| Key | Meaning |
| --- | --- |
| `$template` | Markup for the region: `'#id'` of a `<template>`, or an HTML string — see [Components](/essentials/components#reusable-templates) |

## Examples

<<< ../.vitepress/demos/v-scope.html{html}

<LiveDemo src="v-scope" />

### Nested scopes

A nested scope sees its parents' state. Its own keys shadow the parent's, and
writing to an inherited key updates the parent:

```html
<div v-scope="{ msg: 'parent' }">
  <div v-scope="{ own: 1 }">
    {{ msg }}
    <button @click="msg = 'set from child'">updates the parent</button>
  </div>
</div>
```

### Methods and getters

```html
<div v-scope="{
  items: [],
  get total() { return this.items.length },
  add(text) { this.items.push(text) }
}">
  <button @click="add('new')">Add</button> {{ total }}
</div>
```

### Mounting on demand

A page with many widgets pays for every scope at load. Defer the ones below the
fold or behind a click, and hide their raw `{{ }}` with
[`v-cloak`](/directives/v-cloak) until they mount:

```html
<section v-scope.visible="Comments({ postId: 7 })" v-cloak>…</section>
<nav v-scope.interaction="{ open: false }">…</nav>
<aside v-scope.idle="Recommendations()" v-cloak>…</aside>
```

## Behavior

- With `createApp().mount()` or the `init` script attribute, every top-level `v-scope` becomes a root region.
- A `'#id'` template is appended to the element's existing children; an HTML string replaces them.
- If the expression throws, the region falls back to an empty scope and the rest of the page still mounts — see [Error handling](/essentials/error-handling).
- On the same element as `v-for`, each row gets its own scope — see [v-for](/directives/v-for#per-row-state).
- Name a scope for the devtools with [`v-name`](/directives/v-name).
- A deferred region mounts inside its parent scope, so it sees parent state exactly as an ordinary nested scope would.
- With `.interaction`, the click that wakes a region reaches its `@click` handlers. The key press that wakes it does not reach `@keydown` handlers inside, though `v-model` still receives the typed text.
- Where `IntersectionObserver` is unavailable — in jsdom, for example — `.visible` mounts like `.idle` instead.
- A region unmounted before its trigger fires never mounts, and its observer or listeners are released.

## Related

[State](/essentials/state) · [Components](/essentials/components) · [v-name](/directives/v-name) · [createApp()](/globals/create-app)
