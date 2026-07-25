---
title: Templating
---

# Templating <Badge type="essentials" text="Essentials" />

## Interpolation

Text between double curly braces is evaluated as an expression against the current scope and kept up to date reactively:

```html
<div v-scope="{ name: 'world' }">Hello {{ name.toUpperCase() }}!</div>
```

Any JavaScript expression works — the scope chain, [magic properties](/magics/), and globals are all in reach. For attribute binding see [v-bind](/directives/v-bind); to fill an element's text or HTML from an expression see [v-text](/directives/v-text) and [v-html](/directives/v-html).

## Custom delimiters

Useful alongside server templating languages that also use mustaches:

```js
createApp({
  $delimiters: ['${', '}'],
}).mount();
```

## Hiding uncompiled templates

Users on slow connections may briefly see raw mustaches before litevue mounts — hide them with [v-cloak](/directives/v-cloak):

```css
[v-cloak] {
  display: none;
}
```

## Reusing markup

For reusable logic and markup, see [Components](/essentials/components).
