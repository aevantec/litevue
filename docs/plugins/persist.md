---
title: persist
---

# persist <Badge type="section" text="Plugin" />

`v-persist="storage-key"` syncs the element's scope to localStorage: saved values restore on mount, and every change — deep ones included — writes back automatically.

```js
import { persist } from 'litevue/plugins';
createApp().use(persist).mount();
```

<<< ../.vitepress/demos/persist.html{html}

<LiveDemo src="persist" plugins="persist" />

- The attribute value is the **literal** storage key (stored as `lite-vue:<key>`); it falls back to the element's id.
- All non-`$`, non-function own properties of the scope are persisted.
- Deep mutations re-save automatically (the snapshot is taken inside a reactive effect).
