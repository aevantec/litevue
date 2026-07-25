---
title: v-model
---

# v-model <Badge type="section" text="Directive" />

Two-way binding for form elements — text inputs, textareas, checkboxes, radios, and selects (including `multiple`).

<<< ../.vitepress/demos/v-model.html{html}

<LiveDemo src="v-model" />

Non-string values work through `:value` bindings, and checkboxes support `:true-value` / `:false-value`.

## Modifiers

### Vue's standard set

- **`.lazy`** — sync on `change` instead of `input`.
- **`.number`** — cast the value to a number.
- **`.trim`** — trim whitespace.

### litevue additions

- **`.debounce[-ms]`** — rate-limit model writes from input events (default 250ms):

  ```html
  <input v-model.debounce-300="query" />
  ```

- **`.fill`** — seed empty model state from the input's `value` attribute, handy for server-rendered forms:

  ```html
  <input value="from-server" v-model.fill="name" />
  ```

## With v-mask

The [mask plugin](/plugins/mask) formats values before `v-model` sees them.
