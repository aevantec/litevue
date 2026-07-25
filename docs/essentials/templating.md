# Templating

## Interpolation

Text between double curly braces is evaluated as an expression against the current scope and kept up to date reactively:

```html
<div v-scope="{ name: 'world' }">Hello {{ name.toUpperCase() }}!</div>
```

## Custom delimiters

Useful alongside server templating languages that also use mustaches:

```js
createApp({
  $delimiters: ['${', '}'],
}).mount();
```

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
