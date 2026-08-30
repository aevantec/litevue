---
title: Devtools API
---

# Devtools API <Badge type="section" text="Global" />

Every mounted app registers into `window.__LITE_VUE__` (also exported as `devtools`). Scopes are live reactive objects — reading is always current, writing updates the page.

## Console usage

```js
// the scope governing the element selected in the elements panel
__LITE_VUE__.getScope($0);

// live-edit state — the page reacts immediately
__LITE_VUE__.getScope($0).count = 42;

__LITE_VUE__.scopes; // Map<Element, scope>
__LITE_VUE__.stores; // Map<name, store>
__LITE_VUE__.components; // Set<name> registered with app.component()
__LITE_VUE__.getScopeByName('cart'); // by v-name
```

## Events

```js
const off = __LITE_VUE__.on('scope:mount', (el, scope) => {});
__LITE_VUE__.on('scope:unmount', (el) => {});
__LITE_VUE__.on('store:register', (name, store) => {});
__LITE_VUE__.on('flush', () => {}); // reactive queue flushed
```

These events are the protocol behind the [inspector panel](/devtools/panel) and the [browser extension](/devtools/extension).

## Disabling in production

```html
<!-- script-tag users: set the flag before the library loads -->
<script>
  window.__LITE_VUE_DEVTOOLS__ = false;
</script>
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>
```

```js
// bundler users: call it once before mounting
import { createApp, disableDevtools } from '@aevantec/litevue';

if (import.meta.env.PROD) disableDevtools();
createApp().mount();
```

::: warning Check the flag your bundler actually defines
`import.meta.env.PROD` is Vite's. On webpack, Rollup, or Node it is `undefined`, so the condition is false, `disableDevtools()` never runs, and the registry ships to production — the opposite of what the code appears to say. Use `process.env.NODE_ENV === 'production'` there, and verify against a real production build rather than trusting the guard.
:::

When disabled: no `window.__LITE_VUE__`, no scope registration, and **no events** — including `flush`. `disableDevtools()` also clears anything already registered, so calling it late is safe, and a listener subscribed afterwards still receives nothing.
