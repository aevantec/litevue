---
title: Components
---

# Components <Badge type="section" text="Essentials" />

"Components" in LiteVue are deliberately bare-bones: plain functions returning scope objects, used from [`v-scope`](/directives/v-scope).

## Reusable logic

```html
<script type="module">
  import { createApp } from '@aevantec/litevue';

  function Counter(props) {
    return {
      count: props.initialCount,
      inc() {
        this.count++;
      },
    };
  }

  createApp({ Counter }).mount();
</script>

<div v-scope="Counter({ initialCount: 1 })">
  <p>{{ count }}</p>
  <button @click="inc">increment</button>
</div>
```

## Registering by name

Passing components through `createApp` puts them on the root scope, which is
fine when everything is declared in one place. `app.component()` gives them a
named home instead:

```js
import { createApp } from '@aevantec/litevue';

createApp()
  .component('Counter', (props) => ({
    count: props.initialCount,
    inc() {
      this.count++;
    },
  }))
  .mount();
```

```html
<div v-scope="Counter({ initialCount: 1 })">
  <p>{{ count }}</p>
  <button @click="inc">increment</button>
</div>
```

Registration is chainable and can happen after `mount()` — a component
registered later is available to any region mounted after it. Calling
`app.component('Counter')` with no factory returns the registered function, and
`undefined` for a name that was never registered.

This is what a plugin should use to contribute a component, rather than writing
to `app.scope` directly.

### Resolution order

A registered component is reachable from expressions because it is mirrored onto
the root scope, so ordinary scope rules apply and **your data always wins**:

- A name already present on the root scope is not replaced. Registration is
  refused with a development warning, and the expression keeps resolving to your
  data.
- A `v-scope` further down the tree shadows a component of the same name, the
  same way it shadows any other root value.
- Registering the same name twice replaces it, with a development warning —
  usually two modules claiming one name.

## Reusable templates

Provide a `$template` key — a template string or an ID selector to a `<template>` element:

```html
<script type="module">
  import { createApp } from '@aevantec/litevue';

  function Counter(props) {
    return {
      $template: '#counter-template',
      count: props.initialCount,
      inc() {
        this.count++;
      },
    };
  }

  createApp({ Counter }).mount();
</script>

<template id="counter-template">
  My count is {{ count }}
  <button @click="inc">++</button>
</template>

<div v-scope="Counter({ initialCount: 1 })"></div>
<div v-scope="Counter({ initialCount: 2 })"></div>
```

The `<template>` approach is preferred — cloning a native template element is more efficient than parsing strings.

## Lifecycle per component

Combine with [lifecycle events](/essentials/lifecycle) for setup work:

```html
<div v-scope="Counter({ initialCount: 1 })" @mounted="init"></div>
```
