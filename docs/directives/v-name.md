---
title: v-name
---

# v-name <Badge type="section" text="Directive" />

Label a scope for the devtools without giving the element an `id`.

```html
<div v-scope="{ items: [] }" v-name="cart">…</div>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-name="label"` | A literal name for the scope, shown in the devtools |

The value is literal text, not an expression. No argument or modifiers.

## Examples

<<< ../.vitepress/demos/v-name.html{html}

<LiveDemo src="v-name" />

### From the console

```js
__LITE_VUE__.getScopeByName('cart');
```

## Behavior

- Removed from the DOM at mount; it exists only for inspection and has no effect on rendering.
- The [panel](/devtools/panel) labels a scope by its `v-name`, then its component name, then its `id`, then its tag.
- If two scopes share a name, `getScopeByName` returns the first registered.
- LiteVue addition.

## Related

[v-scope](/directives/v-scope) · [devtools](/globals/devtools) · [Inspector panel](/devtools/panel)
