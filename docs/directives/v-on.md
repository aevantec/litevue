---
title: v-on
---

# v-on <Badge type="section" text="Directive" />

Listen to a DOM event and run an expression or method.

```html
<button @click="count++">Add</button>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-on:event="handler"` | Listen for `event` on the element |
| `@event="handler"` | Shorthand for the above |
| `@event.modifier="handler"` | Modifiers chain after the event name, in either form |

The handler can be:

| Handler | Example | Receives the event as |
| --- | --- | --- |
| Method name | `@click="save"` | The first argument |
| Expression | `@click="count++"` | `$event` |
| Call | `@click="select(item, $event)"` | Whatever you pass |
| Statements | `@click="a++; b++"` | `$event` |

### Event modifiers

| Modifier | Meaning |
| --- | --- |
| `.prevent` | Call `event.preventDefault()` |
| `.stop` | Call `event.stopPropagation()` |
| `.self` | Only when the event started on this element, not a child |
| `.once` | Remove the listener after the first call |
| `.capture` | Listen in the capture phase |
| `.passive` | Mark the listener passive |

### Key and mouse modifiers

| Modifier | Meaning |
| --- | --- |
| `.enter`, `.escape`, `.tab`, `.arrow-down`, … | Only for that key — any `event.key`, in kebab-case |
| `.ctrl`, `.shift`, `.alt`, `.meta` | Only while that key is held |
| `.exact` | Only when no other system key is held |
| `.left`, `.middle`, `.right` | Only for that mouse button; `@click.right` listens for `contextmenu` |

### LiteVue modifiers

| Modifier | Meaning |
| --- | --- |
| `.window` / `.document` | Listen on `window` or `document` instead of the element |
| `.outside` | Only for events that start outside the element |
| `.debounce` / `.debounce-<ms>` | Run once input pauses; default 250ms |
| `.throttle` / `.throttle-<ms>` | Run at most once per interval; default 250ms |
| `.prop-<name>` | On `transitionend` and similar, only for that CSS property |
| `.name-<name>` | On `animationend` and similar, only for that animation |

## Examples

<<< ../.vitepress/demos/v-on.html{html}

<LiveDemo src="v-on" />

### Forms and keys

```html
<form @submit.prevent="send()">…</form>
<input @keyup.enter="search()" @keydown.escape="query = ''" />
<button @click.ctrl.exact="selectOne(item)">…</button>
```

### Dropdowns and global shortcuts

`.outside` closes a menu on any click elsewhere. `.window` and `.document` are
removed automatically when the element unmounts.

```html
<div v-show="open" @click.outside="open = false">…</div>
<div @keydown.escape.document="close()"></div>
<div @scroll.window.throttle-100="onScroll"></div>
```

### Rate limiting

Only the handler is delayed. Guards such as `.prevent` still act on the event
immediately.

```html
<input @input.debounce-300="search($event.target.value)" />
```

### Sequencing animations

```html
<div
  @transitionend.prop-opacity="stage = 'next'"
  @animationend.name-bounce="done()"
></div>
```

### Async handlers

Return the promise and a rejection is reported to
[`app.onError()`](/essentials/error-handling#app-onerror):

```html
<button @click="save()">Save</button>
```

## Behavior

- Key modifiers have no aliases. Write `.escape`, not `.esc`, and `.arrow-up`, not `.up`. The space bar cannot be written as a modifier; use `@keyup="$event.key === ' ' && toggle()"`.
- `@mounted` and `@unmounted` are lifecycle hooks, not DOM events — see [Lifecycle](/essentials/lifecycle).
- Listeners, including `.window` and `.document` ones, are removed when their region unmounts. A pending `.debounce` is cancelled.
- A handler that throws is reported and does not stop later events.
- The object form `v-on="{ click: handler }"` is not supported.

## Related

[Lifecycle](/essentials/lifecycle) · [v-model](/directives/v-model) · [$dispatch](/magics/dispatch) · [Error handling](/essentials/error-handling)
