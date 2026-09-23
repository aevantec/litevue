---
title: Templating
---

# Templating <Badge type="section" text="Essentials" />

Markup is the template. Expressions inside `{{ }}` and directive attributes are
plain JavaScript, evaluated against the element's scope and kept up to date.

```html
<div v-scope="{ name: 'world', items: [1, 2, 3] }">
  Hello {{ name.toUpperCase() }} — {{ items.length }} items
</div>
```

## What an expression can reach

Names resolve in this order:

1. The element's scope, then each parent scope up to the root
2. [Magics](/magics/) — `$el`, `$refs`, `$store` and the rest
3. Browser globals — `Math`, `Date`, `JSON`, `window`, and anything you have put on `window`

```html
<span>{{ Math.round(price * 1.2) }}</span>
<time>{{ new Date(createdAt).toLocaleDateString() }}</time>
```

A scope key shadows a global of the same name, so a key called `name` or
`location` hides `window.name` or `window.location` inside that region.

## Expressions and statements

| Where | Accepts |
| --- | --- |
| `{{ }}`, `v-bind`, `v-if`, `v-show`, `v-for` and most directives | One expression that produces a value |
| `v-on` handlers and `v-effect` | Statements too — `a++; b = 0`, `if (x) save()` |

## Interpolation

`{{ }}` inserts a value as text, never as HTML. `null` and `undefined` render as
empty, and objects as formatted JSON. For whole-element text or HTML, see
[`v-text`](/directives/v-text) and [`v-html`](/directives/v-html); for
attributes, [`v-bind`](/directives/v-bind).

## Custom delimiters

When a server template language already uses `{{ }}`, choose different
delimiters for the app:

```js
createApp({
  $delimiters: ['${', '}'],
}).mount();
```

```html
<p>Hello ${ name }</p>
```

## Hiding uncompiled templates

A slow connection can show raw `{{ }}` before LiteVue mounts. Hide those regions
with [`v-cloak`](/directives/v-cloak):

```css
[v-cloak] {
  display: none;
}
```

## Keeping text uncompiled

To show `{{ }}` literally — in a code sample, say — use [`v-pre`](/directives/v-pre).

## Content Security Policy

Expressions are compiled with `new Function`, so a page with a Content Security
Policy needs `'unsafe-eval'` in `script-src`. See [Security](/start-here/security#content-security-policy).

## Next

Reuse logic and markup with [Components](/essentials/components).
