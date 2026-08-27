---
title: Development warnings
---

# Development warnings <Badge type="section" text="Devtools" />

LiteVue reports a small set of mistakes that would otherwise fail silently — the
page still renders, nothing throws, and the symptom appears later as lost input
or a blank value.

Every warning is guarded by `import.meta.env.DEV`. The production build replaces
that constant and the minifier removes the branch, so neither the checks nor
their messages reach a shipped bundle: **the core bundle is byte-for-byte
identical with and without them.** Nothing here needs to be turned off for
production.

Each warning prints once per distinct cause, because most are raised from
effects that re-run on every relevant state change.

## `v-for` with a duplicate `:key`

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

## `v-for` without a `:key`, on a list that reorders

Without a key the list reconciles by **position**. That is correct for appending
and truncating, and wrong the moment an item moves: elements are reused for
different items, carrying the previous item's browser state with them.

The warning is raised only when a keyless list is actually reordered, not on
every keyless `v-for` — a static list needs no key, and a warning that fires on
correct code teaches you to ignore the console.

## Two elements claiming the same `ref`

```html
<input ref="email" />
<input ref="email" />
<!-- $refs.email is the second one -->
```

`$refs` holds one element per name, so the second element replaces the first and
the earlier one is no longer reachable. The usual cause is a `ref` inside
`v-for`, where every row claims the same name — refs do not collect into a list
here the way they do in Vue.

## Reading an unregistered `$store`

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

## Mounting the same element twice

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
