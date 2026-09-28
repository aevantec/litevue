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
| `mount(target?)` | `App` | Mount every top-level `v-scope` under a selector or element, or the whole document. Call again to mount [new content](/essentials/dynamic-content) |
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
| `get(exp?)` | Evaluate the directive's expression, or another one, in its scope |
| `effect(fn)` | Run `fn` reactively; stopped automatically on unmount |
| `exp` | The raw expression text |
| `arg` | The argument: `foo` in `v-name:foo` |
| `modifiers` | An object of modifiers: `{ once: true }` for `.once` |
| `ctx` | The internal context, including `ctx.scope` |

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

## Behavior

- Several apps can share one page; each `mount()` target should be distinct.
- Mount each element once. A second `mount()` on the same element does not re-activate it, and warns in development; to re-activate a region, insert fresh markup and mount that.
- Mounting on the whole document with no `v-scope` walks every element; mark regions with `v-scope` instead.
- Also exported: [`reactive()`](/globals/reactive), [`nextTick()`](/globals/next-tick), and the TypeScript types `App`, `Plugin<Options>`, `ComponentFactory`, `ErrorHandler`, `ErrorInfo` and `ErrorPhase`.

## Related

[State](/essentials/state) · [Plugins](/plugins/) · [Dynamic content](/essentials/dynamic-content) · [Error handling](/essentials/error-handling)
