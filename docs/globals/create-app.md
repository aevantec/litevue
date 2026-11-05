---
title: createApp()
---

# createApp() <Badge type="section" text="Global" />

Create an app, give it root state, and mount it onto the page.

```js
import { createApp } from '@aevantec/litevue';

createApp({ count: 0 }).mount();
```

## Signature

```ts
createApp(data?: object | (() => object)): App
```

| Parameter | Meaning |
| --- | --- |
| `data` | The root scope: an object, or a setup function that returns one. Made reactive |

### Options in `data`

| Key | Meaning |
| --- | --- |
| `$delimiters` | Replace `{{ }}`, e.g. `['${', '}']` — see [custom delimiters](/essentials/templating#custom-delimiters) |

### The app instance

| Member | Returns | Meaning |
| --- | --- | --- |
| `mount(target?)` | `App` | Mount a selector, an element or the whole document; see [what `mount()` binds](#what-mount-binds). Call again to mount [new content](/essentials/dynamic-content). A selector that matches no element returns `undefined` and mounts nothing |
| `unmount(target?)` | — | Tear down everything, or only the regions at or inside `target` — see [Tearing a region down](/essentials/dynamic-content#tearing-a-region-down) |
| `use(plugin, options?)` | `App` | Install a [plugin](/plugins/). Installing the same plugin twice does nothing |
| `directive(name, def?)` | `App` / definition | Register a [custom directive](#custom-directives), or read one back |
| `component(name, factory?)` | `App` / factory | Register a [component](/essentials/components#registering-by-name), or read one back |
| `onError(handler)` | unregister function | Receive every runtime error LiteVue catches — see [Error handling](/essentials/error-handling#app-onerror) |
| `scope` | `object` | The reactive root scope. Plugins add `$` helpers here |

## Examples

### Setup function

```js
createApp(() => {
  const state = reactive({ price: 10, qty: 2 });
  state.total = computed(() => state.price * state.qty);
  return state;
}).mount('#checkout');
```

### Without a script

For pages with no JavaScript of their own, the `init` attribute mounts an app on
load:

```html
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>
```

### Custom directives

A directive is a function that receives the element and a way to read its
expression:

```js
app.directive('uppercase', ({ el, get, effect }) => {
  effect(() => {
    el.textContent = String(get()).toUpperCase();
  });
});
```

```html
<span v-uppercase="name"></span>
```

| Context field | Meaning |
| --- | --- |
| `el` | The element |
| `get(exp?)` | Evaluate the directive's expression, or another one, in its scope. A function compiled from your own `exp`, such as a handler or setter, comes back wrapped, so a throw or rejection when you call it later is reported to [`app.onError()`](/essentials/error-handling#app-onerror) |
| `effect(fn)` | Run `fn` reactively; stopped automatically on unmount |
| `exp` | The raw expression text |
| `arg` | The argument: `foo` in `v-tooltip:foo` |
| `modifiers` | An object of modifiers: `{ once: true }` for `.once` |
| `ctx` | The internal context, including `ctx.scope` |

A custom directive cannot replace a built-in one. LiteVue always uses its own
`v-bind`, `v-on`, `v-show`, `v-text`, `v-html`, `v-model` and `v-effect`, and it
reads `v-scope`, `v-if`, `v-for`, `v-once`, `v-pre`, `v-cloak`, `v-teleport`
and `v-name` before it looks up a registered directive.
A directive registered under one of those names is stored but never runs, and
the development build warns.

### Returning a cleanup

Anything a directive sets up outside `effect` — a listener, an observer, a
timer — must be undone in a function it returns:

```js
app.directive('resize', ({ el, get }) => {
  const observer = new ResizeObserver(() => get());
  observer.observe(el);
  return () => observer.disconnect();
});
```

::: warning The cleanup is not optional
[`unmount(el)`](/essentials/dynamic-content#tearing-a-region-down) tears down a
region whose elements stay in the document. A listener left behind keeps firing
into state that is meant to be inert — even one bound to the element itself.
:::

### What `mount()` binds

`mount()` binds regions, not the whole target. It picks them in this order:

1. A target that has `v-scope` itself is the only region.
2. Otherwise, every `v-scope` inside the target that is not nested in another
   one is a region, including deferred ones such as `v-scope.visible`.
3. Only when the target contains no `v-scope` at all is the target itself
   mounted, on the app's root scope.

Markup inside the target but outside those regions is **not bound**. Here the
first `{{ count }}` stays as raw text, because `#app` contains a `v-scope` and
so is not itself a region:

```html
<div id="app">
  <p>{{ count }}</p>
  <div v-scope="{ n: 1 }">{{ n }} of {{ count }}</div>
</div>
```

```js
createApp({ count: 5 }).mount('#app');
```

To bind the whole of `#app`, put `v-scope` on `#app` itself. The region inside
still sees `count`, because every region inherits the root scope.

## Behavior

- Several apps can share one page; each `mount()` target should be distinct.
- Mount each piece of markup once. Mounting an element again without replacing its contents binds nothing, and warns in development. To re-activate a region, unmount it, insert fresh markup, and mount again.
- Mounting on the whole document with no `v-scope` walks every element; mark regions with `v-scope` instead.
- Every other export, including the TypeScript types, is listed under [Globals](/globals/).

## Related

[State](/essentials/state) · [Plugins](/plugins/) · [Dynamic content](/essentials/dynamic-content) · [Error handling](/essentials/error-handling)
