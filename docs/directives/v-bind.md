---
title: v-bind
---

# v-bind <Badge type="section" text="Directive" />

Binds an attribute to an expression.

## Syntax

`v-bind:` is the full form and `:` is its shorthand. They compile to the same
thing, so pick one and stay consistent:

```html
<!-- these pairs are identical -->
<img v-bind:src="url" />
<img :src="url" />

<a v-bind:href="link" v-bind:title="label">…</a>
<a :href="link" :title="label">…</a>
```

The examples below use the shorthand, which is the more common spelling.

<<< ../.vitepress/demos/v-bind.html{html}

<LiveDemo src="v-bind" />

- `:class` — equivalently `v-bind:class` — accepts Vue's string / object / array forms and merges with the static `class` attribute.
- `:style` — equivalently `v-bind:style` — accepts object syntax, `!important`, and auto-prefixing.
- Boolean-ish attributes are removed when the value is `false`/`null`/`undefined`.

Both spellings take the same values:

```html
<span class="badge" v-bind:class="{ active: isOpen }"></span>
<span class="badge" :class="{ active: isOpen }"></span>

<div v-bind:style="{ color: theme.text, marginTop: gap + 'px' }"></div>
<div :style="{ color: theme.text, marginTop: gap + 'px' }"></div>
```

## `ref` binding

`:ref` — or `v-bind:ref` — is treated as the [ref](/directives/ref) directive, letting the ref name be dynamic.
