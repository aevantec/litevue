---
title: Forms
---

# Forms <Badge type="section" text="Essentials" />

LiteVue has no form abstraction, and most applications do not need one. This page gives two small recipes for submitting forms without a page reload, depending on what your server returns:

- **JSON:** a `createForm()` factory holds the fields, validation errors, a `processing` flag, dirty tracking and cancellation. If you know Inertia's `useForm`, it has the same shape.
- **HTML:** the server re-renders the form with its errors already in the markup, and [morph](/plugins/morph) patches it into place. Focus, the caret and anything still being typed survive.

Neither adds anything to the bundle your visitors download.

## The JSON helper

```js
// form.js
export function createForm(initialData, url, method = 'POST') {
  let controller;

  return {
    fields: { ...initialData },
    errors: {},
    processing: false,
    wasSuccessful: false,

    get isDirty() {
      return Object.keys(initialData).some(
        (key) => this.fields[key] !== initialData[key]
      );
    },

    reset() {
      this.fields = { ...initialData };
      this.errors = {};
    },

    cancel() {
      controller?.abort();
    },

    async submit() {
      if (this.processing) return;

      const { signal } = (controller = new AbortController());
      this.processing = true;
      this.errors = {};
      this.wasSuccessful = false;

      try {
        const response = await fetch(url, {
          method,
          signal,
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
        if (signal.aborted) return;

        if (!response.ok) {
          this.errors = result?.errors ?? {
            general: `Request failed (${response.status}).`,
          };
          return;
        }

        this.wasSuccessful = true;
        this.reset();
      } catch {
        if (!signal.aborted) {
          this.errors = { general: 'Network error. Please try again.' };
        }
      } finally {
        this.processing = false;
      }
    },
  };
}
```

