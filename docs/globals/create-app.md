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
| `unmount()`             | Tears down every mounted batch: effects, listeners, devtools registrations.                                                                                                                 |
| `use(plugin, options?)` | Installs a [plugin](/plugins/). Chainable; installing the same plugin twice is a no-op.                                                                                                     |
| `directive(name, fn?)`  | Registers or retrieves a custom directive.                                                                                                                                                  |
| `scope`                 | The reactive root scope — plugins attach `$`-prefixed helpers here.                                                                                                                         |

## Custom directives

```js
app.directive('uppercase', ({ el, get, effect }) => {
  effect(() => {
    el.textContent = String(get()).toUpperCase();
  });
  return () => {
    /* optional cleanup on unmount */
  };
});
```

The directive context provides `el`, `get(exp?)`, `effect` (auto-stopped on unmount), `exp`, `arg`, `modifiers`, and `ctx`.

## Other exports

`reactive` and `nextTick` are re-exported for building shared state and timing work after flushes. TypeScript users also get the `App` and `Plugin<Options>` types.
