---
title: Globals
---

# Globals <Badge type="section" text="Global" />

The JavaScript API exported by `@aevantec/litevue`.

```js
import { createApp, store, reactive, computed } from '@aevantec/litevue';
```

## Reference

| Export | Signature | Purpose |
| --- | --- | --- |
| [createApp()](/globals/create-app) | `(data?) => App` | Create and mount an app |
| [store()](/globals/store) | `(name, value?) => store` | Register or read shared named state |
| [reactive()](/globals/reactive) | `(object) => object` | Make an object reactive |
| [computed()](/globals/computed) | `(getter) => ComputedRef` | Cached derived state |
| [watchEffect()](/globals/watch-effect) | `(fn) => stop` | Re-run a function when its state changes |
| [nextTick()](/globals/next-tick) | `(callback?) => Promise` | Run after the DOM has updated |
| [devtools](/globals/devtools) · `disableDevtools()` | — | The live scope registry, and switching it off |

## Types

| Type | For |
| --- | --- |
| `App` | The object `createApp()` returns |
| `Plugin<Options>` | Writing a [plugin](/plugins/) |
| `ComponentFactory` | A [component](/essentials/components) function |
| `ErrorHandler`, `ErrorInfo`, `ErrorPhase` | [`app.onError()`](/essentials/error-handling#app-onerror) |
| `ComputedRef`, `WritableComputedRef` | Values from `computed()` |
| `LiteVueDevtools`, `DevtoolsEvent` | The [devtools registry](/globals/devtools) |

## In templates

Expressions cannot import. Their equivalents are magics:
[`$store`](/magics/store), [`$watch`](/magics/watch) and
[`$nextTick`](/magics/next-tick).
