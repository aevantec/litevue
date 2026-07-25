# Installation

`litevue` is a fork of [petite-vue](https://github.com/vuejs/petite-vue) by Evan You — an alternative distribution of [Vue](https://vuejs.org) optimized for progressive enhancement: sprinkling interactivity onto server-rendered HTML. Same template syntax, same reactivity mental model, ~8kb.

## From a CDN

No build step required:

```html
<script src="https://unpkg.com/litevue" defer init></script>

<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

- [`v-scope`](/directives/v-scope) marks regions controlled by litevue and declares their state.
- `defer` makes the script run after the HTML is parsed.
- `init` auto-mounts every `v-scope` region on the page.

For production, pin a version and use a fully resolved URL:

- Global build: `https://unpkg.com/litevue@0.5.0/dist/lite-vue.iife.js` — exposes the `LiteVue` global, supports the `init` attribute.
- ESM build: `https://unpkg.com/litevue@0.5.0/dist/lite-vue.es.js` — use with `<script type="module">`.

## From npm

```sh
npm install litevue
```

```js
import { createApp } from 'litevue';

createApp().mount();
```

## Manual init

Remove the `init` attribute to control mounting yourself — required when you use [plugins](/plugins/):

```html
<script src="https://unpkg.com/litevue"></script>
<script>
  LiteVue.createApp().mount();
</script>
```

## Next steps

- Declare state with [v-scope](/directives/v-scope) and [createApp](/globals/create-app)
- Learn the [templating basics](/essentials/templating)
- Coming from another library? [petite-vue](/migration/from-petite-vue) · [Alpine](/migration/from-alpine)
