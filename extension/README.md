# lite-vue devtools extension

A devtools-tab version of the in-page inspector. Shows every mounted scope
and global store of a page running litevue, with inline editing of top-level
primitive values.

## How it works

The panel reads the page's `window.__LITE_VUE__` registry through
`chrome.devtools.inspectedWindow.eval`, which runs in the page world — so no
content script or messaging bridge is required, and the extension page stays
free of `eval` (MV3 CSP applies to the extension, not the inspected page).
v1 polls a JSON-safe snapshot every 500ms.

## Load it

- **Chrome**: `chrome://extensions` → enable Developer mode → "Load
  unpacked" → select this `extension/` directory. Open devtools on a page
  using litevue → "lite-vue" tab.
- **Firefox** (115+): `about:debugging#/runtime/this-firefox` → "Load
  Temporary Add-on…" → select `manifest.json`.

## Limitations (v1)

- Polling, not event-driven; 500ms refresh.
- Edits are limited to top-level primitive values (the in-page panel
  supports the full nested tree — prefer it for deep editing).
- Scopes are identified by registry order between polls.
- Requires the page's devtools registry (`disableDevtools()` or
  `__LITE_VUE_DEVTOOLS__ = false` hides everything, by design).
