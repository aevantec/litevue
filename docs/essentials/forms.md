---
title: Forms
---

# Forms <Badge type="section" text="Essentials" />

LiteVue has no form abstraction, and most applications do not need one. A plain factory function holding the fields and a little state covers validation errors, a submitting flag and success handling in about forty lines, with nothing added to the bundle your visitors download.

This page is that recipe.

## The helper

```js
// form.js
export function createForm(initialData, url, method = 'POST') {
  return {
    fields: { ...initialData },
    errors: {},
    processing: false,
    wasSuccessful: false,

    reset() {
      this.fields = { ...initialData };
      this.errors = {};
    },

    async submit() {
      if (this.processing) return;

      this.processing = true;
      this.errors = {};
      this.wasSuccessful = false;

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...csrfHeader(),
          },
          body: JSON.stringify(this.fields),
        });

        // A failing request does not always carry JSON: a 500 may return an
        // HTML error page and a 204 returns nothing. Parsing defensively keeps
        // a server error from being reported as a network error.
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          this.errors = result?.errors ?? {
            general: `Request failed (${response.status}).`,
          };
          return;
        }

        this.wasSuccessful = true;
        this.reset();
      } catch {
        this.errors = { general: 'Network error. Please try again.' };
      } finally {
        this.processing = false;
      }
    },
  };
}
```

## Using it

Hold the form on the app's scope and reference it by name:

```js
import { createApp } from '@aevantec/litevue';
import { createForm } from './form.js';

createApp({
  loginForm: createForm({ email: '', password: '' }, '/api/login'),
}).mount('#app');
```

```html
<div id="app">
  <form @submit.prevent="loginForm.submit()">
    <label>
      Email
      <input
        type="email"
        v-model="loginForm.fields.email"
        :disabled="loginForm.processing"
      />
    </label>
    <span v-if="loginForm.errors.email">{{ loginForm.errors.email }}</span>

    <label>
      Password
      <input
        type="password"
        v-model="loginForm.fields.password"
        :disabled="loginForm.processing"
      />
    </label>
    <span v-if="loginForm.errors.password">{{ loginForm.errors.password }}</span>

    <p v-if="loginForm.errors.general">{{ loginForm.errors.general }}</p>
    <p v-if="loginForm.wasSuccessful">Signed in.</p>

    <button type="submit" :disabled="loginForm.processing">
      {{ loginForm.processing ? 'Signing in…' : 'Sign in' }}
    </button>
  </form>
</div>
```

Three details make this work:

- **Nest the form under a name.** `createApp({ loginForm: … })` puts it on the root scope, and templates reach it as `loginForm.fields.email`. Passing a form object to `v-scope` instead would not behave the same way — see [why below](#why-not-v-scope).
- **`this` resolves correctly.** `loginForm.submit()` is a method call, so `this` is the reactive form, and assignments such as `this.processing = true` reach the template.
- **Replacing an object is reactive.** `this.errors = { … }` and `this.fields = { … }` are assignments to a tracked property, so bindings that read them update.

## Cross-site request forgery

A session-authenticated backend rejects a request without a token, so send one. For frameworks that publish an `XSRF-TOKEN` cookie — Laravel and Symfony among them — read it per request:

```js
function csrfHeader() {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {};
}
```

Where the token is rendered into the page instead, read it from the meta tag:

```js
function csrfHeader() {
  const token = document.querySelector('meta[name="csrf-token"]')?.content;
  return token ? { 'X-CSRF-TOKEN': token } : {};
}
```

## Keeping the no-JavaScript path

The form above only submits through `fetch`. To keep it working when scripts fail, give the element a real `action` and `method` and let the browser handle it until LiteVue takes over:

```html
<form
  action="/api/login"
  method="post"
  @submit.prevent="loginForm.submit()"
>
```

Without JavaScript the browser performs an ordinary submission. Once mounted, `@submit.prevent` intercepts it. Both paths need the server to accept the same route.

## Adjusting the shape

The helper assumes a `{ "errors": { "field": "message" } }` envelope. Backends differ, so normalise where the response is read rather than throughout the template. For an API returning `{ "errors": [{ "field": …, "message": … }] }`:

```js
const normalise = (payload) =>
  Object.fromEntries(
    (payload?.errors ?? []).map(({ field, message }) => [field, message])
  );
```

Laravel returns an array of messages per field, so take the first:

```js
const normalise = (payload) =>
  Object.fromEntries(
    Object.entries(payload?.errors ?? {}).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : messages,
    ])
  );
```

## Extending it

The recipe is a starting point rather than a library. Additions worth knowing how to make:

**Dirty tracking** — compare the current fields against the originals:

```js
get isDirty() {
  return Object.keys(initialData).some(
    (key) => this.fields[key] !== initialData[key]
  );
}
```

**File uploads** — `JSON.stringify` cannot carry a `File`, so switch to `FormData` when one is present:

```js
const body = Object.values(this.fields).some((v) => v instanceof File)
  ? Object.entries(this.fields).reduce((fd, [k, v]) => (fd.append(k, v), fd), new FormData())
  : JSON.stringify(this.fields);
```

Drop the `Content-Type` header when sending `FormData`; the browser sets it, including the multipart boundary.

**Upload progress** — `fetch` cannot report it. No browser exposes request-body progress to `fetch`, so a progress bar requires `XMLHttpRequest` and its `upload.onprogress` event.

**Cancellation** — pass an `AbortController` signal to `fetch` and call `abort()`. Worth adding if a form can be removed from the page mid-request, since the request otherwise runs to completion.

## Why not `v-scope`

Putting the form directly in a scope looks natural and does not work:

```html
<!-- fields silently fail to reach the payload -->
<form v-scope="createForm({ email: '' }, '/api/login')">
  <input v-model="email" />
</form>
```

`v-scope` builds its scope by copying the expression's own property descriptors onto a new object. Plain properties are copied **by value**, so the scope and the form become separate objects: typing updates the scope while the form keeps its original data, and the request sends `{"email":""}`. Errors assigned by the form are equally invisible to the template.

Nesting the form under a name, as above, avoids this entirely — `loginForm` is read through the scope rather than copied out of it.
