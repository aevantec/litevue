---
title: createApp()
---

# createApp() <Badge type="section" text="Global" />

Creates an app instance.

```js
import { createApp } from '@aevantec/litevue';

const app = createApp({ count: 0 }); // object or setup function
app.mount(); // whole document, or app.mount('#region') / app.mount(el)
```

## The app instance

| Member                  | Description                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mount(target?)`        | Mounts `v-scope` regions under the target (selector, element, or the whole document). Repeatable — later calls initialize [dynamic content](/essentials/dynamic-content) into the same app. |
| `unmount(target?)`      | Tears down mounted regions: effects, listeners, devtools registrations. With no argument every batch goes; given a selector or element, only the roots at or inside it — see [Dynamic content](/essentials/dynamic-content#tearing-a-region-down). |
| `use(plugin, options?)` | Installs a [plugin](/plugins/). Chainable; installing the same plugin twice is a no-op.                                                                                                     |
| `directive(name, fn?)`  | Registers or retrieves a custom directive.                                                                                                                                                  |
| `scope`                 | The reactive root scope — plugins attach `$`-prefixed helpers here.                                                                                                                         |

## Custom directives

```js
app.directive('uppercase', ({ el, get, effect }) => {
  effect(() => {
    el.textContent = String(get()).toUpperCase();
  });
});
```

The directive context provides `el`, `get(exp?)`, `effect` (auto-stopped on teardown), `exp`, `arg`, `modifiers`, and `ctx`.

### Returning a cleanup

Anything you register **outside** `effect` — a listener, an observer, a timer,
a subscription — has to be undone in a function you return:

```js
app.directive('resize', ({ el, get }) => {
  const observer = new ResizeObserver(() => get());
  observer.observe(el);

  return () => observer.disconnect();
});
```

::: warning This is not optional
It is tempting to skip cleanup for listeners bound to the element itself, on
the grounds that they die when the element does. That reasoning does not hold:
[`unmount(el)`](/essentials/dynamic-content#tearing-a-region-down) tears down a
region whose elements **stay in the document**. A listener left behind keeps
firing, driving markup that is meant to be inert.
:::

`effect()` needs no cleanup — effects created through it are stopped for you.

## Other exports

`reactive` and `nextTick` are re-exported for building shared state and timing work after flushes. TypeScript users also get the `App` and `Plugin<Options>` types.
