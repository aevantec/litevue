---
title: Devtools
---

# Devtools <Badge type="section" text="Devtools" />

LiteVue ships its own inspection tooling, for anyone debugging state on a page
while they develop. Every tool reads the same public
[Devtools API](/globals/devtools), and one line
[disables it all in production](/globals/devtools#disabling-in-production).

## Choose a tool

| Tool | Use it to |
| --- | --- |
| [Inspector Panel](/devtools/panel) | Browse scopes and stores in the page, search and edit state, pick a scope by clicking its element, and see installed plugins |
| [Browser Extension](/devtools/extension) | Inspect the same state from a tab in the browser's own devtools |
| [Devtools API](/globals/devtools) | Read scopes from the console through `__LITE_VUE__`, listen to registry events, and switch the registry off |
| [Development Warnings](/devtools/warnings) | See console warnings for mistakes that would otherwise fail silently |

## Add the panel in one step

Load the panel after the library, and only while you develop:

```html
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>
<script
  src="https://unpkg.com/@aevantec/litevue/dist/litevue-devtools.iife.js"
  defer
></script>
```

From npm, import it behind a development check so it never reaches the
production bundle:

```js
if (import.meta.env.DEV) {
  await import('@aevantec/litevue/devtools');
}
```

`import.meta.env.DEV` is Vite's flag. On webpack, Rollup or Node, guard with
`process.env.NODE_ENV !== 'production'` instead. Either way, the condition must
be one your bundler resolves at build time.

The development warnings need no setup: the npm package and the `.dev` CDN files
include them. See [Development builds](/start-here/installation#development-builds).

## Next

Learn what the [Inspector Panel](/devtools/panel) shows and how to use it.
