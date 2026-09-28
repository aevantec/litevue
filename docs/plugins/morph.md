---
title: morph
---

# morph <Badge type="section" text="Plugin" />

Update a live region from new HTML in place, patching only what changed.

```js
import { createApp } from '@aevantec/litevue';
import { morph, morphPlugin } from '@aevantec/litevue/plugins';

createApp().use(morphPlugin).mount();

const html = await fetch('/cart').then((r) => r.text());
morph(document.querySelector('#cart'), html);
```

## Signature

```ts
morph(from: Element, to: Element | string, options?: MorphOptions): Element
```

| Parameter | Meaning |
| --- | --- |
| `from` | The live element to update |
| `to` | The new markup for that element, as an HTML string or an element |

Returns `from` — the same node, which keeps its scope.

### Options

| Option | Meaning |
| --- | --- |
| `key(el)` | Identity for matching children. Default: `id`, then `data-key`, then `data-id` |
| `skip(from, to)` | Return `true` to leave a matched element's contents untouched |
| `preserve(el)` | Return `true` to keep an element even when the new HTML omits it |
| `beforeNodeAdded(node)` | Called before inserting a node; return `false` to leave it out |
| `afterNodeRemoved(node)` | Called after a node is removed and its effects are released |

### Attributes

| Attribute | Meaning |
| --- | --- |
| `data-morph-skip` | Never patch this element's attributes or children |
| `data-morph-preserve` | Never remove or replace this element |

### In templates

`morphPlugin` adds `$morph(from, to, options?)` to every expression.

## Examples

### Why not innerHTML

`innerHTML = html` destroys every element in the region, and with them:

- **Scope state** — an open accordion closes, a loaded tab unloads.
- **Browser state** — focus, cursor, selection, inner scroll offsets, `<video>` playback, `<details open>`, running transitions.
- **Effects** — which must be torn down with [`unmount(el)`](/essentials/dynamic-content#tearing-a-region-down) first, or they keep writing to detached nodes.

Morph keeps every node that still matches, so none of that is lost. It is the
counterpart to [dynamic content](/essentials/dynamic-content): `mount()` adds
new fragments, morph updates live ones.

### Keys

Children are matched by key, so a reordered list moves its nodes rather than
rebuilding them:

```html
<ul id="list">
  <li data-id="42">…</li>
  <li data-id="43">…</li>
</ul>
```

Keys only need to be unique among siblings. For anything else, pass `key`:

```js
morph(el, html, {
  key: (el) => el.querySelector('a')?.getAttribute('href') ?? null,
});
```

Return `null` for an element with no natural identity; it is matched by
position. Keys are only needed when the server reorders, removes from the
middle or inserts at the front — for content edits and appends, position is
enough.

### A widget the client owns

A chart, editor, map or player is created on the client and absent from every
server render. Protect both its existence and its contents:

```html
<div id="chart" data-morph-skip data-morph-preserve></div>
```

| | `data-morph-skip` | `data-morph-preserve` |
| --- | --- | --- |
| Protects | The element's contents | The element's existence |
| Present in the new HTML | Attributes and children left alone | Attributes and children patched |
| Absent from it | Removed | Kept |
| A different tag at that position | Replaced | Kept |

The programmatic forms decide per element:

```js
morph(el, html, {
  skip: (from) => from.classList.contains('live'),
  preserve: (el) => el.id === 'chart',
});
```

### Hooks

```js
morph(el, html, {
  beforeNodeAdded(node) {
    return !(node instanceof Element && node.matches('.ad-slot'));
  },
  afterNodeRemoved(node) {
    teardownWidget(node);
  },
});
```

### Without a script

```html
<div v-scope="{ busy: false }">
  <section ref="panel">…</section>
  <button
    @click="busy = true;
            fetch('/panel').then(r => r.text())
              .then(h => { $morph($refs.panel, h); busy = false })"
  >
    Refresh
  </button>
</div>
```

## Behavior

Morph reads the **incoming** HTML to learn what the client owns, since that copy
still carries the directives:

| In the new HTML | Morph |
| --- | --- |
| <code v-pre>{{ … }}</code> in a text node | Leaves the rendered text alone |
| `v-*`, `:` and `@` attributes | Never adds them to a live element |
| `:class` | Leaves the live `class` alone |
| `v-model` | Leaves `value` and `checked` alone |
| `v-text`, `v-html`, `v-pre`, `v-once` | Leaves that element's children alone |
| An element with `v-if` or `v-for` | Leaves the whole containing element alone |
| Anything else | Patches it to match, and removes attributes the server dropped |

- New elements are walked, so any `v-scope` they carry becomes live. Treat morphed HTML with the same care as anything you mount — see [Security](/start-here/security#morph-and-server-rendered-updates).
- A live element's state wins over its `v-scope` in the new HTML: `v-scope="{ count: 0 }"` does not reset a count that is already `3`.
- A class set from JavaScript is patched away unless the element is marked `data-morph-skip`.
- A removed element's scope is released with it. State that must survive a re-render belongs in a [store](/globals/store).
- A key must be a plain attribute, readable on both sides. `v-name`, `ref`, `:` and `@` attributes are consumed at mount and cannot serve as keys.
- Duplicate sibling keys warn in development, since the earlier element would lose its node.
- `afterNodeRemoved` receives an inert node. Preserved nodes are never announced, because they are never removed.

## Related

[Server-driven HTML](/essentials/server-driven-html) · [Dynamic content](/essentials/dynamic-content) · [Security](/start-here/security) · [Installation](/plugins/installation)
