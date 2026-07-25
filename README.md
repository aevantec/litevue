# lite-vue

`lite-vue` is a fork of [petite-vue](https://github.com/vuejs/petite-vue) by Evan You — an alternative distribution of [Vue](https://vuejs.org) optimized for progressive enhancement: sprinkling interactivity onto server-rendered HTML with the same template syntax and reactivity mental model as standard Vue.

Published on npm as **`litevue`** (the hyphenated name was already taken).

- **~8kb** gzipped core, driven by the real `@vue/reactivity`
- Vue-compatible syntax: `{{ }}`, `v-if`/`v-for` (keyed), `v-model`, `v-show`, …
- **Built-in devtools** — in-page inspector panel + browser extension, one line to disable in production
- **Transitions** that work with `v-show` *and* `v-if` (deferred unmount)
- **Plugin system** with first-party plugins: intersect, persist, focus (+trap), collapse, transition, mask
- **Global store** (`store()` / `$store`) and magic properties (`$dispatch`, `$watch`, `$id`, `$root`, …)
- Extra event modifiers: `.outside`, `.window`, `.debounce`, `.throttle`, animation-event filters
- Safe with dynamic content: injected markup stays inert until explicitly mounted

## Quick start

```html
<script src="https://unpkg.com/litevue" defer init></script>

<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

Or with a bundler:

```sh
npm install litevue
```

```js
import { createApp } from 'litevue';

createApp({ count: 0 }).mount();
```

## Documentation

Full documentation lives in the **[docs site](https://abiacarl.github.io/litevue/)** (source in [`docs/`](docs/), `pnpm docs:dev` to run locally):

- [Getting Started](https://abiacarl.github.io/litevue/guide/getting-started) — install, root scope, setup functions, components, dynamic content
- [Directives & Events](https://abiacarl.github.io/litevue/guide/directives) — lifecycle hooks, `v-teleport`, event and `v-model` modifiers
- [Store & Magic Properties](https://abiacarl.github.io/litevue/guide/store-and-magics)
- [Plugins](https://abiacarl.github.io/litevue/guide/plugins) — the plugin system and all first-party plugins
- [Devtools](https://abiacarl.github.io/litevue/guide/devtools) — panel, extension, production kill-switch
- [Migrating from petite-vue](https://abiacarl.github.io/litevue/guide/migrating-from-petite-vue) · [Coming from Alpine](https://abiacarl.github.io/litevue/guide/coming-from-alpine)

## Development

```sh
pnpm install
pnpm dev        # test pages at localhost:3000
pnpm test       # vitest suite
pnpm build      # core + devtools + plugins bundles
pnpm docs:dev   # documentation site
```

See [CHANGELOG.md](CHANGELOG.md) for the fork's history.

## Status

`lite-vue` continues from petite-vue 0.4.1, which is no longer actively maintained upstream. It aims to stay aligned with standard Vue behavior so code can graduate to Vue with minimal friction.

## License

MIT. Original petite-vue by Evan You; fork additions by the lite-vue contributors.
