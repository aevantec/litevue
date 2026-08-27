---
title: v-on
---

# v-on <Badge type="section" text="Directive" />

Attaches an event listener.

## Syntax

`v-on:` is the full form and `@` is its shorthand. They compile to the same
thing, and modifiers attach to either:

```html
<!-- these pairs are identical -->
<button v-on:click="save()">Save</button>
<button @click="save()">Save</button>

<form v-on:submit.prevent="send()">…</form>
<form @submit.prevent="send()">…</form>

<input v-on:keyup.enter="search()" />
<input @keyup.enter="search()" />
```

The examples below use the shorthand, which is the more common spelling.

<<< ../.vitepress/demos/v-on.html{html}

<LiveDemo src="v-on" />

The event object is available as `$event`; method references receive it as their argument.

## Standard modifiers

`.stop`, `.prevent`, `.self`, `.exact`, key filters (`.enter`, `.escape`, …), mouse buttons (`.left`, `.middle`, `.right`), system keys (`.ctrl`, `.shift`, `.alt`, `.meta`), and the listener options `.once`, `.capture`, `.passive`.

## LiteVue extras

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
