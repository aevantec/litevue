# v-once

Renders the element once and never updates it again, even when the state it read changes — an optimization for static-after-first-render content:

```html
<div v-scope="{ n: 0 }">
  <span v-once>initial: {{ n }}</span>
  <span>current: {{ n }}</span>
  <button @click="n++">++</button>
</div>
```
