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

From a method, call it through `this` and pass a getter:

```js
this.$watch(
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
const stop = this.$watch('query', this.search);
// later
stop();
```

### Watching a list or object

A dot-path or getter compares with `Object.is`, so mutating an array or object
in place does not count as a change. Watch what actually changes:

```js
$watch('items', cb);                   // not called on items.push(x)
$watch(() => items.length, cb);        // called on push and splice
$watch('user', cb);                    // not called when user.name changes
$watch('user.name', cb);               // called
```

## Behavior

- Register it once — from `@mounted`, `v-effect`, or a method called from one of them as `this.$watch()`. From JavaScript outside a scope, use `app.scope.$watch()`. Calling it inside a template expression that re-renders registers a new watcher every time.
- Watchers stop when their scope unmounts, or earlier when the returned function is called. Calling it twice is harmless. A watcher started from `@mounted` or an event handler also stops when that element is removed: a `v-if` branch closing, a `v-for` row going, or morph removing it. A watcher on the root scope, from `app.scope.$watch()` or a mounted root without `v-scope`, belongs to the app and stops on a full `app.unmount()`.
- Reactive reads inside the callback are not tracked, so the callback only runs when `source` changes. Values are compared with `Object.is`, as in Vue, so a value that stays `NaN` does not call it.
- A callback may write the value it watches, for example to clamp or trim it. That write does not call the callback again; the next change is compared with the written value, which the callback then receives as `oldValue`.
- A callback that throws is reported to [`app.onError()`](/essentials/error-handling#app-onerror). Other updates keep running, and the next change still receives the correct `oldValue`. With `immediate`, a throw on that first call comes out of the `$watch()` call itself; from `@mounted` it is reported as a handler error. The watcher stays active.

## Related

[v-effect](/directives/v-effect) · [watchEffect()](/globals/watch-effect) · [computed()](/globals/computed)
