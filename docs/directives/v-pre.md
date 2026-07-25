# v-pre

Skips compilation for the element and all of its children — interpolation and directives inside are left untouched:

```html
<div v-scope="{ n: 1 }">
  <span v-pre>{{ n }} renders literally</span>
</div>
```

The Alpine equivalent is `x-ignore`.
