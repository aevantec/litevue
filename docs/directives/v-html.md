---
title: v-html
---

# v-html <Badge type="section" text="Directive" />

Set an element's inner HTML from an expression.

```html
<article v-html="post.bodyHtml"></article>
```

::: danger Only for trusted HTML
`v-html` renders raw markup. Passing it anything a user can influence is a
cross-site scripting risk. See [Security](/start-here/security#v-html).
:::

## Syntax

| Form | Meaning |
| --- | --- |
| `v-html="expression"` | Replace the element's content with the value, parsed as HTML |

No argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-html.html{html}

<LiveDemo src="v-html" />

## Behavior

- Directives and `{{ }}` inside the inserted HTML are not compiled. To make new markup interactive, see [Dynamic content](/essentials/dynamic-content).
- Every update replaces the whole content, so focus, selection and any state inside it are lost.

## Related

[v-text](/directives/v-text) · [Security](/start-here/security) · [Dynamic content](/essentials/dynamic-content)
