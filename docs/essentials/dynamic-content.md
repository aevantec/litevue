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
- a single `unmount()` tears down every mounted batch.
