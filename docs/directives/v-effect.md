---
title: v-effect
---

# v-effect <Badge type="section" text="Directive" />

Run a statement, and run it again whenever the state it reads changes.

```html
<input v-effect="if (editing) $el.focus()" />
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-effect="statements"` | Run now, then again after every change to what it read |

No argument or modifiers. `$el` is the element the directive sits on.

## Examples

<<< ../.vitepress/demos/v-effect.html{html}

<LiveDemo src="v-effect" />

### Syncing with a non-reactive API

```html
<canvas v-effect="drawChart($el, points)"></canvas>
<div v-effect="document.title = unread ? '(' + unread + ') Inbox' : 'Inbox'"></div>
```

### Reacting to one value

To run code only when a specific value changes, register a
[`$watch`](/magics/watch) instead:

```html
<div v-effect="$watch('query', (q) => search(q))"></div>
```

## Behavior

- The first run happens one tick after mount, so the rest of the region is already bound and `$el` is in the document.
- Re-runs are batched: several changes in one tick cause one run.
- Every reactive value read during the run becomes a dependency, including reads inside functions it calls.
- The effect stops when its region unmounts. A run that throws is reported to [`app.onError()`](/essentials/error-handling) and later runs continue.

## Related

[$watch](/magics/watch) · [watchEffect()](/globals/watch-effect) · [$el](/magics/el)
