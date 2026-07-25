# Coming from Alpine

litevue covers Alpine's feature set with Vue's syntax, at about half the size. This page maps the concepts.

## Directive cheatsheet

| Alpine | litevue |
| --- | --- |
| `x-data="{ open: false }"` | `v-scope="{ open: false }"` |
| `x-init="fetch()"` | `@mounted="fetch()"` |
| `x-show="open"` | `v-show="open"` |
| `x-if` (on `<template>`) | `v-if` / `v-else-if` / `v-else` (on any element) |
| `x-for` (on `<template>`) | `v-for="item in items" :key="item.id"` — keyed reconciliation |
| `x-bind:class` / `:class` | `:class` (Vue object/array syntax) |
| `x-on:click` / `@click` | `@click` |
| `x-model` | `v-model` (+ `.lazy` `.number` `.trim` `.debounce` `.fill`) |
| `x-text` / `x-html` | `v-text` / `v-html` — plus `{{ interpolation }}` |
| `x-ref="el"` / `$refs.el` | `ref="el"` / `$refs.el` |
| `x-cloak` | `v-cloak` |
| `x-ignore` | `v-pre` |
| `x-effect` | `v-effect` |
| `x-transition` | [`v-transition`](./plugins#transition) (Vue-style classes; works with `v-if` too) |
| `x-teleport` | [`v-teleport`](./directives#v-teleport) |
| `x-id` | [`$id()`](./store-and-magics#magic-properties) |

## Event modifiers

`.outside`, `.window`, `.document`, `.debounce`, `.throttle`, `.once`, `.self`, `.prevent`, `.stop`, `.passive`, `.capture` and key filters all exist with the same names:

```html
<div v-show="open" @click.outside="open = false">…</div>
<div @scroll.window.throttle-100="onScroll"></div>
```

litevue adds animation-event filters Alpine doesn't have: `@transitionend.prop-opacity`, `@animationend.name-bounce`.

## Globals and magics

| Alpine | litevue |
| --- | --- |
| `Alpine.store('cart', {...})` / `$store.cart` | `store('cart', {...})` / `$store.cart` |
| `Alpine.data('dropdown', ...)` | plain functions as [components](./getting-started#components) |
| `Alpine.initTree(el)` | `app.mount(el)` — [dynamic content](./getting-started#initializing-dynamic-content) |
| `$el` `$refs` `$watch` `$dispatch` `$nextTick` `$data` `$root` `$id` | same names |

## Plugins

| Alpine plugin | litevue |
| --- | --- |
| Intersect | `intersect` (`v-intersect`) |
| Persist (`$persist`) | `persist` (`v-persist` — element-scope granularity) |
| Focus (`x-trap`, `$focus`) | `focus` (`v-focus`, `v-trap`) |
| Collapse | `collapse` (`v-collapse`) |
| Mask | `mask` (`v-mask`) |
| Anchor / Morph / Sort | not shipped — they'd pull in Floating UI / SortableJS; use those directly |

## What's different by design

- **Vue semantics**: expressions evaluate against a prototype chain of scopes; writes to inherited state fall through to the owning parent (Alpine proxies behave similarly, but litevue is literal `@vue/reactivity`).
- **Keyed `v-for`**: real list reconciliation — reorders move DOM nodes instead of rewriting them.
- **Dynamic content is inert** until you call `app.mount(el)` — Alpine auto-initializes added DOM; litevue treats that as an [injection hazard](./getting-started#initializing-dynamic-content).
- **Devtools ship in the box** — an [in-page panel](./devtools) rather than a store extension (an extension variant exists too).
- If you outgrow litevue, the same templates are a short hop from real Vue.
