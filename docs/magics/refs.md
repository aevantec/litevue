---
title: $refs
---

# $refs <Badge type="section" text="Magic" />

Elements registered with [`ref`](/directives/ref), keyed by name.

```html
<input ref="email" />
<button @click="$refs.email.focus()">Edit email</button>
```

## Signature

```ts
$refs: Record<string, Element>
```

## Examples

<<< ../.vitepress/demos/refs.html{html}

<LiveDemo src="refs" />

## Behavior

- Each `v-scope` has its own `$refs`, which falls back to its parent's for names it does not define.
- A ref is only available once its element has mounted. Read it in handlers, `@mounted` or [`$nextTick`](/magics/next-tick), not during the first render.
- One name holds one element. Inside `v-for`, each row has its own `$refs`, so a row reads its own element and the parent reads none — see [ref](/directives/ref#behavior).

## Related

[ref](/directives/ref) · [$el](/magics/el)
