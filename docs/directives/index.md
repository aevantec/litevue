---
title: Directives
---

# Directives <Badge type="section" text="Directive" />

Attributes that give markup behavior. They follow Vue's syntax; the ones marked
**LiteVue** are additions.

```html
<div v-scope="{ open: false }">
  <button @click="open = !open" :aria-expanded="open">Menu</button>
  <ul v-show="open">…</ul>
</div>
```

## Shorthands

| Full form | Shorthand |
| --- | --- |
| `v-bind:class="…"` | `:class="…"` |
| `v-on:click="…"` | `@click="…"` |

Both spellings are identical, and modifiers attach to either:
`v-on:click.prevent` and `@click.prevent` do the same thing.

## By task

### State

| Directive | Purpose |
| --- | --- |
| [v-scope](/directives/v-scope) | Declare a region and its state |
| [ref](/directives/ref) | Register an element on `$refs` |

### Rendering

| Directive | Purpose |
| --- | --- |
| [v-if](/directives/v-if) · `v-else-if` · `v-else` | Render only while a condition holds |
| [v-show](/directives/v-show) | Toggle visibility, keeping the element mounted |
| [v-for](/directives/v-for) | Repeat per item, with keyed reordering |
| [v-text](/directives/v-text) | Set text content |
| [v-html](/directives/v-html) | Set inner HTML |
| [v-teleport](/directives/v-teleport) | Render under a different parent — **LiteVue** |

### Binding and events

| Directive | Purpose |
| --- | --- |
| [v-bind](/directives/v-bind) · `:` | Bind attributes, properties, class and style |
| [v-on](/directives/v-on) · `@` | Listen to events — with `.outside`, `.window`, `.debounce` and more |
| [v-model](/directives/v-model) | Two-way form binding — with `.debounce` and `.fill` |
| [v-effect](/directives/v-effect) | Re-run a statement when its state changes |

### Compilation

| Directive | Purpose |
| --- | --- |
| [v-cloak](/directives/v-cloak) | Hide markup until mounted |
| [v-once](/directives/v-once) | Render once, never update |
| [v-pre](/directives/v-pre) | Skip compilation |
| [v-name](/directives/v-name) | Name a scope for the devtools — **LiteVue** |

## Processing order

When several directives share an element they run in this order, which matters
for what each one can see:

1. `v-pre` — nothing else runs
2. `v-if`
3. `v-for`
4. `v-scope`, then `ref`
5. The element's children
6. Bindings and other directives, in attribute order
7. `v-model`, so it sees any `:value` binding
8. `v-on` listeners

So `v-if` beside `v-for` cannot read the loop variable, while `v-scope` beside
`v-for` creates state per row.

## From plugins

[Plugins](/plugins/) add `v-transition`, `v-intersect`, `v-persist`, `v-focus`,
`v-trap`, `v-collapse`, `v-mask` and `v-resize`. Register your own with
[`app.directive()`](/globals/create-app#custom-directives).
