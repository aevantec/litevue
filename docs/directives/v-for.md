---
title: v-for
---

# v-for <Badge type="section" text="Directive" />

Render an element once per item in a list, object or range.

```html
<li v-for="todo in todos" :key="todo.id">{{ todo.text }}</li>
```

## Syntax

| Form | Iterates |
| --- | --- |
| `item in items` | Array items |
| `(item, index) in items` | Array items with their index |
| `(value, key) in object` | Object values with their key |
| `(value, key, index) in object` | Object values with key and position |
| `n in 10` | The numbers 1 to 10 |
| `{ id, name } in items` | Array items, destructured |
| `[first, second] in pairs` | Array items, array-destructured |

`of` works in place of `in`.

### Keys

| Attribute | Meaning |
| --- | --- |
| `:key="expression"` | A unique, stable identity per item. Recommended whenever the list can reorder |

## Examples

<<< ../.vitepress/demos/v-for.html{html}

<LiveDemo src="v-for" />

### Per-row state

`v-scope` on the same element gives every row its own state, with the loop
variable in scope:

```html
<li v-for="item in items" :key="item.id" v-scope="{ open: false }">
  <button @click="open = !open">{{ item.title }}</button>
  <p v-show="open">{{ item.body }}</p>
</li>
```

### Repeating a group

Use a `<template>` to repeat several elements without a wrapper:

```html
<template v-for="entry in glossary" :key="entry.term">
  <dt>{{ entry.term }}</dt>
  <dd>{{ entry.definition }}</dd>
</template>
```

### Animating removal

An item with [`v-transition`](/plugins/transition) and no expression animates
out before it is removed — see [transition](/plugins/transition#with-v-if-and-v-for).

## Behavior

- With `:key`, a reorder moves the existing DOM nodes, so focus, input values and scroll position stay with their item. Without it, nodes are reused by position. The [devtools](/devtools/warnings) warn when an unkeyed list reorders or keys repeat.
- Array mutations (`push`, `splice`, `sort`, `reverse`, …) and replacing the array are both reactive.
- `Map` and `Set` cannot be used in reactive state — see [reactive()](/globals/reactive#behavior). Keep lists as arrays, and keyed data as plain objects.
- `v-if` on the same element runs first and cannot see the loop variable — see [v-if](/directives/v-if#behavior).
- A `ref` inside the loop points at the last row rendered, not an array — see [ref](/directives/ref).

## Related

[v-if](/directives/v-if) · [v-scope](/directives/v-scope) · [transition](/plugins/transition) · [Warnings](/devtools/warnings)
