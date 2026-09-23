---
title: persist
---

# persist <Badge type="section" text="Plugin" />

Save a scope or store to storage, and restore it on the next page load.

```js
import { persist } from '@aevantec/litevue/plugins';
createApp().use(persist).mount();
```

```html
<div v-scope="{ theme: 'light' }" v-persist="prefs">…</div>
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-persist="key"` | Persist the scope's state under `key` |
| `v-persist:prop="key"` | Persist only `prop` |
| `v-persist:a,b="key"` | Persist only `a` and `b` |

The value is a literal key, not an expression, stored as `litevue:<key>`. With
no value, the element's `id` is used.

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.local` | `localStorage` — the default |
| `.session` | `sessionStorage` |
| `.<name>` | A storage registered with `registerStorage(name, …)` |

## Signature

For stores and custom storage, from `@aevantec/litevue/plugins`:

```ts
persistStore(name: string, options?: {
  key?: string;       // storage key; defaults to the store name
  keys?: string[];    // only these properties
  storage?: string | PersistStorage;
}): () => void        // returns a function that stops persisting

registerStorage(name: string, storage: PersistStorage): void
setDefaultStorage(storage: string | PersistStorage): void

interface PersistStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
```

## Examples

<<< ../.vitepress/demos/persist.html{html}

<LiveDemo src="persist" plugins="persist" />

### Selected properties

Keep durable state and leave scratch state out:

```html
<div v-scope="{ draft: '', to: '', sending: false }" v-persist:draft,to="composer">
  …
</div>
```

Properties left out are neither saved nor restored.

### Persisting a store

Stores have no element, so use `persistStore()` after registering the store:

```js
import { store } from '@aevantec/litevue';
import { persistStore } from '@aevantec/litevue/plugins';

store('cart', { items: [], coupon: '' });

persistStore('cart'); // restores now, saves on every change
persistStore('cart', { keys: ['items'] }); // only some properties
persistStore('cart', { key: 'v2:cart' }); // a custom storage key
```

### Choosing a storage

Different data can live in different places — a modifier on the directive, a
`storage` option for a store:

```html
<div v-scope="{ theme: 'dark' }" v-persist="prefs">…</div>
<div v-scope="{ step: 1 }" v-persist.session="wizard">…</div>
<div v-scope="{ draft: '' }" v-persist:draft.session="composer">…</div>
```

```js
persistStore('preferences'); // localStorage
persistStore('wizard', { storage: 'session' }); // sessionStorage
```

### Custom storage

Anything with `getItem` and `setItem` works — an in-memory map, an IndexedDB
shim, a server-backed store. Pass it directly, or register it by name to use it
as a modifier too:

```js
import { registerStorage, setDefaultStorage } from '@aevantec/litevue/plugins';

registerStorage('vault', myStorage);
persistStore('secrets', { storage: 'vault' });

// move every persisted value to sessionStorage at once
setDefaultStorage('session');
```

```html
<div v-scope="{ token: '' }" v-persist.vault="secrets">…</div>
```

## Behavior

- By default every own property that is not a function and does not start with `$` is persisted.
- Nested changes save too. A burst of changes in one tick is written once.
- Methods, getter-only properties and [`computed()`](/globals/computed) values are skipped, even when listed in `keys` — they cannot be assigned back.
- `persistStore()` restores immediately, so values an `init()` seeded are replaced by anything already saved.
- A per-use storage beats the default. Call `setDefaultStorage()` before `persistStore()` and before mounting.
- If a storage cannot be used — an unknown modifier, or `localStorage` blocked by the browser — the state still works, it is just not saved, and a development error explains why.
- Stored values are plain JSON in the browser. Do not persist secrets to `localStorage`.

## Related

[store()](/globals/store) · [watchEffect()](/globals/watch-effect) · [Installation](/plugins/installation)
