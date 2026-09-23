---
title: v-cloak
---

# v-cloak <Badge type="section" text="Directive" />

Hide uncompiled markup until LiteVue has mounted it.

```html
<div v-scope="{ msg: 'ready' }" v-cloak>{{ msg }}</div>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-cloak` | Removed from the element as soon as LiteVue processes it |

No value, argument or modifiers. It does nothing on its own — pair it with a
CSS rule.

## Examples

Add this rule to a stylesheet that loads before the page renders:

```css
[v-cloak] {
  display: none;
}
```

Then mark any region whose raw `{{ }}` should not be visible:

```html
<div v-scope="{ msg: 'ready' }" v-cloak>{{ msg }}</div>
```

## Behavior

- Without it, a slow connection can briefly show the raw `{{ msg }}` text before the script runs.
- Put the CSS in the `<head>`, not in a file that loads after the markup, or it will not apply in time.
- [`v-text`](/directives/v-text) avoids the flash for a single value without any CSS.

## Related

[v-text](/directives/v-text) · [Templating](/essentials/templating#hiding-uncompiled-templates)
