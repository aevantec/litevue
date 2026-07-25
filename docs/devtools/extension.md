---
title: Browser Extension
---

# Browser Extension <Badge type="section" text="Devtools" />

A devtools-tab variant of the inspector for Chrome and Firefox lives in the repo's [`extension/`](https://github.com/abiacarl/litevue/tree/main/extension) directory.

## How it works

The panel reads the page's `window.__LITE_VUE__` registry through `chrome.devtools.inspectedWindow.eval`, which runs in the page world — so no content script or messaging bridge is required, and the extension page stays free of `eval` (MV3 CSP applies to the extension, not the inspected page). v1 polls a JSON-safe snapshot every 500ms.

## Load it

- **Chrome**: `chrome://extensions` → enable Developer mode → "Load unpacked" → select the `extension/` directory. Open devtools on a page using LiteVue → **lite-vue** tab.
- **Firefox** (115+): `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → select `manifest.json`.

## Limitations (v1)

- Polling, not event-driven (500ms refresh).
- Edits are limited to top-level primitive values — the [in-page panel](/devtools/panel) is the richer tool for deep editing.
- Requires the page's devtools registry: [`disableDevtools()`](/globals/devtools#disabling-in-production) hides everything, by design.
