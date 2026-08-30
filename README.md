# litevue

`litevue` is a fork of [petite-vue](https://github.com/vuejs/petite-vue) by Evan You — an alternative distribution of [Vue](https://vuejs.org) optimized for progressive enhancement: sprinkling interactivity onto server-rendered HTML with the same template syntax and reactivity mental model as standard Vue.

Published on npm as **[`@aevantec/litevue`](https://www.npmjs.com/package/@aevantec/litevue)** — the
unscoped name is blocked by an unrelated `lite-vue` package. The IIFE/UMD global
stays `LiteVue`.

- **~9kb**<!-- size:dist/litevue.iife.js --> gzipped core, driven by the real `@vue/reactivity`
- Vue-compatible syntax: `{{ }}`, `v-if`/`v-for` (keyed), `v-model`, `v-show`, …
- **Built-in devtools** — in-page inspector panel + browser extension, one line to disable in production
- **Transitions** that work with `v-show` *and* `v-if` (deferred unmount)
- **Plugin system** with nine first-party plugins: intersect, persist, focus (+trap), collapse, transition, mask, morph, media, resize
- **Components** registered by name with `app.component()`, usable from `v-scope`
- **Global store** (`store()` / `$store`) and magic properties (`$dispatch`, `$watch`, `$id`, `$root`, …)
- **Cached derived state** with `computed()`, alongside `reactive()` and `watchEffect()`
- Extra event modifiers: `.outside`, `.window`, `.debounce`, `.throttle`, animation-event filters
- Safe with dynamic content: injected markup stays inert until explicitly mounted, and `morph` updates a server-rendered region in place without losing scope state, focus or scroll

## Quick start

```html
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>

<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

Or with a bundler:

```sh
npm install @aevantec/litevue
```

```js
import { createApp } from '@aevantec/litevue';

createApp({ count: 0 }).mount();
```

## Documentation

Full documentation lives in the **[docs site](https://litevue.dev/)** (source in [`docs/`](docs/), `pnpm docs:dev` to run locally):

- [Introduction](https://litevue.dev/start-here/introduction) — what it is, Vue compatibility, limitations, security and CSP
- [Installation](https://litevue.dev/start-here/installation) — CDN, npm, and mount options
- [Essentials](https://litevue.dev/essentials/) — state, templating, components, lifecycle, dynamic content
- [Directives](https://litevue.dev/directives/) — a page per directive, with live demos
- [Magics](https://litevue.dev/magics/) — `$el`, `$store`, `$dispatch`, `$watch`, `$id`, …
- [Globals](https://litevue.dev/globals/) — `createApp()`, `store()`, `computed()`, `watchEffect()`, the devtools API
- [Plugins](https://litevue.dev/plugins/) — the plugin system and all first-party plugins
- [Devtools](https://litevue.dev/devtools/) — inspector panel, browser extension, production kill-switch
- [Migrating from petite-vue](https://litevue.dev/migration/from-petite-vue) · [Coming from Alpine](https://litevue.dev/migration/from-alpine)

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

`litevue` continues from petite-vue 0.4.1, which is no longer actively maintained upstream. It aims to stay aligned with standard Vue behavior so code can graduate to Vue with minimal friction.

## License

MIT. Original petite-vue by Evan You; fork additions by the litevue contributors.
