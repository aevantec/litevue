---
title: morph
---

# morph <Badge type="section" text="Plugin" />

Update a live region from new HTML **in place**, patching only what changed instead of replacing the markup.

```js
import { createApp } from '@aevantec/litevue';
import { morph, morphPlugin } from '@aevantec/litevue/plugins';

createApp().use(morphPlugin).mount();

const html = await fetch('/cart').then((r) => r.text());
morph(document.querySelector('#cart'), html);
```

`morph(from, to)` takes a live element and either an HTML string for that element or another element. It returns the live element — the same node that was passed in, which is the point of the exercise.

## Compared with replacing the markup

`innerHTML = html` destroys every element in the region, and a great deal depends on those nodes:

- **Scope state.** A scope belongs to its element. Replace the element and `v-scope="{ open: true }"` resets — the open accordion closes, the loaded tab unloads.
- **Browser state you don't control.** Focus and cursor position, text selection, IME composition, scroll offsets of inner containers, `<video>` playback, `<iframe>` contents, `<details open>`, in-flight CSS transitions.
- **Effects.** A replaced region's effects have to be torn down with [`unmount(el)`](/essentials/dynamic-content#tearing-a-region-down) first, or they stay subscribed and keep writing to detached nodes. Morph never detaches them, so the question doesn't arise.

::: tip This is the counterpart to manual initialization
[Dynamic content](/essentials/dynamic-content) stays inert until you call `mount(el)` — a deliberate security decision. That handles **new** fragments well and **replacing** live ones badly. Morph is the other half: it updates a region without re-executing anything already alive.
:::

## What the client owns

After LiteVue walks a tree, the DOM no longer looks like the HTML your server sent — <code v-pre>{{ count }}</code> has become `3`, and `v-scope`, `@click` and `:class` have been stripped from the attributes. Morph uses the **incoming** markup to work out what the client owns, because that copy still carries the directives:

| In the new HTML                       | What morph does                                     |
| ------------------------------------- | --------------------------------------------------- |
| <code v-pre>{{ … }}</code> in a text node | leaves the rendered text alone                  |
| `v-*`, `:`, `@` attributes            | never re-added to a live element                    |
| `:class="…"`                          | leaves the live `class` alone — the binding owns it |
| `v-model`                             | leaves `value` / `checked` alone                    |
| `v-text` / `v-html` / `v-pre` / `v-once` | leaves that element's children alone             |
| an element with `v-if` / `v-for`      | leaves the whole containing region alone            |
| anything else                         | patched to match the server                         |

Everything else — `href`, `title`, `data-*`, static text, plain classes on unbound elements — is patched, and attributes the server stopped sending are removed.

## Keys

Children are matched by key so a reordered list reuses its existing nodes rather than rebuilding them. Out of the box morph tries **`id`**, then **`data-key`**, then **`data-id`**:

```html
<ul id="list">
  <li data-id="42">…</li>
  <li data-id="43">…</li>
</ul>
```

Reorder those server-side and the `<li>` elements move; their scopes, focus and scroll survive.

Keys only need to be unique **within a parent**, not across the page — which is why a `data-*` attribute is usually easier than `id`. The attribute name is part of the key, so an `id` of `5` and a `data-id` of `5` on two siblings don't collide. Duplicate keys among siblings log a warning in development, because the earlier element would silently lose its node.

Unkeyed children fall back to positional matching, and mixing keyed with unkeyed siblings is fine — an unkeyed slot never consumes a keyed node.

Supply `key` for anything else:

```js
// a row whose link is its identity
morph(el, html, {
  key: (el) => el.querySelector('a')?.getAttribute('href') ?? null,
});
```

Return `null` for elements with no natural identity; they fall back to position.

::: warning Keys must survive the walk
The key has to be readable from **both** the live DOM and the incoming HTML — and LiteVue strips every directive attribute from live elements during [walk](/essentials/dynamic-content). So `v-name`, `ref`, `:`… and `@`… cannot serve as keys, despite `v-name` appearing well suited to it. Use a plain HTML attribute.
:::

### When keys are unnecessary

Positional matching is correct whenever the server never reorders — content edits, attribute changes, appends at the end. Keys earn their place for reordering, removal from the middle, and insertion at the front, where position no longer implies identity.

## Opting out

Mark a subtree the server should never touch:

```html
<div data-morph-skip>…client-rendered chart…</div>
```

Or decide per element:

