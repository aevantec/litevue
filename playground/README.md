# Playground

Hand-driven pages for checking behavior in a real browser. They import from
`../src` directly, so the dev server serves live source with no build step.

```bash
pnpm dev   # then open http://localhost:3000
```

`index.html` at the repo root links every page.

## What these are for

Nothing here asserts, and nothing here runs in CI — you open a page and look at
it. That's the point: these cover what the vitest suite structurally cannot,
because jsdom has no layout engine, no real focus model, and no CSS transitions.

| Page | What only a browser can show |
| --- | --- |
| `transition.html`, `if-transition.html` | enter/leave class timing, `transitionend`, deferred unmount |
| `trap.html` | tab order and focus containment |
| `mask.html` | caret position while typing into a masked input |
| `devtools-panel.html` | the panel UI — hover highlight, pick mode, dragging, themes |
| `devtools-dist.html` | the **built** bundle rather than source — the only check that `pnpm build` output actually runs |
| `cloak.html`, `show.html`, `pre.html` | visual states |

Automated coverage lives in [`../test/`](../test) and is what `pnpm test` runs.
If a behavior can be asserted in jsdom, write it there instead — a page here is
only worth adding when a real browser is genuinely required.

## Adding a page

Copy the smallest existing page that resembles what you need, import from
`../src`, and add a link to the root `index.html` so it's discoverable.
