# Playground

Hand-driven pages for checking behavior in a real browser. They import from
`../src` directly, so the dev server serves live source with no build step.

```bash
pnpm dev   # then open http://localhost:3000
```

The dev server stops with an error when port 3000 is taken rather than moving
to another port. Pass a free one instead:

```bash
pnpm dev --port 3002
```

The root page is an index of every example and playground page: a sidebar grouped by topic, with search (press `/`), and the selected page in a frame beside it. The toolbar reloads the page, opens it in its own tab, steps to the previous or next page, and switches the query flags a page reads, such as navigate's `?prefetch`. The address keeps the page, so a reload or a shared link returns to it. The index is styled with Tailwind, compiled by the dev server only; the pages in the frame keep their own styles.

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
| `navigate.html`, `navigate-2.html` | history, scroll restoration on back, focus, stylesheet loading in the head |
| `cloak.html`, `show.html`, `pre.html` | visual states |

Automated coverage lives in [`../test/`](../test) and is what `pnpm test` runs.
If a behavior can be asserted in jsdom, write it there instead — a page here is
only worth adding when a real browser is genuinely required.

## Adding a page

Copy the smallest existing page that resembles what you need, import from
`../src`, and add an entry for it in `dev/pages.ts`, with a title, a one-line
description, and `needsBuild` if it loads `dist/` files. `test/dev-pages.test.ts`
fails when a page has no entry.
