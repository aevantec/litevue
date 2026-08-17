---
title: resize
---

# resize <Badge type="section" text="Plugin" />

`v-resize="expression"` reports an **element's** size as it changes. The expression runs with `$width` and `$height` in scope.

```js
import { resize } from '@aevantec/litevue/plugins';
createApp().use(resize).mount();
```

<<< ../.vitepress/demos/resize.html{html}

<LiveDemo src="resize" plugins="resize" />

- Backed by one `ResizeObserver` per directive, observing the element it sits on.
- It fires once on mount with the current size, then on every change.
- Observation stops when the region unmounts, including via [`app.unmount(el)`](/globals/create-app#unmount).

## Why this is not a media query

A media query describes the **viewport**; this describes **one element**. They diverge whenever a component's width is set by its container rather than the window — a sidebar that narrows while the window stays put, a panel in a resizable split view, a card in a grid that reflows.

CSS solves the styling half with container queries. What it cannot do is hand that width to JavaScript, which is what you need to pass a pixel value to a charting library, decide how many items to render, or switch a component's behaviour on its own size rather than the page's.

```html
<!-- a chart that must be told its size in pixels -->
<div v-scope="{ chart: null }" v-resize="chart?.setSize($width, $height)">…</div>
```

For viewport breakpoints — `$mqBreakpoint`, `$mqAtLeast`, responsive maps — use the [media](/plugins/media) plugin instead. The two are separate plugins with no shared code, so a page that only needs container width does not load the breakpoint machinery.

::: tip Keep the handler cheap
It runs on every observed change, which during a drag-resize means many times a second. Assign to scope state and let the bindings do the work, rather than doing layout maths or DOM writes inline.
:::

::: warning Writing a size back onto the observed element
Setting the width or height of the element you are observing from inside the handler can feed its own next callback. Browsers cut the loop and log "ResizeObserver loop completed with undelivered notifications" rather than hanging, but the fix is to observe a container and size a child, not the same element.
:::
