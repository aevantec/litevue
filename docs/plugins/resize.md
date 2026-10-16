---
title: resize
---

# resize <Badge type="section" text="Plugin" />

Run an expression with an element's size, or the window's, now and whenever it changes.

```js
import { resize } from '@aevantec/litevue/plugins';
createApp().use(resize).mount();
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-resize="expression"` | Run on mount and on every size change, with `$width` and `$height` in scope |
| `v-resize.window="expression"` | The same, with the window's size: `innerWidth` and `innerHeight` |
| `v-resize.visual="expression"` | The same, with the visual viewport's size, which shrinks when an on-screen keyboard opens |

Without a modifier, `$width` and `$height` are the element's content box in
pixels — padding and border excluded.

## Examples

<<< ../.vitepress/demos/resize.html{html}

<LiveDemo src="resize" plugins="resize" />

### Sizing a chart

A charting library needs its container's size in pixels, which CSS cannot hand
to JavaScript:

```html
<div v-scope="{ chart: null }" v-resize="chart?.setSize($width, $height)">…</div>
```

### Fitting a panel above the keyboard

On a phone, the on-screen keyboard covers the bottom of the page without
changing `innerHeight`. The visual viewport does shrink, so `.visual` can keep a
full-screen chat or form within the part of the screen that is still visible:

```html
<div v-scope="{ h: 0 }" v-resize.visual="h = $height">
  <section class="sheet" :style="{ maxHeight: h + 'px' }">…</section>
</div>
```

### Element size, not viewport size

A media query describes the viewport; `v-resize` describes one element. They
differ whenever a component's width comes from its container — a sidebar that
narrows while the window does not, a panel in a resizable split view, a card in
a reflowing grid. For viewport breakpoints, use the [media](/plugins/media)
plugin. The two share no code, so a page that needs only one loads only one.

## Behavior

- One `ResizeObserver` per element. It stops when the region unmounts, including through [`app.unmount(el)`](/essentials/dynamic-content#tearing-a-region-down).
- `.window` and `.visual` listen for `resize` instead of observing the element, and stop the same way. `.window` reads `innerWidth` and `innerHeight`, which match CSS media queries and do not change with pinch-zoom. A `ResizeObserver` on `<html>` would report the document's height, not the window's.
- `.visual` reads `window.visualViewport`, which also shrinks with pinch-zoom. Where it is missing, `.visual` falls back to the window's size.
- The expression runs on every change — many times a second during a drag. Assign to state and let bindings do the work, rather than computing layout inline.
- Do not set the observed element's own size inside the expression; that feeds the next callback, and browsers stop the loop with "ResizeObserver loop completed with undelivered notifications". Observe a container and size a child instead.

## Related

[media](/plugins/media) · [intersect](/plugins/intersect) · [Installation](/plugins/installation)
