---
title: $watch
---

# $watch <Badge type="section" text="Magic" />

Run a callback when one value changes, with the new and previous value.

```html
<div v-scope="{ query: '' }" v-effect="$watch('query', (q) => search(q))">
  <input v-model="query" />
</div>
```

## Signature

```ts
$watch(source: string | (() => any), callback: (value, oldValue) => void): void
```

| Parameter | Meaning |
| --- | --- |
| `source` | A dot-path into the scope, such as `'user.name'`, or a getter function |
| `callback` | Called after the value changes, with `(value, oldValue)` |

Returns nothing. There are no options — the callback never runs for the
initial value, and watching is shallow.

## Examples

<<< ../.vitepress/demos/watch.html{html}

<LiveDemo src="watch" />

### Getter form

From a setup function or method, pass a getter:

```js
$watch(
  () => this.user.name,
  (name) => sync(name)
);
```

### Watching a list or object

A path compares by identity, so mutating an array or object in place does not
count as a change. Watch what actually changes:

```js
$watch('items', cb);                   // not called on items.push(x)
$watch(() => items.length, cb);        // called on push and splice
$watch('user', cb);                    // not called when user.name changes
$watch('user.name', cb);               // called
```

## Behavior

- Register it once — from `@mounted`, `v-effect` or a setup function. Calling it inside a template expression that re-renders registers a new watcher every time.
- Watchers stop when their scope unmounts. There is no manual stop; use [`watchEffect()`](/globals/watch-effect) when you need one.
- Reactive reads inside the callback are not tracked, so the callback only runs when `source` changes.
- A callback that throws is reported to [`app.onError()`](/essentials/error-handling#app-onerror). Other updates keep running, and the next change still receives the correct `oldValue`.

## Related

[v-effect](/directives/v-effect) · [watchEffect()](/globals/watch-effect) · [computed()](/globals/computed)
