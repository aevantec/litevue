---
title: $dispatch
---

# $dispatch <Badge type="section" text="Magic" />

Fire a bubbling custom event from the current element.

```html
<button @click="$dispatch('added', { id: item.id })">Add</button>
```

## Signature

```ts
$dispatch(event: string, detail?: any): boolean
```

| Parameter | Meaning |
| --- | --- |
| `event` | The event name |
| `detail` | Any value; the listener reads it as `$event.detail` |

Returns the result of `dispatchEvent`.

## Examples

<<< ../.vitepress/demos/dispatch.html{html}

<LiveDemo src="dispatch" />

## Behavior

- The event bubbles, so any ancestor can listen with [`v-on`](/directives/v-on) — this is how a child scope notifies a parent.
- It is a standard `CustomEvent`, so code outside LiteVue can listen with `addEventListener`.
- Event names are case-sensitive, and HTML lowercases attribute names: listen with `@item-added`, and dispatch `'item-added'` rather than `'itemAdded'`.

## Related

[v-on](/directives/v-on) · [$store](/magics/store)
