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
| `to` | The new markup for that element, as an HTML string or an element. A string that is a single element is that element's outer HTML; any other string, such as an element beside text, is its new content |

Returns `from` — the same node, which keeps its scope.

### Options

| Option | Meaning |
| --- | --- |
| `key(el)` | Identity for matching children. Default: `id`, then `data-key`, then `data-id` |
| `skip(from, to)` | Return `true` to leave a matched element's contents untouched |
| `preserve(el)` | Return `true` to keep an element even when the new HTML omits it |
| `beforeNodeAdded(node)` | Called before inserting a node; return `false` to leave it out |
| `afterNodeRemoved(node)` | Called after a node is removed and its effects are released |
| `transition` | `true` to patch inside a [view transition](#view-transitions) where the browser supports it |
| `values` | `true` to set field values, checkboxes and selected options from the new HTML, as a full load would. See [Field values](#field-values) |

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

Type a name, open **More options** and press Enter. Then type again and use the innerHTML button. Both apply the same server response:

<<< ../.vitepress/demos/morph.html{html}

<LiveDemo src="morph" plugins="morphPlugin" />

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

Without an `id` or other key, a preserved element is matched by position. It
counts as present when the new HTML's node at that position is also marked
`data-morph-preserve`; otherwise it keeps its place and the server's nodes fill
the positions around it, so a toast prepended by the client does not take the
place of the page's first element.

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

### View transitions

`transition: true` runs the patch inside
[`document.startViewTransition()`](https://developer.mozilla.org/docs/Web/API/Document/startViewTransition),
so the browser animates from the old region to the new one. Browsers without
the API patch immediately, as if the option were absent.

```js
morph(document.querySelector('#cart'), html, { transition: true });
```

The patch runs once the browser has captured the old view, so the DOM still
holds the old content when `morph` returns. To wait for the patch or the
animation, start the transition yourself and morph inside it:

```js
const transition = document.startViewTransition(() => morph(el, html));
await transition.updateCallbackDone; // patched
await transition.finished; // animation over
```

Browsers do not skip view transitions for visitors who prefer reduced motion.
Turn the animation off in CSS:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) {
    animation: none;
  }
}
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
| <code v-pre>{{ … }}</code> in a text node | Leaves the rendered text alone, except inside a `<script>`, whose text is never interpolated and so follows the server |
| `v-*`, `:` and `@` attributes | Never adds them to a live element |
| `:class` | Leaves the live `class` alone |
| `v-model`, with or without modifiers | Leaves `value` and `checked` alone |
| `<details>` or `<dialog>` | Leaves `open` alone, so one the user opened stays open |
| `v-bind` with an object | Leaves alone the attributes the object currently binds, updates the others the server sends, and removes none |
| Any other `v-` directive except `v-scope` and `v-on`, such as `v-show` or `v-collapse` | Leaves the live `style` alone |
| [`v-popover`](/plugins/popover) | Also leaves the `popover` attribute alone, which the directive adds when the markup has none |
| `v-text`, `v-html`, `v-pre`, `v-once` | Leaves that element's children alone |
| An element with `v-if` or `v-for` | Leaves the whole containing element alone |
| An element with `v-teleport` | Leaves the live element in its target alone, and removes it only when the server stops sending it |
| Anything else | Patches it to match, and removes attributes the server dropped |

- New elements are walked, so any `v-scope` they carry becomes live. Treat morphed HTML with the same care as anything you mount — see [Security](/start-here/security#morph-and-server-rendered-updates).
- That walk needs a scope to walk in. A region outside every mounted scope, such as a server-rendered wrapper holding separately mounted `v-scope` roots, has none, so a new `v-scope` it receives stays inert until you call `app.mount(el)` on it. The [navigate](/plugins/navigate) plugin does this for you. A region torn down with `app.unmount(el)` counts as outside every scope, so markup morphed into it is not bound to the scope it had.
- New markup inside a [lazy region](/directives/v-scope#mounting-on-demand) that has not mounted yet (`v-scope.visible`, `.idle` or `.interaction`) is not walked by morph. The region binds it with its own scope when it mounts, together with the markup it already held.
- The content of a `<template>` element is replaced with the content the server sends. A template holds no live bindings, so nothing is lost; elements already created from it keep their nodes and state.
- A live element's state wins over its `v-scope` in the new HTML: `v-scope="{ count: 0 }"` does not reset a count that is already `3`.
- A component that renders from [`$template`](/directives/v-scope) keeps its children. The server sends its root empty, since the markup comes from the template on the client, so morph patches only the root's attributes.
- A class set from JavaScript is patched away unless the element is marked `data-morph-skip`.
- A [`v-teleport`](/directives/v-teleport) element keeps its node and its state across a morph, provided no unkeyed element is added or removed before it; one that is would take its position and replace it. The server cannot change its attributes or contents, so bind those to state instead. Morphing its target never removes it, since the server does not send it there.
- The server cannot open or close an existing `<details>` or `<dialog>` by changing `open`, just as it cannot overwrite what the user typed unless the [`values`](#field-values) option is set. To change it from the server, give the element a new `id` so morph replaces it, or bind `:open` to state.
- On an element carrying a directive that owns `style`, the server cannot change the inline style. Send server-driven styling as a class, or as a CSS custom property on the `v-scope` root. The same holds for the element a [`v-anchor`](/plugins/popover) points at, since the directive writes `anchor-name` into its inline style.
- A removed element's scope is released with it, inside a mounted scope or outside every one: its effects stop and its listeners are removed. State that must survive a re-render belongs in a [store](/globals/store).
- A key must be a plain attribute, readable on both sides. `v-name`, `ref`, `:` and `@` attributes are consumed at mount and cannot serve as keys.
- Duplicate sibling keys warn in development, since the earlier element would lose its node.
- `afterNodeRemoved` receives an inert node. Preserved nodes are never announced, because they are never removed.

### Field values

By default, morph never changes what a visitor has typed, ticked or selected. It updates the `value`, `checked` and `selected` attributes, but once a field has been edited the browser shows the edited value rather than the attribute. A form re-rendered with validation errors therefore keeps the visitor's input.

With `values: true`, morph also sets each field's current value, checked state and selection from the new HTML, so the page shows what a full load of that HTML would show. Use it when the new HTML replaces the form's state, for example after a successful save:

```js
morph(form, html, { values: true });
```

The option leaves some fields alone:

- A field bound with `v-model`, with or without modifiers such as `.trim` or `.lazy`, or with `:value` or `:checked`, a `<select>` bound with `v-model` or `:value` together with its options, and a field bound with a `v-bind` object. Their values belong to the scope's state; to clear them, reset that state.
- An `<output>`, whose text is updated like any other element's children, so interpolated text in it keeps rendering. A `<textarea>` whose text in the new HTML holds <code v-pre>{{ }}</code> is left alone for the same reason.
- A field inside an element marked `data-morph-skip`. Mark a field this way when the visitor may still be typing in it while the new HTML loads, such as a search box that updates its results as the visitor types.

The focused field is updated like any other. It gets no exception, because a form submitted with Enter has its focus in the field just submitted, and that field should be cleared like the rest.

[navigate](/plugins/navigate#forms) sets `values` after every successful response.

## Related

[Server-driven HTML](/essentials/server-driven-html) · [navigate](/plugins/navigate) · [Dynamic content](/essentials/dynamic-content) · [Security](/start-here/security) · [Installation](/plugins/installation)
