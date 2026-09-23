---
title: $data
---

# $data <Badge type="section" text="Magic" />

The current scope object.

```html
<pre>{{ JSON.stringify($data, null, 2) }}</pre>
```

## Signature

```ts
$data: Record<string, any>
```

## Examples

<<< ../.vitepress/demos/data.html{html}

<LiveDemo src="data" />

## Behavior

- Serializing it includes only the scope's own state — not inherited parent state and not the `$` helpers.
- It is the live reactive object; writing to it updates the page.
- Useful for debugging, and for sending a form's state with `fetch`.

## Related

[$root](/magics/root) · [State](/essentials/state)
