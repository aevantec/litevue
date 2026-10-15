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
$watch(
  source: string | (() => any),
  callback: (value, oldValue) => void,
  options?: { immediate?: boolean }
): () => void
```

| Parameter | Meaning |
| --- | --- |
| `source` | A dot-path into the scope, such as `'user.name'`, or a getter function |
| `callback` | Called after the value changes, with `(value, oldValue)` |
| `options.immediate` | Also call back once with the initial value; `oldValue` is `undefined` |

Returns a function that stops the watcher. Watching is shallow, and there is no
`deep` option — see [Watching a list or object](#watching-a-list-or-object).

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

### Starting with the current value

`immediate` runs the callback once on registration, so the same code handles the
initial value and every later change:

```html
<div v-scope="{ tab: 'home' }" @mounted="$watch('tab', load, { immediate: true })">
```

### Stopping early

Keep the returned function and call it when the watcher is no longer needed:

```js
const stop = $watch('query', search);
// later
stop();
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
- Watchers stop when their scope unmounts, or earlier when the returned function is called. Calling it twice is harmless.
- Reactive reads inside the callback are not tracked, so the callback only runs when `source` changes.
- A callback that throws is reported to [`app.onError()`](/essentials/error-handling#app-onerror). Other updates keep running, and the next change still receives the correct `oldValue`.

## Related

[v-effect](/directives/v-effect) · [watchEffect()](/globals/watch-effect) · [computed()](/globals/computed)
