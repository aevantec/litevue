---
title: Devtools
---

# Devtools <Badge type="section" text="Devtools" />

LiteVue ships inspection tooling in the box, built on the public [Devtools API](/globals/devtools) — and a single line [disables it all in production](/globals/devtools#disabling-in-production).

| Tool                                     | What it is                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| [Inspector Panel](/devtools/panel)       | in-page panel: scope/store tabs, live state tree editing, pick mode, themes |
| [Browser Extension](/devtools/extension) | Chrome/Firefox devtools tab reading the same registry                       |
| [Devtools API](/globals/devtools)        | `__LITE_VUE__` console access, registry events, production kill-switch      |
| [Development Warnings](/devtools/warnings) | console warnings for mistakes that otherwise fail silently                |

## Quick setup

```html
<!-- script tag: load the panel after the library -->
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>
<script
  src="https://unpkg.com/@aevantec/litevue/dist/litevue-devtools.iife.js"
  defer
></script>
```

```js
// npm: a dev-only side-effect import
if (import.meta.env.DEV) {
  await import('@aevantec/litevue/devtools');
}
```

`import.meta.env.DEV` is Vite's flag. On webpack, Rollup, or Node, guard with `process.env.NODE_ENV !== 'production'` instead — the point is that the import stays inside a condition your bundler can resolve at build time, so the panel never reaches the production bundle.

See the [inspector panel](/devtools/panel) for the full setup, and [disabling in production](/globals/devtools#disabling-in-production) for shipping without any devtools surface.
