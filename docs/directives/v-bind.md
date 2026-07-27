---
title: v-bind
---

# v-bind <Badge type="section" text="Directive" />

Binds an attribute to an expression. Shorthand: `:`.

<<< ../.vitepress/demos/v-bind.html{html}

<LiveDemo src="v-bind" />

- `:class` accepts Vue's string / object / array forms and merges with the static `class` attribute.
- `:style` accepts object syntax, `!important`, and auto-prefixing.
- Boolean-ish attributes are removed when the value is `false`/`null`/`undefined`.

## `ref` binding

`:ref` is treated as the [ref](/directives/ref) directive, letting the ref name be dynamic.
