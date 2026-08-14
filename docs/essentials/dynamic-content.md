---
title: Dynamic Content
---

# Dynamic Content <Badge type="section" text="Essentials" />

Markup added to the DOM after the initial mount (htmx swaps, `fetch` + `innerHTML`, CMS embeds) is **deliberately inert** — expressions in injected HTML never execute on their own.

::: warning Why not auto-initialize?
If added DOM were initialized automatically, any HTML injection would become arbitrary expression execution. Keeping initialization explicit means the app controls exactly which markup becomes live.
:::

## Opt in with `mount()`

Call `mount()` again on the same app — the equivalent of Alpine's `Alpine.initTree`:

```js
const app = createApp({ shared: 'state' }).mount();

// later, after inserting new markup:
container.innerHTML = '<div v-scope="{ n: 0 }">{{ n }} / {{ shared }}</div>';
app.mount(container);
```

Fragments mounted this way join the same app:

- they see the root scope and [`$store`](/magics/store),
- `unmount()` with no argument tears down every mounted batch.

## Tearing a region down

Before removing or replacing a region, unmount it. `unmount(target)` tears down
only the roots at or inside that element — their effects stop, their listeners
come off, and their scopes deregister from the devtools — while the rest of the
app keeps running:

```js
app.unmount(container); // or a selector: app.unmount('#panel')
container.innerHTML = newMarkup;
app.mount(container);
```

Skipping the unmount is a leak rather than a tidiness problem: the old effects
stay subscribed and keep writing to nodes that are no longer in the document,
once more per replacement.

::: tip Prefer morph for server-rendered updates
Replacing markup discards scope state, focus and scroll even when you unmount
first. If the region is being re-rendered by a server, [`morph`](/plugins/morph)
patches it in place instead and none of that is lost.
:::

Unmounting removes the bindings, not the markup — the elements stay in the
document and remain perfectly usable, they are simply inert. Mounting the same
element again re-binds it.
