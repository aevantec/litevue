# v-model

Two-way binding for form elements — text inputs, textareas, checkboxes, radios, and selects (including `multiple`).

```html
<div v-scope="{ msg: '', agreed: false, pick: 'a' }">
  <input v-model="msg" />
  <input type="checkbox" v-model="agreed" />
  <select v-model="pick">
    <option>a</option>
    <option>b</option>
  </select>
</div>
```

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
