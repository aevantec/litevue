# Getting Started

`litevue` is a fork of [petite-vue](https://github.com/vuejs/petite-vue) by Evan You — an alternative distribution of [Vue](https://vuejs.org) optimized for progressive enhancement: "sprinkling" interactivity onto server-rendered HTML. Same template syntax, same reactivity mental model, ~8kb.

## Installation

From a CDN, no build step:

```html
<script src="https://unpkg.com/litevue" defer init></script>

<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

- `v-scope` marks regions controlled by litevue and declares their state.
- `defer` makes the script run after the HTML is parsed.
- `init` auto-mounts every `v-scope` region on the page.

For production, pin a version: `https://unpkg.com/litevue@0.5.0/dist/lite-vue.iife.js` (exposes the `LiteVue` global) or `…/dist/lite-vue.es.js` for `<script type="module">`.

Via npm:

```sh
npm install litevue
```

```js
import { createApp } from 'litevue';
createApp().mount();
```

## Manual init

Remove the `init` attribute to control mounting yourself:

```html
<script src="https://unpkg.com/litevue"></script>
<script>
  LiteVue.createApp().mount();
</script>
```

## Root scope

`createApp` accepts a data object that becomes the root scope for all expressions:

```js
createApp({
  count: 0,
  get plusOne() {
    return this.count + 1;
  },
  increment() {
    this.count++;
  },
}).mount();
```

```html
<div v-scope>
  <p>{{ count }} / {{ plusOne }}</p>
  <button @click="increment">increment</button>
</div>
```

It also accepts a **setup function** (in the spirit of Vue's `<script setup>`): it runs once and its returned object becomes the root scope, giving you a private closure for helpers and shared reactive state:

```js
import { createApp, reactive } from 'litevue';

createApp(() => {
  const store = reactive({ items: [] });
  const format = (s) => s.toUpperCase(); // private helper

  return {
    store,
    count: 0,
    inc() {
      this.count++;
    },
    labels() {
      return store.items.map(format);
    },
  };
}).mount();
```

Plain closure variables (`let count = 0`) are **not** reactive — mutate state through `this`, the returned object, or a `reactive()` object.

## Mount targets

```js
createApp().mount('#only-this-div');
```

Multiple apps can control different regions of the same page, each with its own root scope.

## Initializing dynamic content

Markup added to the DOM after mount (htmx swaps, `fetch` + `innerHTML`) is **deliberately inert** — expressions in injected HTML never execute on their own, so HTML injection can't become script execution. Opt in explicitly by calling `mount()` again on the same app (the `Alpine.initTree` equivalent):

```js
const app = createApp({ shared: 'state' }).mount();

// later:
container.innerHTML = '<div v-scope="{ n: 0 }">{{ n }} / {{ shared }}</div>';
app.mount(container);
```

Fragments mounted this way join the same app — they see the root scope and [`$store`](./store-and-magics) — and one `unmount()` tears down every mounted batch.

## Components

"Components" are plain functions returning scope objects:

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

Reusable templates go through the special `$template` key — a template string or an ID selector to a `<template>` element:

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

## Custom delimiters

```js
createApp({
  $delimiters: ['${', '}'],
}).mount();
```

Useful alongside server templating languages that also use mustaches.
