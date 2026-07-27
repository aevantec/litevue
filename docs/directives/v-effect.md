---
title: v-effect
---

# v-effect <Badge type="section" text="Directive" />

Runs a **reactive** inline statement — it re-executes whenever the reactive state it reads changes:

<<< ../.vitepress/demos/v-effect.html{html}

<LiveDemo src="v-effect" />

A classic use: replicating Vue's TodoMVC `todo-focus` behavior:

```html
<input v-effect="if (todo === editedTodo) $el.focus()" />
```
