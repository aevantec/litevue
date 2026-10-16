---
title: Resources
---

# Resources <Badge type="section" text="Essentials" />

LiteVue has no data-fetching layer. Loading data from an endpoint needs only a small factory that tracks the reply, any error and a loading flag, and cancels a request once a newer one replaces it. This page gives that factory, for anyone who fetches JSON into a region and wants the edge cases handled: a slow reply arriving after a newer one, and a request still in flight when the region is removed.

## The helper

```js
// resource.js
export function createResource(load) {
  let controller;

  return {
    data: undefined,
    error: null,
    loading: false,

    async refresh(...args) {
      controller?.abort();
      const current = (controller = new AbortController());

      this.loading = true;
      this.error = null;
      try {
        const data = await load(current.signal, ...args);
        if (!current.signal.aborted) this.data = data;
      } catch (error) {
        if (!current.signal.aborted) this.error = error;
      } finally {
        if (controller === current) this.loading = false;
      }
    },

    abort() {
      controller?.abort();
      this.loading = false;
    },
  };
}

export const getJSON = (url) => async (signal) => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
};
```

`load` is any function that takes an `AbortSignal` and returns a promise. `getJSON` is one such loader. Write your own for other formats, headers or methods.

Each guard in `refresh()` covers a specific case:

- **Starting a request aborts the previous one**, so only the latest request can update the state.
- **A reply is kept only while its signal is still live.** This also covers a loader that ignores the signal and resolves after it has been replaced.
- **An abort is not reported as an error.** Replacing a request rejects the old `fetch` with an `AbortError`, and nothing should show it.
- **Only the latest request clears `loading`.** A replaced request that settles first does not end the loading state of the one that replaced it.

## Load a list

Register the helpers, then start the request when the region mounts and abort it when the region unmounts:

```js
import { createApp } from '@aevantec/litevue';
import { createResource, getJSON } from './resource.js';

createApp({ createResource, getJSON }).mount();
```

```html
<section
  v-scope="{ users: createResource(getJSON('/api/users')) }"
  @mounted="users.refresh()"
  @unmounted="users.abort()"
>
  <p v-if="users.loading">Loading…</p>
  <p v-else-if="users.error">
    {{ users.error.message }}
    <button @click="users.refresh()">Retry</button>
  </p>
  <ul v-else>
    <li v-for="user in users.data" :key="user.id">{{ user.name }}</li>
  </ul>
</section>
```

`@unmounted` matters on pages that replace regions, such as a [morph](/plugins/morph) or an htmx swap. Without it, a request started by a removed region still completes, and its reply is written to state that nothing displays.

## Re-fetch when a parameter changes

Arguments passed to `refresh()` reach the loader after the signal. Combined with [`$watch`](/magics/watch) and its `immediate` option, a search box fetches on mount and again on every change:

```js
const search = async (signal, query) => {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
};

createApp({ createResource, search }).mount();
```

```html
<div
  v-scope="{ query: '', results: createResource(search) }"
  @mounted="$watch('query', (q) => results.refresh(q), { immediate: true })"
  @unmounted="results.abort()"
>
  <input v-model.debounce="query" placeholder="Search" />
  <p v-if="results.loading">Searching…</p>
  <ul v-else>
    <li v-for="hit in results.data" :key="hit.id">{{ hit.title }}</li>
  </ul>
</div>
```

`.debounce` waits until typing pauses before updating `query`. When a new search starts, the one before it is aborted, so the results always match the current query, whatever order the replies arrive in.

## Why the resource is nested under a name

`v-scope="createResource(...)"` also works: the fields become the region's own state, and `{{ data }}` and `refresh()` resolve directly. Assigning the resource to a key, `users` or `results`, scales better. A region can hold several resources, or a resource alongside other state such as `query`, without their `data`, `loading` and `error` fields colliding, and the template states which request each binding belongs to.

## Next

Handle what a failed request leaves behind with [Error Handling](/essentials/error-handling).
