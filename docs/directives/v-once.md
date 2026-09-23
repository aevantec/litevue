---
title: v-once
---

# v-once <Badge type="section" text="Directive" />

Render an element once, then never update it.

```html
<p v-once>Signed in as {{ user.name }}</p>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-once` | Evaluate bindings on this element and its children once, at mount |

No value, argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-once.html{html}

<LiveDemo src="v-once" />

## Behavior

- Applies to the element and its whole subtree.
- Event listeners inside still work; only rendering is frozen.
- Use it for content that is static after the first render, to skip tracking it.

## Related

[v-pre](/directives/v-pre) · [Templating](/essentials/templating)
