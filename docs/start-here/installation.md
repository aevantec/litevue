---
title: Installation
---

# Installation <Badge type="section" text="Start Here" />

Getting LiteVue onto a page. For what it is, how it compares to Vue and Alpine, and the security/CSP constraints, read the [Introduction](/start-here/introduction) first.

## From a CDN

No build step required:

```html
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>

<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

- [`v-scope`](/directives/v-scope) marks regions controlled by LiteVue and declares their state.
- `defer` makes the script run after the HTML is parsed.
- `init` auto-mounts every `v-scope` region on the page.

For production, pin a version and use a fully resolved URL:

- Global build: `https://unpkg.com/@aevantec/litevue@0.5.3/dist/litevue.iife.js` <!-- x-release-please-version --> — exposes the `LiteVue` global, supports the `init` attribute.
- ESM build: `https://unpkg.com/@aevantec/litevue@0.5.3/dist/litevue.mjs` <!-- x-release-please-version --> — use with `<script type="module">`.

## From npm

The package is scoped — the unscoped `litevue` name is blocked on npm by an
unrelated `lite-vue` package. Only the install and import specifiers carry the
scope; the global stays `LiteVue`, and the subpaths are
`@aevantec/litevue/plugins` and `@aevantec/litevue/devtools`.

::: code-group

```sh [npm]
npm install @aevantec/litevue
```

```sh [pnpm]
pnpm add @aevantec/litevue
```

```sh [yarn]
yarn add @aevantec/litevue
```

```sh [bun]
bun add @aevantec/litevue
```

:::

```js
import { createApp } from '@aevantec/litevue';

createApp().mount();
```

## Manual init

Remove the `init` attribute to control mounting yourself — required when you use [plugins](/plugins/):

```html
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script>
  LiteVue.createApp().mount();
</script>
```

::: warning Mount explicitly on pages with user-generated HTML
The `init` attribute and a bare `createApp().mount()` crawl the entire document. If any part of the page renders user-submitted HTML, pass an explicit target so LiteVue only processes markup you control — see [Security and CSP](/start-here/introduction#security-and-csp).
:::

## Next steps

- Declare state with [v-scope](/directives/v-scope) and [createApp](/globals/create-app)
- Learn the [templating basics](/essentials/templating)
- Coming from another library? [petite-vue](/migration/from-petite-vue) · [Alpine](/migration/from-alpine)
