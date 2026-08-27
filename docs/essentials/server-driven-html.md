---
title: Server-Driven HTML
---

# Server-Driven HTML <Badge type="section" text="Essentials" />

The server owns the HTML. The client owns the parts that have to survive a
re-render. That division is what LiteVue is for, and everything on this page
follows from it.

A server-rendered page already has the markup, the data and the routing. What it
lacks is the small amount of state that lives only in the browser: which tab is
open, what someone has half-typed, where a list is scrolled. Reaching for a
single-page framework to hold that state means moving rendering to the client as
well — and paying for it in bundle size, in a second copy of your routing, and
in a build step.

LiteVue takes the other side of the trade. The server keeps rendering. The
client keeps the state that would otherwise be lost, and updates regions in
place when the server sends new markup.

## The loop

1. The server renders the page, including LiteVue's directives.
2. LiteVue mounts, and expressions become live.
3. The user interacts. State that lives only in the browser changes.
4. Something triggers a request — a click, a form, a poll.
5. The server re-renders the affected region and returns HTML.
6. The client **patches** that region rather than replacing it, so browser state
   survives.

Steps 1 to 3 are ordinary LiteVue. Steps 5 and 6 are where the choice is, and
where most of the difficulty lives.

## New markup is inert until you say otherwise

Markup that arrives after the initial mount does nothing on its own. Expressions
in injected HTML never execute until the app is told to process them.

This is a security boundary, not an oversight. If inserted DOM were initialized
automatically, any HTML injection would become expression execution — see
[Security](/start-here/security). It also means integration is explicit: you
decide which markup becomes live, at a point you control.

There are two ways to do that, and they are not interchangeable.

## `mount()` or `morph()`

|                                                   | `app.mount(el)`                    | `morph(el, html)`                       |
| ------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| For                                               | markup that is **new** to the page | a region the server has **re-rendered** |
| Existing nodes                                    | replaced                           | patched in place                        |
| Scope state                                       | starts fresh                       | preserved                               |
| Focus, caret, scroll, `<details>`, media playback | lost                               | preserved                               |
| Needs an unmount first                            | yes, if replacing a mounted region | no                                      |

The rule of thumb: **if the region was already on the page and the server is
sending you a newer version of it, morph.** If the markup is genuinely new —
a modal that did not exist, a row appended to a table — mount it.

### Mounting new markup

```js
const app = createApp({ shared: 'state' }).mount();

// later, after inserting markup the server sent
container.insertAdjacentHTML('beforeend', html);
app.mount(container);
```

Fragments mounted this way join the same app: they see the root scope and
[`$store`](/magics/store), and a plain `unmount()` tears down every batch.

### Morphing a re-rendered region

```js
import { morph, morphPlugin } from '@aevantec/litevue/plugins';

const app = createApp().use(morphPlugin).mount();

const html = await fetch('/cart').then((r) => r.text());
morph(document.querySelector('#cart'), html);
```

[`morph`](/plugins/morph) walks the incoming HTML against the live DOM and
changes only what differs. An input the user is typing in keeps its value, its
caret position and its focus, because the element is never removed.

## Replacing a region: unmount first

If you do replace markup wholesale, tear the old region down before you do:

```js
app.unmount(container);
container.innerHTML = newMarkup;
app.mount(container);
```

Skipping the unmount is a leak, not an untidiness: the discarded effects stay
subscribed and keep writing to nodes that are no longer in the document, once
more per replacement.

::: warning A region cannot be re-activated in place
Walking an element **consumes** its directives — each `v-scope`, `@click` and
`:bind` is removed from the DOM as it is bound. Mounting the same element again
therefore binds nothing at all: no error, and an inert region that looks
mounted. LiteVue warns about this in development.

To bring a region back, insert fresh markup and mount that, or morph the region
from server HTML. Both give the walker directives to find.
:::

## Recipes

Each of these is a few lines, because the integration point is always the same:
the library tells you when it has put new HTML in the page, and you decide
whether that HTML should be mounted or morphed.

### htmx

htmx fires [`htmx:load`](https://htmx.org/events/#htmx:load) whenever it inserts
a node, with `detail.elt` as the new element. That is the hook the htmx
documentation recommends for initializing third-party JavaScript, and it is the
right one here:

```js
const app = createApp().mount();

document.body.addEventListener('htmx:load', (e) => {
  app.mount(e.detail.elt);
});
```

Because htmx removes the old nodes itself, unmount them before it does.
`htmx:beforeSwap` fires before the swap, with `detail.target` as the element
being swapped into:

```js
document.body.addEventListener('htmx:beforeSwap', (e) => {
  app.unmount(e.detail.target);
});
```

To keep browser state through a swap, let LiteVue patch instead. Cancel htmx's
swap and morph the response yourself:

```js
document.body.addEventListener('htmx:beforeSwap', (e) => {
  e.detail.shouldSwap = false;
  morph(e.detail.target, e.detail.serverResponse);
});
```

### Turbo

Turbo has three rendering paths, and they need different hooks.

**Turbo Drive** replaces the `<body>` on each visit. `turbo:load` fires after
the initial page load and after every visit, so one handler covers both:

```js
let app;
document.addEventListener('turbo:load', () => {
  app?.unmount();
  app = createApp().mount();
});
```

**Turbo Frames** replace one frame. `turbo:frame-load` fires on the frame
itself, and does not fire on initial page load — the `turbo:load` handler
above already covered that:

```js
document.addEventListener('turbo:frame-load', (e) => {
  app.mount(e.target);
});
```

**Turbo Streams** update fragments out of band. `turbo:before-stream-render`
lets you wrap the render, so you can unmount before and mount after.

::: warning Turbo 8 morphing and LiteVue both want the same nodes
With `<meta name="turbo-refresh-method" content="morph">`, Turbo patches the
page with idiomorph against fresh server HTML. That HTML still contains the
directives LiteVue stripped when it mounted, so a morph puts them back on
elements that are already bound — two libraries reconciling the same nodes
against different expectations.

Mark LiteVue-controlled regions with
[`data-turbo-permanent`](https://turbo.hotwired.dev/handbook/page_refreshes) so
Turbo leaves them alone, and drive their updates yourself. Turbo owns
navigation; LiteVue owns the region.
:::

### Unpoly

Unpoly is the closest fit of the four, because
[`up.compiler()`](https://unpoly.com/up.compiler) already expresses exactly this
lifecycle: it runs for matching elements on the initial page **and** whenever a
fragment is inserted, and the function it returns runs when that element is
removed or replaced.

```js
const app = createApp().mount();

up.compiler('[v-scope]', (element) => {
  app.mount(element);
  return () => app.unmount(element);
});
```

Mount and unmount are paired by the framework, so there is no swap event to
remember.

## What this buys you

- **The server stays in charge of rendering**, so there is one source of truth
  for markup and no second routing layer.
- **Browser state survives a re-render**, which is the thing plain HTML swaps
  lose and the reason morph exists.
- **No build step is required**, and no framework runtime is shipped to render
  what the server already rendered.

## Related

- [Dynamic Content](/essentials/dynamic-content) — mounting and unmounting regions
- [morph](/plugins/morph) — how patching works, and what the client owns
- [Security](/start-here/security) — why injected markup is inert by default
