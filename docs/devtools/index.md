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

## Quick setup

```html
<!-- script tag: load the panel after the library -->
<script src="https://unpkg.com/litevue" defer init></script>
<script
  src="https://unpkg.com/litevue/dist/litevue-devtools.iife.js"
  defer
></script>
```

```js
// npm: a dev-only side-effect import
if (import.meta.env.DEV) {
  await import('litevue/devtools');
}
```

See the [inspector panel](/devtools/panel) for the full setup, and [disabling in production](/globals/devtools#disabling-in-production) for shipping without any devtools surface.
