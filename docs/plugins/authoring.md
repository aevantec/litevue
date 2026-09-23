---
title: Writing a plugin
---

# Writing a plugin <Badge type="section" text="Plugin" />

Package directives and scope helpers so any app can install them with `use()`.

```js
const format = (app) => {
  app.scope.$money = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

createApp().use(format).mount();
```

## Signature

```ts
type Plugin<Options = any> =
  | ((app: App, options?: Options) => (() => void) | void)
  | { install(app: App, options?: Options): (() => void) | void };
```

A plugin is a function, or an object with an `install` method. It receives the
app and the options passed to `use()`, and may return a teardown function.

| Inside a plugin | Use it to |
| --- | --- |
| [`app.directive(name, def)`](/globals/create-app#custom-directives) | Register a directive |
| `app.scope` | Add `$`-prefixed helpers every expression can use |
| [`app.component(name, factory)`](/essentials/components#registering-by-name) | Register a component |
| `app.onError(handler)` | Report errors somewhere |

## Examples

### A directive with options

```js
const tooltip = (app, options = { delay: 300 }) => {
  app.directive('tooltip', ({ el, get, effect }) => {
    effect(() => el.setAttribute('title', get()));
    // options.delay is available to the directive
  });
};

createApp().use(tooltip, { delay: 500 }).mount();
```

```html
<button v-tooltip="'Save changes'">Save</button>
```

### Object form

```js
const helpers = {
  install(app) {
    app.scope.$format = (n) => n.toLocaleString();
  },
};
```

### Releasing what a plugin acquires

A plugin that takes a page-wide resource — a listener on `window` or
`document`, an observer, a `matchMedia` subscription, a timer — returns a
function that gives it back:

```js
const analytics = (app) => {
  const onHide = () => flush();
  document.addEventListener('visibilitychange', onHide);

  return () => {
    document.removeEventListener('visibilitychange', onHide);
  };
};
```

A directive that sets anything up outside `effect()` needs its own cleanup too
— see [Returning a cleanup](/globals/create-app#returning-a-cleanup).

## Behavior

- Installing the same plugin twice does nothing, and `use()` chains.
- A full `app.unmount()` runs every plugin teardown. `app.unmount(el)` does not, because the app keeps running and its other regions still need the plugin.
- After a full unmount, `use()` installs again rather than silently doing nothing.
- A teardown that throws is reported to [`app.onError()`](/essentials/error-handling#app-onerror) and the others still run.
- Directives register per app. Install the plugin before `mount()`, or its directives are unknown when the markup is walked.
- TypeScript: import the `App` and `Plugin<Options>` types from `@aevantec/litevue`.

## Related

[createApp()](/globals/create-app) · [Installation](/plugins/installation) · [Components](/essentials/components)
