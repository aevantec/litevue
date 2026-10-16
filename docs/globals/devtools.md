---
title: Devtools API
---

# Devtools API <Badge type="section" text="Global" />

A live registry of every scope and store on the page, available in the console
as `window.__LITE_VUE__`.

```js
__LITE_VUE__.getScope($0).count = 42; // the page updates immediately
```

## Signature

```ts
import { devtools, disableDevtools } from '@aevantec/litevue';
```

`devtools` is the same object as `window.__LITE_VUE__`.

| Member | Meaning |
| --- | --- |
| `getScope(node)` | The scope governing a node — the nearest registered scope root at or above it |
| `getScopeByName(name)` | The first scope registered with that [`v-name`](/directives/v-name) |
| `scopes` | `Map<Element, scope>` of every scope root |
| `names` | `Map<Element, string>` of `v-name` labels |
| `exps` | `Map<Element, string>` of each root's `v-scope` expression |
| `stores` | `Map<string, store>` of registered stores |
| `components` | `Set<string>` of names registered with `app.component()` |
| `plugins` | Array of what each [`app.use()`](/globals/create-app#the-app-instance) contributed, in install order. Development builds only |
| `on(event, fn)` | Subscribe to an event; returns an unsubscribe function |
| `off(event, fn)` | Unsubscribe |

### Events

| Event | Arguments | When |
| --- | --- | --- |
| `scope:mount` | `(el, scope)` | A scope was registered. May repeat for the same element |
| `scope:unmount` | `(el)` | A scope root was torn down |
| `store:register` | `(name, store)` | A store was registered |
| `plugin:install` | `(info)` | A plugin was installed. Development builds only |
| `flush` | — | A batch of updates reached the DOM |

`disableDevtools()` takes no arguments — see [Disabling in production](#disabling-in-production).

## Examples

### In the console

```js
// the scope around the element selected in the Elements panel
__LITE_VUE__.getScope($0);

__LITE_VUE__.getScopeByName('cart');
__LITE_VUE__.stores.get('cart');
```

### Installed plugins

```js
__LITE_VUE__.plugins;
// [{ name: 'focus', directives: ['focus', 'trap'], magics: [], teardown: false }]
```

Each entry records what one `app.use()` registered: its directives, its
root-scope magics such as `$morph`, and whether it returned a teardown.
`directives` and `magics` identify a plugin, not `name`. Minifiers rename
functions, so a bundled app shows `plugin 1`, `plugin 2` and so on.

### Subscribing

```js
const off = __LITE_VUE__.on('scope:mount', (el, scope) => {
  console.log('mounted', el, scope);
});
```

These events drive the [inspector panel](/devtools/panel) and the
[browser extension](/devtools/extension).

### Disabling in production

```html
<!-- script tag: set the flag before the library loads -->
<script>
  window.__LITE_VUE_DEVTOOLS__ = false;
</script>
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>
```

```js
// bundler: call it once before mounting
import { createApp, disableDevtools } from '@aevantec/litevue';

if (import.meta.env.PROD) disableDevtools();
createApp().mount();
```

::: warning Check the flag your bundler actually defines
`import.meta.env.PROD` is Vite's. On webpack, Rollup or Node it is `undefined`,
so `disableDevtools()` never runs and the registry ships to production. Use
`process.env.NODE_ENV === 'production'` there, and check a real production
build.
:::

## Behavior

- Scopes are the live reactive objects, so reads are always current and writes update the page.
- The registry holds references to every scope, and so to its data. Disable it where page state should not be reachable from the console — see [Security](/start-here/security).
- Once disabled there is no `window.__LITE_VUE__`, nothing registers, and no event fires, including `flush`. Calling it late is safe: it clears anything already registered.
- Plugins are recorded only in [development builds](/start-here/installation#development-builds), since recording costs the core bytes. In a production build `plugins` stays empty and `plugin:install` never fires.
- A full [`unmount()`](/globals/create-app#the-app-instance) removes that app's plugins from the list, since their teardowns have run. `unmount(el)` leaves them, because the app is still running.

## Related

[Inspector panel](/devtools/panel) · [v-name](/directives/v-name) · [Warnings](/devtools/warnings) · [Security](/start-here/security)
