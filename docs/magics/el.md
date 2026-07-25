# $el

The current element, available in every expression:

```html
<button @click="$el.classList.add('clicked')">me</button>
<div v-effect="$el.textContent = count"></div>
```
