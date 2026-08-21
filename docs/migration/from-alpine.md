---
title: Coming from Alpine
---

# Coming from Alpine <Badge type="section" text="Migration" />

LiteVue covers Alpine's feature set with Vue's syntax, at about half the size. This page maps the concepts.

## Directive cheatsheet

| Alpine                     | LiteVue                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `x-data="{ open: false }"` | [`v-scope="{ open: false }"`](/directives/v-scope)                                            |
| `x-init="fetch()"`         | [`@mounted="fetch()"`](/essentials/lifecycle)                                                 |
| `x-show="open"`            | [`v-show="open"`](/directives/v-show)                                                         |
| `x-if` (on `<template>`)   | [`v-if`](/directives/v-if) / `v-else-if` / `v-else` (on any element)                          |
| `x-for` (on `<template>`)  | [`v-for`](/directives/v-for) with keyed reconciliation                                        |
| `x-bind:class` / `:class`  | [`v-bind:class`](/directives/v-bind) / `:class` (Vue object/array syntax)                    |
| `x-on:click` / `@click`    | [`v-on:click`](/directives/v-on) / `@click`                                                   |
| `x-model`                  | [`v-model`](/directives/v-model) (+ `.lazy` `.number` `.trim` `.debounce` `.fill`)            |
| `x-text` / `x-html`        | [`v-text`](/directives/v-text) / [`v-html`](/directives/v-html) — plus mustache interpolation |
| `x-ref="el"` / `$refs.el`  | [`ref="el"`](/directives/ref) / [`$refs.el`](/magics/refs)                                    |
| `x-cloak`                  | [`v-cloak`](/directives/v-cloak)                                                              |
| `x-ignore`                 | [`v-pre`](/directives/v-pre)                                                                  |
| `x-effect`                 | [`v-effect`](/directives/v-effect)                                                            |
| `x-transition`             | [`v-transition`](/plugins/transition) (works with `v-if` too)                                 |
| `x-teleport`               | [`v-teleport`](/directives/v-teleport)                                                        |
| `x-id`                     | [`$id()`](/magics/id)                                                                         |

## Event modifiers

`.outside`, `.window`, `.document`, `.debounce`, `.throttle`, `.once`, `.self`, `.prevent`, `.stop`, `.passive`, `.capture` and key filters all exist with the same names:

```html
<div v-show="open" @click.outside="open = false">…</div>
<div @scroll.window.throttle-100="onScroll"></div>
```

LiteVue adds [animation-event filters](/directives/v-on#animation-event-filters) Alpine doesn't have: `@transitionend.prop-opacity`, `@animationend.name-bounce`.

## Globals and magics

| Alpine                                                               | LiteVue                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Alpine.store('cart', {...})` / `$store.cart`                        | [`store('cart', {...})`](/globals/store) / [`$store.cart`](/magics/store) |
| `Alpine.data('dropdown', ...)`                                       | plain functions as [components](/essentials/components)                   |
| `Alpine.initTree(el)`                                                | [`app.mount(el)`](/essentials/dynamic-content)                            |
| `$el` `$refs` `$watch` `$dispatch` `$nextTick` `$data` `$root` `$id` | same names — see [Magics](/magics/el)                                     |

## Plugins

| Alpine plugin              | LiteVue                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| Intersect                  | [`intersect`](/plugins/intersect)                                         |
| Persist (`$persist`)       | [`persist`](/plugins/persist) — element-scope granularity                 |
| Focus (`x-trap`, `$focus`) | [`focus`](/plugins/focus) (`v-focus`, `v-trap`)                           |
| Collapse                   | [`collapse`](/plugins/collapse)                                           |
| Mask                       | [`mask`](/plugins/mask)                                                   |
| Morph (`Alpine.morph`)     | [`morph`](/plugins/morph) — `morph(el, html)` or `$morph` in templates    |
| Anchor / Sort              | not shipped — they'd pull in Floating UI / SortableJS; use those directly |

## What's different by design

- **Vue semantics**: expressions evaluate against a prototype chain of scopes; writes to inherited state fall through to the owning parent.
- **Keyed `v-for`**: real list reconciliation — reorders move DOM nodes instead of rewriting them.
- **Dynamic content is inert** until you call `app.mount(el)` — Alpine auto-initializes added DOM; LiteVue treats that as an [injection hazard](/essentials/dynamic-content). For _updating_ a region the server re-rendered, reach for [`morph`](/plugins/morph) rather than replacing and re-mounting.
- **Devtools ship in the box** — an [in-page panel](/devtools/panel) rather than a store extension (an [extension variant](/devtools/extension) exists too).
- If you outgrow LiteVue, the same templates are a short hop from real Vue.
