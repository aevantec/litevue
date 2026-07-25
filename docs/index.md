---
layout: home

hero:
  name: litevue
  text: Vue's template syntax in ~8kb
  tagline: A petite-vue fork for progressive enhancement — now with devtools, transitions, plugins, and a global store.
  image:
    src: /logo.png
    alt: litevue
  actions:
    - theme: brand
      text: Start Here
      link: /start-here/introduction
    - theme: alt
      text: Coming from Alpine?
      link: /migration/from-alpine
    - theme: alt
      text: GitHub
      link: https://github.com/abiacarl/litevue

features:
  - title: Vue-compatible syntax
    details:
      The same template syntax and reactivity mental model as Vue, driven by
      the real @vue/reactivity — interpolation, v-if/v-for with keyed
      reconciliation, v-model, and more.
  - title: Tiny and dependency-light
    details:
      ~8kb gzipped core. Plugins (~2kb for all of them) and devtools (~4kb)
      ship as separate opt-in bundles that add zero weight to the core.
  - title: Built-in devtools
    details:
      An in-page inspector panel with live state editing, a stores tab, pick
      mode and themes — plus a browser-extension variant. One line disables
      everything for production.
  - title: Transitions that work with v-if
    details:
      Vue-style enter/leave classes on show/hide, plus an unmount mode that
      delays DOM removal until the leave animation finishes.
  - title: Plugin system
    details:
      app.use() with typed plugins. First-party — intersect, persist, focus
      (+trap), collapse, transition, mask.
  - title: Safe with dynamic content
    details:
      Injected markup stays inert until you explicitly initialize it — HTML
      injection can never become expression execution.
---

## Quick start

Drop it on any server-rendered page:

```html
<script src="https://unpkg.com/litevue" defer init></script>

<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

Or install it:

```sh
npm install litevue
```

```js
import { createApp } from 'litevue';

createApp({ count: 0 }).mount();
```

Head to [Installation](/start-here/installation) for the rest.