`method` is `POST`, `PUT`, `PATCH` or `DELETE`. A `GET` request cannot carry a body, so `fetch` rejects it. `csrfHeader()` is defined under [Cross-site request forgery](#cross-site-request-forgery).

## Using it

```js
import { createApp } from '@aevantec/litevue';
import { createForm } from './form.js';

createApp({ createForm }).mount('#app');
```

```html
<div id="app">
  <form
    v-scope="{ login: createForm({ email: '', password: '' }, '/api/login') }"
    @submit.prevent="login.submit()"
    @unmounted="login.cancel()"
  >
    <label>
      Email
      <input type="email" v-model="login.fields.email" />
    </label>
    <span v-if="login.errors.email">{{ login.errors.email }}</span>

    <label>
      Password
      <input type="password" v-model="login.fields.password" />
    </label>
    <span v-if="login.errors.password">{{ login.errors.password }}</span>

    <p v-if="login.errors.general">{{ login.errors.general }}</p>
    <p v-if="login.wasSuccessful">Signed in.</p>

    <button type="submit" :disabled="login.processing || !login.isDirty">
      {{ login.processing ? 'Signing in…' : 'Sign in' }}
    </button>
    <button type="button" v-show="login.processing" @click="login.cancel()">
      Cancel
    </button>
  </form>
</div>
```

What each part does:

- **`isDirty`** is `true` once any field differs from its initial value. Here it keeps the button disabled until something has been typed. It compares top-level fields with `!==`, so a field holding an object or array needs its own comparison.
- **A second submit is ignored** while the first is in flight. The helper does not abort and resend, as the [resource recipe](/essentials/resources) does for reads, because aborting a `POST` does not undo it on the server. Resending could create the record twice.
- **`cancel()`** aborts the request and reports nothing, and `processing` returns to `false`. The server may still have acted on the request, so treat a cancel as "stop waiting", not "undo".
- **`@unmounted`** cancels a request still in flight when the form is removed, for example by a [morph](/plugins/morph) or an htmx swap.

## Cross-site request forgery

A session-authenticated backend rejects a request without a token, so send one. For frameworks that publish an `XSRF-TOKEN` cookie, Laravel and Symfony among them, read it on each request:

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

Give the form a real `action` and `method`, so the browser can submit it when scripts fail:

```html
<form
  action="/api/login"
  method="post"
  v-scope="{ login: createForm({ email: '', password: '' }, '/api/login') }"
  @submit.prevent="login.submit()"
>
```

Without JavaScript the browser performs an ordinary submission. Once LiteVue has mounted, `@submit.prevent` intercepts it. Both paths need the server to accept the same route. The HTML recipe below keeps this path without extra work, because the server already renders the form.

## Server-rendered forms with morph

When the server renders the form, its validation errors can come back as HTML too. The server re-renders the form partial with the messages and the submitted values filled in, and morph patches the live form to match. Nothing about the error format lives in JavaScript.

::: tip Plain forms with navigate
With the [navigate](/plugins/navigate) plugin installed, a plain `<form method="post">` without `@submit.prevent` gets this behavior without the code below: a redirect navigates to the next page, and an error response such as a `422` is morphed in place, keeping the typed values and focus. See [navigate forms](/plugins/navigate#forms). The recipe below suits a form that posts to a partial endpoint, or a page without navigate.
:::

```js
// html-form.js
import { morph } from '@aevantec/litevue/plugins';

export function createHtmlForm() {
  return {
    processing: false,
    failed: false,

    async submit(form) {
      if (this.processing) return;

      this.processing = true;
      this.failed = false;
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: {
            Accept: 'text/html',
            'X-Requested-With': 'XMLHttpRequest',
            ...csrfHeader(),
          },
        });

        if (response.redirected) return location.assign(response.url);
        if (!response.ok && response.status !== 422) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        morph(form, await response.text());
      } catch {
        this.failed = true;
      } finally {
        this.processing = false;
      }
    },
  };
}
```

```js
import { createApp } from '@aevantec/litevue';
import { morphPlugin } from '@aevantec/litevue/plugins';
import { createHtmlForm } from './html-form.js';

createApp({ createHtmlForm }).use(morphPlugin).mount();
```

The server renders this partial for the first page load and again for each failed submission:

```html
<form
  action="/signup"
  method="post"
  v-scope="{ signup: createHtmlForm() }"
  @submit.prevent="signup.submit($el)"
>
  <label>
    Email
    <input name="email" type="email" value="ada@example.com" />
  </label>
  <p class="error">The email has already been taken.</p>

  <button :disabled="signup.processing">Sign up</button>
  <p v-show="signup.failed">Something went wrong. Please try again.</p>
</form>
```

How each response is handled:

| Response | Result |
| --- | --- |
| `422` with the form partial | Morphed into the live form. The input the visitor is typing in keeps its value, caret and focus |
| A redirect, such as after a successful save | The browser navigates to the final URL |
| Any other error | The form is left as it was, and `failed` shows the message |

Keep three things in mind:

- **Use `v-show`, not `v-if`, inside the form.** Morph leaves alone any element that contains a `v-if` or `v-for`, because LiteVue owns that markup. A `v-if` anywhere in the form would make every morph skip the whole form. See the [morph behavior table](/plugins/morph#behavior).
- **Return the partial, not the whole page,** when the request carries `X-Requested-With: XMLHttpRequest`. Most frameworks can render a fragment for these requests.
- **`fetch` follows redirects itself,** so `response.redirected` reports a redirect after it has happened. The final page is requested twice, once by `fetch` and again by `location.assign()`. Where that matters, have the server answer these requests with a `204` and a header naming the next URL, and navigate to it.

## Adjusting the shape

The JSON helper assumes a `{ "errors": { "field": "message" } }` envelope. Backends differ, so normalise where the response is read rather than throughout the template. For an API returning `{ "errors": [{ "field": …, "message": … }] }`:

```js
const normalise = (payload) =>
  Object.fromEntries(
    (payload?.errors ?? []).map(({ field, message }) => [field, message])
  );
```

Laravel returns an array of messages for each field, so take the first:

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

The recipes are starting points rather than a library. Additions worth knowing how to make:

**File uploads.** `JSON.stringify` cannot carry a `File`, so switch to `FormData` when one is present:

```js
const body = Object.values(this.fields).some((v) => v instanceof File)
  ? Object.entries(this.fields).reduce((fd, [k, v]) => (fd.append(k, v), fd), new FormData())
  : JSON.stringify(this.fields);
```

Drop the `Content-Type` header when sending `FormData`. The browser sets it, including the multipart boundary. The HTML recipe already sends `FormData`, so file inputs work there unchanged.

**Upload progress.** `fetch` cannot report it, because no browser exposes request-body progress to `fetch`. A progress bar requires `XMLHttpRequest` and its `upload.onprogress` event.

## Why the form is nested under a name

`v-scope="createForm(...)"` also works: the fields become the region's own state, so the inputs bind `fields.email` and the button calls `submit()`. Assigning the form to a key, `login` or `signup`, scales better. A page can hold several forms, or a form alongside other state, without their `fields`, `errors` and `processing` colliding, and the template states which form each binding belongs to.

## Next

Load data into a region with [Resources](/essentials/resources), or handle what a failed request leaves behind with [Error Handling](/essentials/error-handling).
