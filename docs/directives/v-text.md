# v-text

Sets the element's `textContent` from an expression — equivalent to mustache interpolation filling the whole element:

```html
<div v-scope="{ msg: 'hello' }">
  <span v-text="msg"></span>
  <!-- same as: <span>{{ msg }}</span> -->
</div>
```

Useful when interpolation braces would flash before mount (see [v-cloak](/directives/v-cloak)) or conflict with a server templating language (see [custom delimiters](/essentials/templating#custom-delimiters)).
