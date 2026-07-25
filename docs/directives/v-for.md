# v-for

Renders a list. litevue does real **keyed reconciliation** — with `:key`, reorders move existing DOM nodes instead of rewriting them, preserving element state.

```html
<div v-scope="{ items: [{ id: 1, text: 'a' }, { id: 2, text: 'b' }] }">
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.text }}</li>
  </ul>
  <button @click="items.reverse()">reverse</button>
</div>
```

Index and object forms work too:

```html
<li v-for="(item, index) in items">{{ index }}: {{ item }}</li>
<li v-for="(value, key) in object">{{ key }} = {{ value }}</li>
```

Array mutations (`push`, `splice`, `reverse`, …) and replacement are both reactive.

## Item removal transitions

An item carrying [`v-transition`](/plugins/transition) with no expression animates out before removal — see [unmount mode](/plugins/transition#unmount-mode-v-if-v-for).
