---
title: $store
---

# $store <Badge type="section" text="Magic" />

The global stores, from any expression.

```html
<span>{{ $store.cart.count }}</span>
```

## Signature

```ts
$store: Record<string, object>
```

Stores are registered with [`store()`](/globals/store).

## Examples

<<< ../.vitepress/demos/store.html{html}

<LiveDemo src="store" />

## Behavior

- Shared by every app on the page, and fully reactive, getters included.
- A store registered after mount still appears in expressions that reference it.
- In development, a typo such as `$store.crat` warns instead of silently reading `undefined`.

## Related

[store()](/globals/store) · [persist](/plugins/persist#persisting-a-store)
