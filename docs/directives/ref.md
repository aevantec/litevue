# ref

Registers the element on the scope's [`$refs`](/magics/refs) object:

```html
<div v-scope="{}">
  <input ref="field" />
  <button @click="$refs.field.focus()">focus the input</button>
</div>
```

Refs are scoped: nested `v-scope`s get their own `$refs` that inherit from the parent's. For a dynamic ref name, use the [`:ref` binding](/directives/v-bind#ref-binding).