```js
morph(el, html, { skip: (from, to) => from.classList.contains('live') });
```

`skip` keeps a matched element's *contents* intact. It does not keep the element
itself: it is consulted only when an element has a counterpart in the incoming
HTML, so it never sees one the server has simply stopped sending. For that, use
`preserve`.

## Preserving a node the server does not send

A chart, an editor, a map, a media player — anything the client created and the
server does not know about — is absent from every re-render. Without help, the
first morph removes it.

```html
<div id="chart" data-morph-preserve>…initialised by a charting library…</div>
```

The element is kept whatever the incoming HTML says: not removed when it is
missing, and not replaced when the tag at that position differs. Everything
around it still updates.

The programmatic form takes the element and returns whether to keep it:

```js
morph(el, html, { preserve: (el) => el.id === 'chart' });
```

### `skip` and `preserve` protect different things

They are orthogonal, and a client-owned widget usually wants both.

| | `data-morph-skip` | `data-morph-preserve` |
| --- | --- | --- |
| Protects | the element's **contents** | the element's **existence** |
| Element is in the incoming HTML | attributes and children left alone | **attributes and children are patched** |
| Element is absent from it | removed | kept |
| Tag at that position differs | **replaced** | kept |

So `preserve` alone keeps your chart's element, but lets the server rewrite what
is inside it on any update that does include it. And `skip` alone keeps the
contents, but the element is still removed when the server stops sending it, and
still replaced if the tag changes.

```html
<!-- a widget the client owns entirely -->
<div id="chart" data-morph-skip data-morph-preserve></div>
```

Together: never removed, never replaced, never patched.

::: tip Why not `v-preserve`
An unrecognised `v-` attribute makes the walker report an unknown directive, and
registering one as a real directive would have the walker strip it — leaving
nothing for the next morph to find. `data-morph-preserve` sits alongside
`data-morph-skip` and the walker never touches either.
:::

## Lifecycle hooks

For anything the two attributes cannot express, morph reports what it is about
to do:

```js
morph(el, html, {
  beforeNodeAdded(node) {
    // return false to leave it out
    return !(node instanceof Element && node.matches('.ad-slot'));
  },
  afterNodeRemoved(node) {
    teardownWidget(node);
  },
});
```

`beforeNodeAdded` runs for every node morph is about to insert, including one
replacing an element whose tag changed. Returning `false` skips that insertion
and nothing else.

`afterNodeRemoved` runs once the node is out of the document **and its LiteVue
effects, listeners and scopes have been released**. What it hands you is inert,
so a hook that keeps the node for a while is holding markup rather than a live
subtree. Preserved nodes are never announced, because they were never removed.

## In templates

The plugin registers [`$morph`](/magics/) on the root scope, so simple cases don't need a `<script>`:

```html
<div v-scope="{ busy: false }">
  <section ref="panel"><!-- … --></section>
  <button
    @click="busy = true;
            fetch('/panel').then(r => r.text())
              .then(h => { $morph($refs.panel, h); busy = false })"
  >
    Refresh
  </button>
</div>
```

## Limitations

Known constraints to weigh before depending on it:

- **A container hosting `v-if` or `v-for` is skipped whole.** The live DOM holds block anchors plus however many clones the data produced; the server still sends the single authoring template. Those shapes can't be reconciled positionally, so the client keeps ownership — including any static siblings in that container.
- **`v-scope` changes are ignored on live elements.** If the server renders `v-scope="{ count: 0 }"` for an element whose count is already `3`, the live value wins. Reset state explicitly rather than expecting the markup to do it.
- **Static attributes bound elsewhere can be clobbered.** Morph only knows a `class` is client-owned when the incoming element carries `:class`. If you set a class imperatively from JavaScript, mark the element `data-morph-skip`.
- **A removed element's `v-scope` is gone with it.** Effects, listeners and scopes are released as the node is detached, so nothing is left subscribed — but the state that scope held is not recoverable, and markup the server sends again arrives as a fresh scope at its initial values. Keep anything that must outlive a re-render in a [store](/globals/store) rather than in the region.

::: warning Morphed-in markup is walked
New elements inserted by a morph **are** initialized, including any `v-scope` they carry — that's what makes newly-added content work. It stays narrower than auto-init, because it only happens inside a region you explicitly named, but treat the HTML you morph in with the same care as anything else you mount: see [Security](/start-here/security#morph-and-server-rendered-updates).
:::
