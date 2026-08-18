---
title: media
---

# media <Badge type="section" text="Plugin" />

Viewport-driven **behaviour**: values handed to JavaScript, structural branches, and work that should be skipped entirely on small screens. The same logic is available two ways: `$mq` and its related helpers in markup, and a plain `mq` object in scripts.

Breakpoints are **mobile-first** throughout — every key is a minimum width and the largest match wins, matching Tailwind and CSS `min-width` queries. See [Mobile-first](#mobile-first-like-tailwind).

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

### Mobile-first, like Tailwind

Every breakpoint is a **minimum width**, and a map resolves to the **highest key that matches** — the same cascade as Tailwind's `md:` and CSS's `min-width` queries, and the opposite of a `max-width` approach.

Two consequences worth internalising:

- **A key applies at that width _and upward_**, until a larger key overrides it. `{ base: 1, lg: 4 }` gives 1 on a phone, 1 on a tablet, and 4 from 1024px up — `lg` is not "only on large screens".
- **The smallest case is the default.** `base` matches every viewport, so it is the value you get when nothing else does. Write the phone value first and add larger keys as overrides, rather than starting wide and narrowing.

```html
<!-- reads as: 1 by default, 2 from md up, 4 from lg up -->
<span>{{ $mq({ base: 1, md: 2, lg: 4 }) }}</span>
```

You do not need a key per breakpoint — only where the value changes. A map with a gap simply keeps the last matching value:

```html
<!-- 8 from base through md, then 24 from lg up -->
<span>{{ $mq({ base: 8, lg: 24 }) }}</span>
```

`$mqAtLeast(key)` follows the same rule and is inclusive: at `xl`, `$mqAtLeast('md')` is `true`. When you want mutually exclusive buckets instead, reach for `$mqDevice`.

::: tip Going the other way
There is no `max-width` form. For "phones only", give `base` the narrow value and override it at the next breakpoint up — `{ base: 'drawer', md: 'sidebar' }` — which keeps one direction of reasoning across the whole codebase.
:::

### Any value type

A map's values are returned as-is, so they can be anything — strings, numbers, booleans, arrays, functions, or objects. Nothing is merged or cloned; the matching value comes back by reference.

That means breakpoints can select between **entirely different shapes**, not just different numbers:

```html
<div
  v-scope="{ get opts() {
    return $mq({
      mobile:  { layout: 'stack', showLabels: false },
      desktop: { layout: 'grid', columns: 4, gap: 24, showLabels: true }
    })
  } }"
>
  <div :data-layout="opts.layout">…</div>
</div>
```

In TypeScript the result is inferred as a union of the value types, plus `undefined` for the case where nothing matched. A property that exists on only one of the shapes comes back as `T | undefined`, so narrow before using it:

```ts
const opts = mq({
  mobile: { layout: 'stack', showLabels: false },
  desktop: { layout: 'grid', columns: 4 },
});

opts?.layout; // string — present on both
opts?.columns; // number | undefined — desktop only, so narrow first
```

Falsy values are honoured rather than treated as missing, so `0`, `''`, `false` and `null` all survive — including when a fallback is present:

```js
mq({ base: 1, lg: 0 }, 99); // 0 at lg, not 99
mq({ base: 'x', lg: '' }, 'fallback'); // '' at lg
```

#### Leaving a breakpoint unset

Omitting a key is the normal way to say "no special value here" — the next smaller key applies instead. To have a value at one breakpoint and **nothing** elsewhere, give the others `undefined` or simply leave them out:

```js
mq({ lg: 'wide-only' }); // undefined below lg, 'wide-only' from lg up
```

::: warning `undefined` is indistinguishable from "no match"
An explicit `undefined` at the matching breakpoint falls through to the
fallback, because the resolver treats `undefined` as "no value found":

```js
mq({ base: 'narrow', lg: undefined }); // undefined at lg — as expected
mq({ base: 'narrow', lg: undefined }, 'FB'); // 'FB' at lg, not undefined
```

Use `null` when you need "deliberately nothing" to win over a fallback — it is
returned as-is, like any other value.
:::

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

// how much to ask the server for — a decision no stylesheet can reach
const limit = mq({ mobile: 5, tablet: 10, desktop: 25 });
const res = await fetch(`/api/activity?limit=${limit}`);

// shared state both markup and scripts can read
store('ui', {
  get reduceMotion() {
    return mq.match('(prefers-reduced-motion: reduce)');
  }
});
```

Reads share one subscription: the plugin creates a single `MediaQueryList` per breakpoint for the whole page, so twenty responsive maps cost the same as one.

::: tip Keep `match()` queries static
Each distinct query string gets its own `MediaQueryList`, kept for the life of the page so repeated reads are free. A string built on the fly defeats that — every distinct value creates another one, and none are released:

```js
mq.match(`(min-width: ${n}px)`); // a new subscription per value of n
```

Prefer a breakpoint key, or a fixed set of query strings.
:::

## Container width

For an **element's** size rather than the viewport's — a panel in a split view, a card in a reflowing grid — use the [resize](/plugins/resize) plugin and its `v-resize` directive. It is a separate install with no shared code, so neither plugin drags the other in.

## Custom breakpoints

The default scale matches Tailwind's:

| Key | Min width |
|---|---|
| `base` | 0 — everything below `sm` |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### Replacing the scale

Pass your own when installing the plugin:

```js
createApp()
  .use(media, {
    breakpoints: { phone: 480, tablet: 820, laptop: 1180 }
  })
  .mount();
```

Those keys are then what markup uses, and `$mqBreakpoint` reports them:

```html
<div v-scope>
  <span>{{ $mqBreakpoint }}</span>          <!-- base | phone | tablet | laptop -->
  <aside v-if="$mqAtLeast('laptop')">…</aside>
</div>
```

From a script — including before any app exists — the same thing:

```js
import { mq } from '@aevantec/litevue/plugins/media';

mq.configure({ breakpoints: { phone: 480, tablet: 820, laptop: 1180 } });
```

### Updating the defaults

`configure()` **replaces** the scale rather than merging into it, so that the
keys in play are always exactly the ones you named — no inherited leftovers to
reason about. To adjust or extend the defaults instead of starting over, spread
`defaultBreakpoints`:

```js
import { mq, defaultBreakpoints } from '@aevantec/litevue/plugins/media';

// one breakpoint moved, the rest untouched
mq.configure({ breakpoints: { ...defaultBreakpoints, lg: 960 } });

// an extra breakpoint below sm
mq.configure({ breakpoints: { ...defaultBreakpoints, xs: 420 } });
```

It works as a `use()` option too:

```js
import { media, defaultBreakpoints } from '@aevantec/litevue/plugins';

createApp()
  .use(media, { breakpoints: { ...defaultBreakpoints, xs: 420 } })
  .mount();
```

### One scale per page

The scale is module state shared by every app on the page, not per-app. Two apps each passing their own `breakpoints` does not give them one each — the second replaces the first, and the first app's markup starts resolving against key names it never declared. Development warns when that happens. Configure it once, or call `mq.configure()` deliberately when replacing it is the intent.

### When you can call it

`mq` activates on its first read rather than on `use()`, so `configure()` is
safe at any point — a scale that arrives after reads have begun tears down the
old subscriptions and rebuilds them, and anything already on screen updates.

::: warning Keep `md` and `lg` if you use `$mqDevice`
The `mobile` / `tablet` / `desktop` aliases and `$mqDevice` are defined in terms
of `base`, `md` and `lg`. A custom scale without those keys falls back to the
default widths and warns in development — either keep the names, or use
`$mqAtLeast` with your own.
:::

## When to use this

Good reasons:

- **structural divergence** — a sidebar versus a drawer, where only one should exist in the DOM, not one hidden with CSS
- **values that leave the page** — a request's page size, an analytics property, anything sent to a server, which no stylesheet can reach
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
