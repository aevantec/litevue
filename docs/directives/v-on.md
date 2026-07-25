---
title: v-on
---

# v-on <Badge type="section" text="Directive" />

Attaches an event listener. Shorthand: `@`.

```html
<button @click="count++">inc</button>
<button @click="handle">method reference</button>
<input @keyup.enter="submit" />
```

The event object is available as `$event`; method references receive it as their argument.

## Standard modifiers

`.stop`, `.prevent`, `.self`, `.exact`, key filters (`.enter`, `.escape`, …), mouse buttons (`.left`, `.middle`, `.right`), system keys (`.ctrl`, `.shift`, `.alt`, `.meta`), and the listener options `.once`, `.capture`, `.passive`.

## litevue extras

### `.window` / `.document`

Attach the listener to `window` or `document` instead of the element — cleaned up automatically when the element unmounts:

```html
<div @scroll.window.throttle-100="onScroll"></div>
<div @keydown.escape.document="close"></div>
```

### `.outside`

Fire only for events originating outside the element — dropdowns and modals in one attribute:

```html
<div v-show="open" @click.outside="open = false">…</div>
```

### `.debounce[-ms]` / `.throttle[-ms]`

Rate-limit the handler (default 250ms). Guards like `.prevent` still run synchronously — only your callback is delayed:

```html
<input @input.debounce-300="search" />
```

### Animation event filters

`.prop-<propertyName>` on transition events and `.name-<animationName>` on animation events, for sequencing multi-step animations without boilerplate:

```html
<div
  @transitionend.prop-opacity="stage = 'next'"
  @animationend.name-bounce="done()"
></div>
```

## Lifecycle events

`@mounted` and `@unmounted` are special — see [Lifecycle](/essentials/lifecycle).
