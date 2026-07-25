# $id

Unique ids for accessibility attributes. Ids are **stable within a scope** — repeated calls with the same name return the same id, so label/input pairs match — and **unique across scopes**:

```html
<div v-scope="{}">
  <label :for="$id('email')">Email</label>
  <input :id="$id('email')" />
</div>

<div v-scope="{}">
  <!-- a different id than the scope above -->
  <input :id="$id('email')" />
</div>
```

The Alpine equivalent is `x-id` / `$id`.
