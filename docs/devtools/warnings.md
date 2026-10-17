---
title: Development warnings
---

# Development warnings <Badge type="section" text="Devtools" />

LiteVue reports mistakes that would otherwise fail silently — the page still
renders, nothing throws, and the symptom appears later as lost input, a blank
value or a region that never responds.

The warnings live only in the [development builds](/start-here/installation#development-builds).
From npm you get them automatically while developing with Vite or webpack 5;
from a CDN, load the `.dev` file. The production files contain neither the
checks nor their messages, so nothing here needs to be turned off before you
deploy.

Warnings raised from effects print once per distinct cause, because those
effects re-run on every relevant state change.

Errors thrown by your own expressions and handlers are not warnings: they are
reported in every build. See [Error handling](/essentials/error-handling).

## Lists, refs and state

### `v-for` with a duplicate `:key`

```html
<li v-for="row in rows" :key="row.id">{{ row.name }}</li>
```

If two rows produce the same key, the later one wins the element and the earlier
row loses both its node and any state held on it — a focused input, a scroll
offset, an open `<details>`. Reconciliation looks like it worked; an item simply
vanishes.

Key by something that identifies the item and is unique among its siblings, such
as a record id. An array index is not a key: it changes when the list does,
which is exactly when the key matters.

### `v-for` without a `:key`, on a list that reorders

Without a key the list reconciles by **position**. That is correct for appending
and truncating, and wrong the moment an item moves: elements are reused for
different items, carrying the previous item's browser state with them.

The warning is raised only when a keyless list is actually reordered, not on
every keyless `v-for` — a static list needs no key, and a warning that fires on
correct code teaches you to ignore the console.

### Two elements claiming the same `ref`

```html
<input ref="email" />
<input ref="email" />
<!-- $refs.email is the second one -->
```

`$refs` holds one element per name, so the second element replaces the first and
the earlier one is no longer reachable. Give each element its own name.

A `ref` inside `v-for` does not trigger this: each row has its own `$refs`, so
rows never claim the same name as each other. See
[`ref`](/directives/ref#behavior).

### Reading an unregistered `$store`

```html
<span>{{ $store.crat.total }}</span>
<!-- typo: reads as undefined, renders blank -->
```

An unknown store reads as `undefined` and the expression carries on, so a
misspelling becomes an empty element rather than an error.

Because the store registry is reactive — an expression re-runs when a store is
registered later — this check waits for the current task to finish before
deciding. A store registered from a dynamically imported module, after that
point, will still warn once.

### `<select multiple>` with a model that is not an array

```html
<div v-scope="{ chosen: null }">
  <select multiple v-model="chosen">…</select>
</div>
```

A multiple select reads its model as the list of selected values, so anything
other than an array — `null`, a string, a `Set` — selects nothing. The first
change the user makes writes an array, so the page appears to fix itself, and
the options that should have started selected never were.

Initialise the model as `[]`, or as an array of the values to preselect. See
[`v-model`](/directives/v-model#controls).

## Mounting

### Mounting the same element twice

Walking an element **consumes** its directives: every `v-scope`, `@click` and
`:bind` is removed from the DOM as it is bound. Mounting that element again
walks a stripped tree and binds nothing — no error, no effects, an inert region
that looks mounted.

```js
app.mount(el);
app.unmount(el); // region torn down; the element stays in the document
app.mount(el); // nothing is bound
```

The DOM is the template here, so a region cannot be re-activated in place. To
bring one back, insert fresh markup and mount that — which is what
[morph](/plugins/morph) does. Mounting *new* markup into an existing app is
unaffected and remains the documented way to
[initialize dynamic content](/essentials/dynamic-content).

### A `mount()` or `unmount()` selector that matches nothing

```js
app.mount('#ap'); // mount: selector #ap has no matching element.
```

Nothing is mounted or torn down, and the call returns `undefined` rather than
the app, so a chained call after it throws. Check the selector, and that the script runs after the element exists — a script in
`<head>` without `defer` runs before the body is parsed.

### `unmount()` on an element with no mounted region

`unmount(el)` tears down every region mounted at `el` or inside it. An element
that is merely inside a mounted region, rather than containing one, matches
nothing. Pass the element that was mounted, or an ancestor of it.

### Mounting on `<html>`

When the page has no `v-scope` element, `app.mount()` mounts on `<html>` and
walks the whole document. It works, but every element is visited, including
markup LiteVue has nothing to do with. Mark the regions LiteVue controls with
`v-scope` and mount those.

### A setup function that does not return an object

```js
createApp(() => {
  const count = 0; // no return: the root scope is empty
});
```

The setup function's return value becomes the root scope. Return an object
holding the state and functions the markup uses. See
[`createApp()`](/globals/create-app#setup-function).

## Templates and directives

### An unknown directive

```html
<div v-tooltip="label"></div>
<!-- unknown directive v-tooltip on <div>. -->
```

The attribute is left in place and nothing is bound. The message lists every
directive the app knows. The usual causes are a typo, or a plugin directive
whose plugin was not installed with `app.use()` before `mount()`.

### An empty `v-if`

An empty or blank `v-if=""` is read as false: the element does not render, and
a following `v-else-if` or `v-else` is evaluated as usual. The empty attribute
is usually a template that lost its condition during editing.

### An invalid `v-for` expression

`v-for` expects `item in items` or `item of items`, optionally with an index or
destructuring: `(item, i) in items`, `{ id, name } in rows`. Anything else
leaves the element in the page as written, with its contents unprocessed — a
`{{ }}` inside shows as raw text. See [`v-for`](/directives/v-for).

### `v-on="obj"`

```html
<button v-on="{ click: save, focus: track }"></button>
```

The object form is not supported: no listener is bound, and in production there
is no message at all. Bind each event on its own — `@click="save"
@focus="track"`. See [`v-on`](/directives/v-on#behavior).

### `@vue:mounted` and `@vue:unmounted`

The `vue:`-prefixed lifecycle names still work but are deprecated. Use
`@mounted` and `@unmounted`. See [Lifecycle](/essentials/lifecycle).

### A modifier that can never match

On any event other than `keydown`, `keyup` and `keypress`, a modifier LiteVue
does not recognise is read as a key filter — and those events have no key, so
it filters nothing. The handler runs anyway, and the modifier is silently
ignored.

The usual cause is Alpine's timing syntax:

```html
<!-- runs at the 250ms default, not 500ms -->
<input @input.debounce.500ms="search()" />

<!-- LiteVue writes the interval with a dash -->
<input @input.debounce-500="search()" />
```

The warning names the modifier and, for a `<n>ms` modifier, suggests the dash
form. Key names on keyboard events — `.enter`, `.f1`, `.esc` — never warn. See
[`v-on`](/directives/v-on#key-and-mouse-modifiers).

### A `v-teleport` target that does not exist

The element stays where it was written instead of moving. The target is looked
up once, when the element mounts, so it must already be in the document. See
[`v-teleport`](/directives/v-teleport).

### A `$template` selector that matches no `<template>`

```html
<div v-scope="Card()"></div>
<script>
  const Card = () => ({ $template: '#crad' }); // typo for #card
</script>
```

A `$template` beginning with `#` is read as a selector for a `<template>`
element. When nothing matches, the element is left empty. Check the id, and
that the `<template>` is in the document before the scope mounts. See
[Reusable templates](/essentials/components#reusable-templates).

## Components

### Registering a component name twice

The second `app.component(name, …)` replaces the first. This is usually two
modules claiming the same name; give each component its own. See
[Registering by name](/essentials/components#registering-by-name).

### A component name that is already in the root scope

```js
createApp({ card: { title: 'Hi' } }).component('card', Card);
```

The component is **not** registered, because registering it would overwrite
`card` in your data. Rename one of the two.

## Plugins

### media: a value that is not a responsive map

`$mq(map)` expects an object keyed by breakpoint, such as
`{ base: 1, md: 2 }`. Anything else, such as `null` while data is still
loading, returns the fallback; the development build also warns. See
[media](/plugins/media#syntax).

### media: an unknown breakpoint key

A key that is neither a breakpoint, an alias (`mobile`, `tablet`, `desktop`)
nor a pixel width is skipped. `$mqAtLeast` with an unknown key returns `false`.
The usual cause is a custom scale that renamed the keys.

### media: `$mqDevice` with a custom scale

`$mqDevice` maps `tablet` to `md` and `desktop` to `lg`. A custom scale without
those keys falls back to the default widths, 768px and 1024px. Keep `md` and
`lg` in the scale, or use `$mqAtLeast` with your own keys.

### media: a second app with a different scale

The breakpoint scale is page-wide. A second app that installs media with
different `breakpoints` replaces the scale for every app on the page. Configure
the scale once, or call `mq.configure()` when replacing it is intended. See
[Custom breakpoints](/plugins/media#custom-breakpoints).

### morph: a duplicate key among siblings

Morph reuses live elements by key. When two siblings share a key, only the last
is reusable, and the other loses its node and its scope state. Keys must be
unique within their parent. See [morph keys](/plugins/morph#keys).

### navigate: the morph plugin is missing

```
[navigate] needs the morph plugin: app.use(morphPlugin).use(navigate)
```

Navigate morphs each page into the current one, and morph is not bundled with
it. Without morph, every navigation fails: a link or a `GET` form falls back to
a full load, and a `POST` form stays as it was, each firing `navigate:error`.
Install morph before navigate. See [navigate](/plugins/navigate).

### persist: a missing key

`v-persist` needs a storage key, from its value or the element's `id`. Without
one, every such element shares a single key. Write `v-persist="my-key"`.

### persist: an unknown storage modifier

A modifier other than `.local`, `.session` or a name passed to
`registerStorage()` is ignored, and the value goes to the default storage,
`localStorage` unless `setDefaultStorage()` changed it. See
[Choosing a storage](/plugins/persist#choosing-a-storage).

### persist: `persistStore()` on a store that does not exist

Nothing is persisted, and the returned stop function does nothing. Register the
store with `store(name, { … })` before calling `persistStore()`.

### persist: a storage that is not available

`persistStore()` was given a storage name that is not registered, or a storage
the browser does not provide — `localStorage` throws in some private modes.
Nothing is read or written.
