---
title: v-text
---

# v-text <Badge type="section" text="Directive" />

Set an element's text content from an expression.

```html
<span v-text="user.name"></span>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-text="expression"` | Replace the element's content with the value, as text |

No argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-text.html{html}

<LiveDemo src="v-text" />

## Behavior

- Equivalent to `{{ expression }}` filling the whole element.
- `null` and `undefined` render as empty; objects and arrays render as formatted JSON; everything else is converted with `String()`.
- The value is always text, never parsed as HTML. For markup, see [`v-html`](/directives/v-html).
- Useful where `{{ }}` would flash before mount, or would clash with a server template language — see [v-cloak](/directives/v-cloak) and [custom delimiters](/essentials/templating#custom-delimiters).

## Related

[v-html](/directives/v-html) · [Templating](/essentials/templating) · [v-cloak](/directives/v-cloak)
