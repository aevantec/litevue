---
title: $el
---

# $el <Badge type="section" text="Magic" />

The element the current directive sits on.

```html
<button @click="$el.textContent = 'Saved'">Save</button>
```

## Signature

```ts
$el: Element
```

## Examples

<<< ../.vitepress/demos/el.html{html}

<LiveDemo src="el" />

## Behavior

- Each directive sees its own element, so `$el` differs between two directives on different elements in the same scope.
- Inside `{{ }}`, `$el` is the text node being filled, not the surrounding element.
- To reach a different element, use [`$refs`](/magics/refs).

## Related

[$refs](/magics/refs) · [ref](/directives/ref) · [v-effect](/directives/v-effect)
