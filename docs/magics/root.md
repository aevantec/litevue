---
title: $root
---

# $root <Badge type="section" text="Magic" />

The app's root scope, reachable from any nested scope.

```html
<button @click="$root.theme = 'dark'">Dark mode</button>
```

## Signature

```ts
$root: Record<string, any>
```

## Examples

<<< ../.vitepress/demos/root.html{html}

<LiveDemo src="root" />

## Behavior

- Reading a name that no nested scope defines already falls through to the root, so `$root` is only needed when a nested scope shadows that name.
- Writing through `$root` always lands on the root scope, even when a nested scope has a key of the same name.
- For state shared between separate apps, use a [store](/globals/store).

## Related

[$data](/magics/data) · [State](/essentials/state) · [$store](/magics/store)
