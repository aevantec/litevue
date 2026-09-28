---
title: $id
---

# $id <Badge type="section" text="Magic" />

Generate an id that is stable within a scope and unique across the page.

```html
<label :for="$id('email')">Email</label>
<input :id="$id('email')" />
```

## Signature

```ts
$id(name?: string): string
```

| Parameter | Meaning |
| --- | --- |
| `name` | A prefix for the id. Defaults to `'id'` |

Returns `name-<n>`, for example `email-3`.

## Examples

<<< ../.vitepress/demos/id.html{html}

<LiveDemo src="id" />

## Behavior

- The same name returns the same id within one scope, so a label and its input match.
- Every scope, including each `v-for` row, gets its own ids, so repeated markup never collides.
- Ids are not stable across page loads; do not store them.
- The Alpine equivalent is `x-id` with `$id`.

## Related

[v-bind](/directives/v-bind) · [v-for](/directives/v-for)
