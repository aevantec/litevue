# Devtools

Every mounted app exposes a devtools registry on `window.__LITE_VUE__` (also exported as `devtools`). Scopes are live reactive objects — reading them is always current, and writing to them updates the page.

## Console usage

```js
// inspect the scope governing the element selected in the elements panel
__LITE_VUE__.getScope($0);

// live-edit state — the page reacts immediately
__LITE_VUE__.getScope($0).count = 42;

// all mounted scope roots, and all global stores
__LITE_VUE__.scopes;
__LITE_VUE__.stores;

// look a scope up by its v-name
__LITE_VUE__.getScopeByName('cart');
```

Subscribe to registry events (the basis for inspection UIs):

```js
const off = __LITE_VUE__.on('scope:mount', (el, scope) => {});
__LITE_VUE__.on('scope:unmount', (el) => {});
__LITE_VUE__.on('store:register', (name, store) => {});
__LITE_VUE__.on('flush', () => {}); // reactive queue flushed
```

## Inspector panel

A standalone in-page inspector ships as a separate bundle (`dist/lite-vue-devtools.iife.js`, ~4kb gzipped) so it adds zero weight to the core. Load it after the library, during development only:

```html
<script src="https://unpkg.com/litevue" defer init></script>
<script src="https://unpkg.com/litevue/dist/lite-vue-devtools.iife.js" defer></script>
```

A `⚡ lite-vue` pill appears bottom-right and expands into a panel with:

- an **Elements / Stores** tab pair with live counts — scopes labeled as tags (`v-name` first, then element id, then tag name, e.g. `<cart>`)
- a name filter (case-insensitive, Escape clears)
- a state view separating own from inherited state; arrays and objects render as an **expandable tree**, every primitive leaf is editable inline with type coercion, booleans get checkboxes, getter-only props are read-only
- an **add-key row** and per-row delete for top-level keys
- hover-to-highlight, and a **pick mode** to select a scope by clicking the page
- dark / light / system **themes**; the selected scope is exposed as `window.$scope`
- the panel **drags** by its header, **resizes** via the native grip, and remembers its open state, position and size

## Browser extension

A devtools-tab variant for Chrome and Firefox lives in the repo's `extension/` directory — load it unpacked (`chrome://extensions` → Load unpacked, or `about:debugging` in Firefox). It reads the same registry through `chrome.devtools.inspectedWindow.eval`; the in-page panel remains the richer tool for deep editing.

## Disabling in production

Devtools are on by default. To turn them off (no `window.__LITE_VUE__`, no scope registration):

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

`disableDevtools()` also clears anything already registered, so calling it late is safe.
