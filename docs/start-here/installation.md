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

- Global build: `https://unpkg.com/@aevantec/litevue@0.5.6/dist/litevue.iife.js` <!-- x-release-please-version --> — exposes the `LiteVue` global, supports the `init` attribute.
- ESM build: `https://unpkg.com/@aevantec/litevue@0.5.6/dist/litevue.mjs` <!-- x-release-please-version --> — use with `<script type="module">`.

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

## Development builds

LiteVue's [development warnings](/devtools/warnings) and its
["did you mean"](/essentials/error-handling#in-development) diagnostics live in
separate development files, so the production files never carry them.

**From npm, nothing to configure.** The package maps its development files
under the `development` export condition. Vite and webpack 5 resolve it while
you develop, and switch to the production files when you build for production.
Vitest runs get the development build too.

For a tool that does not set the condition, pass it explicitly — esbuild's
`--conditions=development`, or `node --conditions=development`.

**From a CDN**, load the `.dev` file while you develop:

- Global build: `https://unpkg.com/@aevantec/litevue@0.5.6/dist/litevue.dev.iife.js` <!-- x-release-please-version -->
- ESM build: `https://unpkg.com/@aevantec/litevue@0.5.6/dist/litevue.dev.mjs` <!-- x-release-please-version -->

::: warning Never ship a .dev file
Development files are unminified and about twice the size of the production
build, gzipped. Switch back to `litevue.iife.js` or `litevue.mjs` before you deploy.
:::

Plugins with development checks — media, morph and persist, and the combined
plugins bundle — ship `.dev` files the same way. See
[Installing plugins](/plugins/installation#development-builds).

## Manual init

Remove the `init` attribute to control mounting yourself — required when you use [plugins](/plugins/), since `init` mounts before your `use()` calls have run:

```html
<script src="https://unpkg.com/@aevantec/litevue"></script>
<script>
  LiteVue.createApp().mount();
</script>
```

## Adding plugins

Plugins are installed separately from the core and each one can be loaded on its own, by npm subpath or by a single `<script>` tag. See **[Installing Plugins](/plugins/installation)** for every method, the global names, and the load-order rules.

::: warning Mount explicitly on pages with user-generated HTML
The `init` attribute and a bare `createApp().mount()` crawl the entire document. If any part of the page renders user-submitted HTML, pass an explicit target so LiteVue only processes markup you control — see [Security](/start-here/security).
:::

## Next steps

- Declare state with [v-scope](/directives/v-scope) and [createApp](/globals/create-app)
- Learn the [templating basics](/essentials/templating)
- Add capabilities with [plugins](/plugins/installation)
- Coming from another library? [petite-vue](/migration/from-petite-vue) · [Alpine](/migration/from-alpine)
