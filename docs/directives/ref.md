---
title: ref
---

# ref <Badge type="section" text="Directive" />

Register an element on the scope's [`$refs`](/magics/refs), so code can reach it.

```html
<input ref="search" />
<button @click="$refs.search.focus()">Search</button>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `ref="name"` | Register the element as `$refs.name` |
| `:ref="expression"` | Register it under a computed name |

No modifiers. The static form takes a literal name, not an expression.

## Examples

<<< ../.vitepress/demos/ref.html{html}

<LiveDemo src="ref" />

## Behavior

- Refs are scoped. A nested `v-scope` has its own `$refs`, which falls back to its parent's.
- One name holds one element. Inside [`v-for`](/directives/v-for), every row claims the same name and `$refs` points at the last one mounted — unlike Vue, refs are never collected into an array. The devtools [warn](/devtools/warnings) when this happens.
- The ref is removed when the element unmounts, or renamed when a `:ref` expression changes.

## Related

[$refs](/magics/refs) · [$el](/magics/el) · [v-bind](/directives/v-bind)
