---
title: v-effect
---

# v-effect <Badge type="directive" text="Directive" />

Runs a **reactive** inline statement — it re-executes whenever the reactive state it reads changes:

```html
<div v-scope="{ count: 0 }">
  <div v-effect="$el.textContent = count"></div>
  <button @click="count++">++</button>
</div>
```

A classic use: replicating Vue's TodoMVC `todo-focus` behavior:

```html
<input v-effect="if (todo === editedTodo) $el.focus()" />
```
