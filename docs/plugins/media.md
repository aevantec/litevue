---
title: media
---

# media <Badge type="section" text="Plugin" />

Make behavior depend on the viewport, in markup and in scripts, with
mobile-first breakpoints like Tailwind's.

```js
import { media } from '@aevantec/litevue/plugins';
createApp().use(media).mount();
```

```html
<aside v-if="$mqAtLeast('lg')">…</aside>
<span>{{ $mq({ mobile: 1, tablet: 2, desktop: 4 }) }} columns</span>
```

::: warning Appearance still belongs in CSS
Padding, colours and widths belong in stylesheet media queries, which apply
before the first paint. This plugin runs after it. Use it for what CSS cannot do
— see [when to use it](#when-to-use-it).
:::

## Syntax

| Helper | Returns |
| --- | --- |
| `$mq(map, fallback?)` | The value for the current breakpoint |
| `$mqProps(maps)` | An object of resolved values, one per map |
| `$mqBreakpoint` | The current key: `base`, `sm`, `md`, `lg`, `xl`, `2xl` |
| `$mqDevice` | `mobile`, `tablet` or `desktop` — mutually exclusive |
| `$mqAtLeast(key)` | `true` at that breakpoint and above, like Tailwind's `md:` |
| `$mqMatch(query)` | Whether any media query string matches |

### Breakpoints

| Key | Minimum width | Alias |
| --- | --- | --- |
| `base` | 0 | `mobile` |
| `sm` | 640px | |
| `md` | 768px | `tablet` |
| `lg` | 1024px | `desktop` |
| `xl` | 1280px | |
| `2xl` | 1536px | |

A map may also use raw pixel widths as keys: `{ 0: 'a', 900: 'b' }`.

## Signature

Each helper has a script form on the `mq` object — `$mqFoo` in markup is
`mq.foo` in a script:

```ts
import { mq, defaultBreakpoints, resetMedia } from '@aevantec/litevue/plugins/media';

mq(map, fallback?)          // $mq
mq.props(maps)              // $mqProps
mq.breakpoint               // $mqBreakpoint — a property, not a method
mq.device                   // $mqDevice
mq.atLeast(key)             // $mqAtLeast
mq.match(query)             // $mqMatch
mq.configure({ breakpoints }) // replace the scale
```

| Export | Meaning |
| --- | --- |
| `media` | The plugin. Options: `{ breakpoints }` to replace the scale |
| `mq` | The script API above; works without an app |
| `defaultBreakpoints` | The default scale, to spread when adjusting it |
| `resetMedia()` | Restore the default scale and release every subscription — mainly for tests |

## Examples

<<< ../.vitepress/demos/media.html{html}

<LiveDemo src="media" plugins="media" />

### When to use it

Good reasons:

- **Structural differences** — a sidebar or a drawer, where only one should exist in the DOM
- **Values that leave the page** — a request's page size, an analytics property
- **Skipping expensive setup** — never initialising a map, chart or editor on a phone
- **Data density** — rendering 3 items instead of 12, rather than hiding rows
- **`prefers-reduced-motion`**

Use CSS for anything purely visual. For an element's size rather than the
viewport's, use [resize](/plugins/resize).

### Mobile-first

Every key is a minimum width, and a map resolves to the largest key that
matches. A key applies at that width and up, until a larger key overrides it:

```html
<!-- 1 by default, 2 from md up, 4 from lg up -->
<span>{{ $mq({ base: 1, md: 2, lg: 4 }) }}</span>

<!-- 8 through md, 24 from lg up — no key needed where nothing changes -->
<span>{{ $mq({ base: 8, lg: 24 }) }}</span>
```

Write the phone value as `base` and add larger keys as overrides. There is no
`max-width` form: for "phones only", give `base` the narrow value and override it
at the next breakpoint — `{ base: 'drawer', md: 'sidebar' }`.

### Values of any type

The matching value is returned as-is — strings, numbers, booleans, arrays,
functions or whole objects — so breakpoints can choose between different shapes:

```html
<div v-scope="{ get opts() {
  return $mq({
    mobile:  { layout: 'stack', showLabels: false },
    desktop: { layout: 'grid', columns: 4, showLabels: true }
  })
} }">
  <div :data-layout="opts.layout">…</div>
</div>
```

In TypeScript the result is a union of the value types plus `undefined`, so
narrow properties that exist on only one shape.

### Several values together

```html
<div v-scope="{ get layout() {
  return $mqProps({
    columns: { mobile: 1, tablet: 2, desktop: 4 },
    gap:     { mobile: 8, desktop: 24 },
    variant: { mobile: 'compact', desktop: 'full' }
  })
} }">
  <div :style="`--cols:${layout.columns}; --gap:${layout.gap}px`" :data-variant="layout.variant">…</div>
</div>
```

Getters are not cached; for a large map, use a [`computed()`](/globals/computed).

### In a script

Useful where there is no element — a request size, shared state:

```js
import { store, watchEffect } from '@aevantec/litevue';
import { mq } from '@aevantec/litevue/plugins/media';

const limit = mq({ mobile: 5, tablet: 10, desktop: 25 });
const res = await fetch(`/api/activity?limit=${limit}`);

store('ui', {
  get reduceMotion() {
    return mq.match('(prefers-reduced-motion: reduce)');
  },
});

watchEffect(() => {
  if (mq.atLeast('lg')) enableSidebar();
});
```

Reading `mq.breakpoint` or `mq.device` inside `watchEffect`, `computed()` or a
store getter tracks it.

### Custom breakpoints

Replace the scale when installing, or from a script at any time:

```js
createApp()
  .use(media, { breakpoints: { phone: 480, tablet: 820, laptop: 1180 } })
  .mount();

mq.configure({ breakpoints: { phone: 480, tablet: 820, laptop: 1180 } });
```

Markup then uses those keys: `$mqAtLeast('laptop')`. The new scale replaces the
old one entirely; to adjust the defaults, spread them:

```js
mq.configure({ breakpoints: { ...defaultBreakpoints, lg: 960 } }); // move one
mq.configure({ breakpoints: { ...defaultBreakpoints, xs: 420 } }); // add one
```

## Behavior

- Falsy values are returned, not treated as missing: `mq({ base: 1, lg: 0 }, 99)` is `0` at `lg`. Only `undefined` falls through to the fallback — use `null` for a deliberate "nothing" that should win.
- The scale is shared by every app on the page. A second app passing a different scale replaces the first, and development warns.
- `configure()` is safe at any time; anything already on screen updates.
- `$mqDevice` and the `mobile` / `tablet` / `desktop` aliases are defined by `md` and `lg`. A custom scale without those keys falls back to the default widths, with a development warning.
- One `MediaQueryList` per breakpoint serves the whole page. Each distinct `match()` string adds one that is never released, so keep query strings fixed rather than built from variables.
- The server sent HTML without knowing the viewport, so the first frame can show the wrong branch. Above the fold, pair it with [`v-cloak`](/directives/v-cloak).
- Without `matchMedia`, as on a server, every helper reports `base` and `false` rather than throwing.

## Related

[resize](/plugins/resize) · [computed()](/globals/computed) · [v-cloak](/directives/v-cloak) · [Installation](/plugins/installation)
