# Inspector Panel

A standalone in-page inspector ships as a separate bundle (`dist/lite-vue-devtools.iife.js`, ~4kb gzipped) — zero weight added to the core. Load it after the library, during development only:

```html
<script src="https://unpkg.com/litevue" defer init></script>
<script src="https://unpkg.com/litevue/dist/lite-vue-devtools.iife.js" defer></script>
```

A `⚡ lite-vue` pill appears bottom-right and expands into the panel:

- **Elements / Stores** tabs with live counts — scopes labeled as tags (`v-name` → id → tag name, e.g. `<cart>`)
- a name **filter** (case-insensitive; Escape clears)
- a state view separating own from inherited state; arrays and objects render as an **expandable tree**; every primitive leaf edits inline with type coercion, booleans get checkboxes, getter-only props are read-only
- an **add-key row** and per-row ✕ delete for top-level keys
- hover-to-highlight, plus a **pick mode** — click any element on the page to select its scope
- dark / light / system **themes**; the selected scope is exposed as `window.$scope`
- the panel **drags** by its header, **resizes** via the native grip, and remembers its open state, position and size

Everything the panel shows comes from the public [Devtools API](/globals/devtools) — and one line [disables it all in production](/globals/devtools#disabling-in-production).
