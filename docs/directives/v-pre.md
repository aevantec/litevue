---
title: v-pre
---

# v-pre <Badge type="section" text="Directive" />

Leave an element and everything inside it uncompiled.

```html
<code v-pre>Write {{ name }} to interpolate.</code>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-pre` | Skip this element and its children entirely |

No value, argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-pre.html{html}

<LiveDemo src="v-pre" />

## Behavior

- `{{ }}` and directive attributes inside stay exactly as written.
- Use it for code samples, and for embedded widgets whose markup another library manages.
- The Alpine equivalent is `x-ignore`.

## Related

[v-once](/directives/v-once) · [Templating](/essentials/templating)
