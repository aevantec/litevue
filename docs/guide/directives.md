# Directives & Events

litevue supports the core Vue template directives: `{{ }}` interpolation, `v-bind` (`:`), `v-on` (`@`), `v-if` / `v-else-if` / `v-else`, `v-for` (keyed reconciliation included), `v-show`, `v-model` (all input types), `v-text`, `v-html`, `v-pre`, `v-once`, `v-cloak`, and `ref`.

On top of that, litevue adds the following.

## Lifecycle events

Listen to `mounted` and `unmounted` per element (the petite-vue `vue:` prefix still works but is deprecated):

```html
<div
  v-if="show"
  @mounted="console.log('mounted on: ', $el)"
  @unmounted="console.log('unmounted: ', $el)"
></div>
```

## `v-effect`

Run reactive inline statements:

```html
<div v-scope="{ count: 0 }">
  <div v-effect="$el.textContent = count"></div>
  <button @click="count++">++</button>
</div>
```

## `v-teleport`

Move an element under a different parent (a literal CSS selector) while it keeps rendering with its original scope — for modals, dropdowns, and toasts that must escape overflow or z-index contexts. Composes with `v-if`; the element is removed from the target when its owning scope unmounts:

```html
<div id="modals"></div>

<div v-scope="{ open: false }">
  <button @click="open = true">open</button>
  <div v-if="open" v-teleport="#modals">rendered under #modals</div>
</div>
```

## Extra event modifiers

Alongside Vue's standard modifiers (`.stop`, `.prevent`, `.self`, key/mouse filters, `.exact`, `.once`, `.capture`, `.passive`), litevue adds:

- **`.window` / `.document`** — attach the listener to `window`/`document` (cleaned up when the element unmounts):

  ```html
  <div @scroll.window.throttle-100="onScroll"></div>
  ```

- **`.outside`** — fire only for events originating outside the element:

  ```html
  <div v-show="open" @click.outside="open = false">…</div>
  ```

- **`.debounce[-ms]` / `.throttle[-ms]`** — rate-limit the handler (default 250ms). Guards like `.prevent` still run synchronously; only your callback is delayed.

- **Animation event filters** — `.prop-<propertyName>` on transition events and `.name-<animationName>` on animation events, for sequencing multi-property animations declaratively:

  ```html
  <div
    @transitionend.prop-opacity="stage = 'next'"
    @animationend.name-bounce="done()"
  ></div>
  ```

## `v-model` modifiers

Alongside Vue's `.lazy` / `.number` / `.trim`:

- **`.debounce[-ms]`** — rate-limit model writes from input events: `v-model.debounce-300="query"`.
- **`.fill`** — seed empty model state from the input's `value` attribute, handy for server-rendered forms: `<input value="from-server" v-model.fill="name" />`.

## Scope naming with `v-name`

Give a scope an explicit [devtools](./devtools) name when the element shouldn't need an `id`. The attribute is removed from the DOM at mount:

```html
<div v-name="cart" v-scope="{ items: [] }">…</div>
```
