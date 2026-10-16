---
title: popover
---

# popover <Badge type="section" text="Plugin" />

Menus, dropdowns and tooltips built on the browser's own [Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API), positioned against a trigger with CSS anchor positioning. `v-popover` keeps a popover and your state in step. `v-anchor` places an element next to another one.

```js
import { popover } from '@aevantec/litevue/plugins/popover';
createApp().use(popover).mount();
```

The plugin ships on its own (~1kb<!-- size:dist/plugins/popover.iife.js --> gzipped) and is not part of the combined plugins bundle. From a CDN, load `dist/plugins/popover.iife.js` after the core; it defines `LiteVuePopover`.

## Syntax

| Form | Meaning |
| --- | --- |
| `v-popover="expression"` | Shows the popover while truthy. Closing it natively, with Escape or a click outside, sets the expression to `false` |
| `v-anchor.<placement>="element"` | Positions this element against `element`, usually a [`$refs`](/magics/refs) entry |

### Placements

`top`, `bottom` and `left`, `right`, each optionally followed by `-start` or `-end`: `bottom-start` sits below the anchor, aligned to its left edge. The default is `bottom`, centred.

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.offset-<px>` | Gap between the anchor and the element. Default 0 |

## Examples

### Menu

```html
<div v-scope="{ open: false }">
  <button ref="trigger" @click="open = !open">Account</button>
  <nav v-popover="open" v-anchor.bottom-start.offset-4="$refs.trigger">
    <a href="/profile">Profile</a>
    <a href="/settings">Settings</a>
  </nav>
</div>
```

Escape, a click outside and a second click on the trigger all close the menu, and `open` follows. Focus returns to the trigger when the menu closes.

### Tooltip

```html
<span v-scope="{ tip: false }">
  <button ref="help" @mouseenter="tip = true" @mouseleave="tip = false">?</button>
  <span popover="manual" v-popover="tip" v-anchor.top.offset-6="$refs.help">
    Saved drafts expire after 30 days.
  </span>
</span>
```

`popover="manual"` keeps the tooltip from closing a menu that is already open, and from closing on a click elsewhere.

### Without state

The browser's own `popovertarget` toggles a popover with no expression at all. `v-anchor` still positions it:

```html
<div v-scope>
  <button ref="more" popovertarget="more-menu">More</button>
  <div id="more-menu" popover v-anchor.bottom-end="$refs.more">…</div>
</div>
```

## Behavior

- `v-popover` adds the `popover` attribute if the element has none, as `popover="auto"`. An auto popover closes others that are open, and closes on Escape or a click outside it.
- The popover opens in the top layer, above everything else on the page, so no `z-index` is needed.
- `v-anchor` flips to the opposite side when there is no room, keeping the offset. It does not slide along the edge to stay on screen.
- Where CSS anchor positioning is not supported, a small script places the element instead, and re-places it on scroll and resize while it is open.
- `v-anchor` sets `position: fixed` and clears the popover's default centring. On unmount, the element gets back the inline styles it had before, and the anchor loses its `anchor-name`.
- Popovers are not modal. For a dialog that must keep focus inside, use `<dialog>` or [`v-trap`](/plugins/focus).

## Coming from Alpine

`v-anchor` follows Alpine's `x-anchor`: the same placements, and the reference element as the value. Alpine's `.offset.10` is `.offset-10` here, matching LiteVue's other modifiers. Alpine positions with Floating UI; LiteVue uses CSS anchor positioning with a small fallback, and has no `.no-style` form or `$anchor` magic. Alpine has no equivalent of `v-popover`.

## Related

[focus](/plugins/focus) · [transition](/plugins/transition) · [$refs](/magics/refs) · [Installation](/plugins/installation)
