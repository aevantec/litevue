---
title: persist
---

# persist <Badge type="section" text="Plugin" />

`v-persist="storage-key"` syncs the element's scope to storage: saved values restore on mount, and every change — deep ones included — writes back automatically. It writes to `localStorage` unless you [choose another storage](#choosing-a-storage).

```js
import { persist } from '@aevantec/litevue/plugins';
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
<div
  v-scope="{ draft: '', to: '', sending: false }"
  v-persist:draft,to="composer"
>
  …
</div>
```

Properties left out are neither saved nor restored — they start from whatever the scope declares.

## Persisting a store

Global [stores](/globals/store) have no element to hang a directive on, so the plugin also exports `persistStore()` for JS:

```js
import { store } from '@aevantec/litevue';
import { persistStore } from '@aevantec/litevue/plugins';

store('cart', { items: [], coupon: '' });

persistStore('cart'); // restores now, saves on every change
```

Options mirror the directive:

```js
persistStore('cart', { keys: ['items'] }); // only these properties
persistStore('cart', { key: 'v2:cart' }); // custom storage key
persistStore('cart', { storage: 'session' }); // a different storage
```

- Call it **after** registering the store; values are restored immediately, so an `init()` that seeds defaults runs first and is then overwritten by anything saved.
- It returns a function that **stops persisting**:

  ```js
  const stopPersisting = persistStore('cart');
  stopPersisting();
  ```

- Writes are batched through the scheduler, so a burst of mutations in one tick produces a single write.

::: tip Derived values and methods are skipped
Methods aren't state, and derived values — getter-only properties like `get count()`, plus [`computed()`](/globals/computed) refs — can't be assigned back on restore. All are ignored automatically, including when you name them explicitly in `keys`.
:::

## Choosing a storage

Persistence writes to `localStorage` by default. Pick a different one per usage — a **modifier** on the directive, a **`storage` option** for stores — so different data can live in different places:

```js
// data A survives browser restarts, data B lasts for the tab only
persistStore('preferences'); // localStorage
persistStore('wizard', { storage: 'session' }); // sessionStorage
```

```html
<div v-scope="{ theme: 'dark' }" v-persist="prefs">…</div>
<div v-scope="{ step: 1 }" v-persist.session="wizard">…</div>

<!-- modifiers combine with a property argument -->
<div v-scope="{ draft: '', sending: false }" v-persist:draft.session="composer">
  …
</div>
```

Built-in names are `local` and `session`.

### Custom storages

Anything with `getItem` and `setItem` qualifies — an in-memory map, an IndexedDB shim, a server-backed store. Pass it directly:

```js
persistStore('scratch', { storage: myStorage });
```

…or register it under a name, which also makes it available as a directive modifier:

```js
import { registerStorage } from '@aevantec/litevue/plugins';

registerStorage('vault', myStorage);

persistStore('secrets', { storage: 'vault' });
```

```html
<div v-scope="{ token: '' }" v-persist.vault="secrets">…</div>
```

### Switching the default

To move everything at once — say, an app that should never write to disk:

```js
import { setDefaultStorage } from '@aevantec/litevue/plugins';

setDefaultStorage('session'); // or a storage object
```

Per-usage choices still win over the default. Call it before your `persistStore()` calls and before mounting.

::: warning Unavailable storage
If a storage can't be resolved — an unknown modifier, or `localStorage` blocked by browser settings — the scope or store still works normally; it is merely not persisted (with a dev-mode error explaining why).
:::
