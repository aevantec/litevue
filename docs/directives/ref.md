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
- One name holds one element. Two elements claiming the same name in one scope leave `$refs` pointing at the last one mounted, and the devtools [warn](/devtools/warnings#two-elements-claiming-the-same-ref).
- Inside [`v-for`](/directives/v-for), each row has its own `$refs`: `$refs.row` in a row's handler is that row's element. The parent scope does not see row refs, and unlike Vue they are not collected into an array.
- The ref is removed when the element unmounts, or renamed when a `:ref` expression changes.

## Related

[$refs](/magics/refs) · [$el](/magics/el) · [v-bind](/directives/v-bind)
