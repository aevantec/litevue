---
title: Browser Extension
---

# Browser Extension <Badge type="section" text="Devtools" />

A version of the inspector that lives in the browser's own devtools, for Chrome
and Firefox. Use it when you would rather inspect state beside the Elements and
Console tabs than in a panel on the page. It is in the repository's
[`extension/`](https://github.com/aevantec/litevue/tree/main/extension)
directory and is loaded unpacked.

## Install it

- **Chrome:** open `chrome://extensions`, enable Developer mode, choose "Load
  unpacked" and select the `extension/` directory. Open devtools on a page using
  LiteVue and choose the **LiteVue** tab.
- **Firefox 115 or later:** open `about:debugging#/runtime/this-firefox`, choose
  "Load Temporary Add-on…" and select `extension/manifest.json`.

## How it reads the page

The extension reads the page's `window.__LITE_VUE__` registry through
`chrome.devtools.inspectedWindow.eval`, which runs in the page's own world. No
content script or messaging bridge is needed, and the extension page itself
never calls `eval`, so it stays within the Manifest V3 security policy. It polls
a JSON-safe snapshot of the registry every 500ms.

## Limitations

- It polls rather than listening for changes, so updates appear within 500ms.
- It edits top-level primitive values only. The
  [Inspector Panel](/devtools/panel) edits nested state.
- It needs the page's devtools registry, so
  [`disableDevtools()`](/globals/devtools#disabling-in-production) hides
  everything from it, by design.

## Next

Use the registry directly from the console with the [Devtools API](/globals/devtools).
