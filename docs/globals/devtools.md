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
<script src="https://unpkg.com/litevue" defer init></script>
```

```js
// bundler users: call it once before mounting
import { createApp, disableDevtools } from 'litevue';

if (import.meta.env.PROD) disableDevtools();
createApp().mount();
```

When disabled: no `window.__LITE_VUE__`, no scope registration. `disableDevtools()` also clears anything already registered, so calling it late is safe.
