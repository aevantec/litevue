---
title: media
---

# media <Badge type="section" text="Plugin" />

Viewport-driven **behaviour**: values handed to JavaScript, structural branches, and work that should be skipped entirely on small screens. It exposes `$mq` and friends in markup, and the same logic as a plain `mq` object for scripts.

```js
import { media } from '@aevantec/litevue/plugins';
createApp().use(media).mount();
```

<<< ../.vitepress/demos/media.html{html}

<LiveDemo src="media" plugins="media" />

::: warning Appearance still belongs in CSS
Padding, colours and column widths should be written as media queries in a stylesheet, which the browser applies before first paint. This plugin runs after it. Reach for it when CSS genuinely cannot do the job — see [when to use this](#when-to-use-this).
:::

## In markup

| | |
|---|---|
| `$mq(map, fallback?)` | resolve one responsive map |
| `$mqProps(maps)` | resolve several at once |
| `$mqBreakpoint` | current key: `base`, `sm`, `md`, `lg`, `xl`, `2xl` |
| `$mqDevice` | exclusive bucket: `mobile`, `tablet`, `desktop` |
| `$mqAtLeast(key)` | inclusive, the equivalent of Tailwind's `md:` |
| `$mqMatch(query)` | any media query |

```html
<aside v-if="$mqAtLeast('lg')">…</aside>
<div :class="{ compact: $mqDevice === 'mobile' }">…</div>
<div v-show="!$mqMatch('(prefers-reduced-motion: reduce)')">…</div>
```

A map is read mobile-first: the highest key that matches wins, and `base` covers everything below your smallest breakpoint.

```html
<div v-scope="{ }">
  <!-- 1 on phones, 2 on tablets, 4 from lg up -->
  <span>{{ $mq({ mobile: 1, tablet: 2, desktop: 4 }) }}</span>
</div>
```

`mobile`, `tablet` and `desktop` are aliases for `base`, `md` and `lg`. Raw pixel widths work too, for scales that aren't Tailwind's:

```html
<span>{{ $mq({ 0: 'a', 900: 'b' }) }}</span>
```

### Several values at once

Three or more related values are common — columns, gap, and a variant name that must change together. A getter in `v-scope` stays reactive and updates them as a unit:

```html
<div
  v-scope="{ get layout() {
    return $mqProps({
      columns: { mobile: 1, tablet: 2, desktop: 4 },
      gap:     { mobile: 8, desktop: 24 },
      variant: { mobile: 'compact', desktop: 'full' }
    })
  } }"
>
  <div
    :style="`--cols:${layout.columns}; --gap:${layout.gap}px`"
    :data-variant="layout.variant"
  >
    …
  </div>
</div>
```

Getters are not cached, so for a large map hoist it into a [`computed()`](/globals/computed) instead.

## In a script

The markup helpers are a thin skin over an `mq` object you can import on its own — no app, no element:

```js
import { watchEffect } from '@aevantec/litevue';
import { mq } from '@aevantec/litevue/plugins/media';

watchEffect(() => {
  if (mq.atLeast('lg')) enableSidebar();
  console.log(mq.breakpoint);
});
```

The mapping is mechanical — `$mqFoo` in markup is `mq.foo` in a script:

| Script | Markup |
|---|---|
| `mq(map, fallback?)` | `$mq(map, fallback?)` |
| `mq.props(maps)` | `$mqProps(maps)` |
| `mq.breakpoint` | `$mqBreakpoint` |
| `mq.device` | `$mqDevice` |
| `mq.atLeast(key)` | `$mqAtLeast(key)` |
| `mq.match(query)` | `$mqMatch(query)` |

`breakpoint` and `device` are **properties, not methods**, exactly as in markup — reading one inside `watchEffect`, [`computed()`](/globals/computed) or a [store](/globals/store) getter tracks it and re-runs on change.

Typical uses are the ones with no element to hang a directive on:

```js
import { store } from '@aevantec/litevue';
import { mq } from '@aevantec/litevue/plugins/media';

// a number CSS cannot hand to a third-party library
new Swiper(el, { slidesPerView: mq({ mobile: 1, tablet: 2, desktop: 4 }) });

// shared state both markup and scripts can read
store('ui', {
  get reduceMotion() {
    return mq.match('(prefers-reduced-motion: reduce)');
  }
});
```

Reads share one subscription: the plugin creates a single `MediaQueryList` per breakpoint for the whole page, so twenty responsive maps cost the same as one.

## v-resize

Container width, which no media query reports and CSS container queries cannot hand to JavaScript. The expression runs with `$width` and `$height` in scope:

```html
<div v-scope="{ w: 0 }" v-resize="w = Math.round($width)">
  <span>{{ w }}px</span>
</div>
```

It observes the element it sits on and stops when the region unmounts.

## Custom breakpoints

Pass your own scale to match a customised `theme.screens`:

```js
createApp()
  .use(media, {
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }
  })
  .mount();
```

The scale is replaced wholesale rather than merged. From a script — or before any app exists — the same thing:

```js
import { mq } from '@aevantec/litevue/plugins/media';

mq.configure({ breakpoints: { narrow: 500, wide: 900 } });
```

`mq` activates on its first read rather than on `use()`, so `configure()` is safe to call at any point; a scale that arrives later rebuilds the subscriptions. Keep `md` and `lg` in a custom scale if you rely on `$mqDevice` or the `tablet` / `desktop` aliases, since those are defined in terms of them.

## When to use this

Good reasons:

- **structural divergence** — a sidebar versus a drawer, where only one should exist in the DOM, not one hidden with CSS
- **values passed to JavaScript** — `slidesPerView` for a carousel; a stylesheet cannot pass a number to a library
- **skipping expensive setup** — never initialising a map, chart or rich-text editor on a phone
- **data density** — rendering 3 items instead of 12 in the `v-for` source, rather than hiding rows
- **`prefers-reduced-motion`** — worth honouring given transitions ship in the box

Reach for CSS instead for padding, colours, font sizes, and anything else purely visual.

::: warning The first frame renders before this runs
The server sent HTML knowing nothing about the viewport, so `v-if="$mqAtLeast('lg')"` renders the wrong branch for a frame. Above the fold, pair it with [`v-cloak`](/directives/v-cloak) so the region stays hidden until the app has mounted.
:::

::: tip Server rendering
`matchMedia` does not exist in Node. Every helper reports `base` and `false` there rather than throwing, so a page that renders on the server and hydrates in the browser stays safe.
:::
