---
title: Components
---

# Components <Badge type="essentials" text="Essentials" />

"Components" in litevue are deliberately bare-bones: plain functions returning scope objects, used from [`v-scope`](/directives/v-scope).

## Reusable logic

```html
<script type="module">
  import { createApp } from 'litevue';

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

## Reusable templates

Provide a `$template` key — a template string or an ID selector to a `<template>` element:

```html
<script type="module">
  import { createApp } from 'litevue';

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
