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

- The attribute value is the **literal** storage key (stored as `litevue:<key>`); it falls back to the element's id.
- By default all non-`$`, non-function own properties of the scope are persisted.
- Deep mutations re-save automatically (the snapshot is taken inside a reactive effect).

## Persisting specific properties

Pass an argument to narrow what gets stored — useful when a scope mixes durable state with scratch state that shouldn't outlive the page:

```html
<!-- only `draft` is written to storage -->
<div v-scope="{ draft: '', preview: false }" v-persist:draft="composer">…</div>

<!-- several properties, comma-separated -->
<div v-scope="{ draft: '', to: '', sending: false }" v-persist:draft,to="composer">…</div>
```

Properties left out are neither saved nor restored — they start from whatever the scope declares.

## Persisting a store

Global [stores](/globals/store) have no element to hang a directive on, so the plugin also exports `persistStore()` for JS:

```js
import { store } from 'litevue';
import { persistStore } from 'litevue/plugins';

store('cart', { items: [], coupon: '' });

persistStore('cart'); // restores now, saves on every change
```

Options mirror the directive:

```js
persistStore('cart', { keys: ['items'] }); // only these properties
persistStore('cart', { key: 'v2:cart' }); // custom storage key
```

- Call it **after** registering the store; values are restored immediately, so an `init()` that seeds defaults runs first and is then overwritten by anything saved.
- It returns a function that **stops persisting**:

  ```js
  const stopPersisting = persistStore('cart');
  stopPersisting();
  ```

- Writes are batched through the scheduler, so a burst of mutations in one tick produces a single write.

::: tip Getters and methods are skipped
Methods aren't state, and getter-only properties (like `get count()`) are derived — they can't be assigned back on restore. Both are ignored automatically, including when you name them explicitly in `keys`.
:::
