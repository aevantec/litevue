---
title: v-cloak
---

# v-cloak <Badge type="section" text="Directive" />

Hide uncompiled markup until LiteVue has mounted it.

```html
<div v-scope="{ msg: 'ready' }" v-cloak>{{ msg }}</div>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-cloak` | Removed from the element as soon as LiteVue processes it |

No value, argument or modifiers. It does nothing on its own — pair it with a
CSS rule.

## Examples

Add these rules to a stylesheet that loads before the page renders:

```css
[v-cloak]:not([v-scope\.visible]) {
  display: none;
}
[v-cloak][v-scope\.visible] {
  visibility: hidden;
}
```

Then mark any region whose raw `{{ }}` should not be visible:

```html
<div v-scope="{ msg: 'ready' }" v-cloak>{{ msg }}</div>
```

### Deferred regions

A region deferred with [`v-scope.visible` or `.interaction`](/directives/v-scope#mounting-on-demand)
mounts only when the user can reach it, so its cloak must not take it off the
page:

- `.visible` mounts when the element scrolls into view, which
  `IntersectionObserver` reports only for an element that has a box. The second
  rule above hides it with `visibility: hidden`, which keeps its box and the
  space it occupies.
- `.interaction` mounts on the first `pointerdown`, `keydown` or `focusin`
  inside the region. An element hidden by `display: none` or
  `visibility: hidden` cannot be pressed or focused, so leave the region itself
  visible and put `v-cloak` on the elements inside it that show raw `{{ }}`.

```html
<section v-scope.visible="Comments({ postId: 7 })" v-cloak>…</section>
<nav v-scope.interaction="{ open: false }">
  <button @click="open = !open">Menu</button>
  <ul v-show="open" v-cloak>…</ul>
</nav>
```

A `.idle` region mounts without user input, so either rule hides it safely.

## Behavior

- Without it, a slow connection can briefly show the raw `{{ msg }}` text before the script runs.
- Put the CSS in the `<head>`, not in a file that loads after the markup, or it will not apply in time.
- On a region deferred with [`v-scope.visible`, `.idle` or `.interaction`](/directives/v-scope#mounting-on-demand), `v-cloak` stays until that region mounts, and so does `v-cloak` on any element inside it.
- A `.visible` region hidden with `display: none` has no box of its own, so its parent element is observed in its place, and the region mounts when the parent scrolls into view. The rules above keep the region's own box, so it mounts when the region itself is reached.
- [`v-text`](/directives/v-text) avoids the flash for a single value without any CSS.

## Related

[v-text](/directives/v-text) · [Templating](/essentials/templating#hiding-uncompiled-templates)
