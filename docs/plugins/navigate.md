---
title: navigate
---

# navigate <Badge type="section" text="Plugin" />

Follow same-origin links and submit forms without a full page load. The plugin fetches the next page and [morphs](/plugins/morph) it into this one, so the parts both pages share keep their state: an open sidebar, a playing video, a half-typed search.

```js
import { createApp } from '@aevantec/litevue';
import { morphPlugin } from '@aevantec/litevue/plugins/morph';
import { navigate } from '@aevantec/litevue/plugins/navigate';

createApp().use(morphPlugin).use(navigate).mount();
```

The plugin ships on its own (~3kb<!-- size:dist/plugins/navigate.iife.js --> gzipped) and is not part of the combined plugins bundle. It needs [morph](/plugins/morph) installed too, which it does not bundle, so a page already using morph carries one copy. From a CDN, load `dist/plugins/navigate.iife.js` after the core and morph; it defines `LiteVueNavigate`.

## Options

```js
createApp()
  .use(morphPlugin)
  .use(navigate, { target: '#main', transition: true })
  .mount();
```

| Option | Default | Meaning |
| --- | --- | --- |
| `target` | `'body'` | Selector of the region to update. The fetched page must contain it too |
| `transition` | `false` | Run each navigation inside a [view transition](/plugins/morph#view-transitions) where supported |
| `scroll` | `true` | Scroll to the top, or to the URL's `#hash`, after navigating |
| `prefetch` | `false` | Fetch a link's page when the pointer rests on it or it receives focus, so the click renders without waiting. See [Prefetch](#prefetch) |

## What it intercepts

- Clicks on links to the same origin
- Submits of `GET` and `POST` forms to the same origin

The browser keeps everything else:

- Clicks with Ctrl, Cmd, Shift or Alt held, and middle clicks
- Links and forms with a `target` other than `_self`, and links with `download`
- Links to another origin, and `#hash` links within the current page
- Links inside SVG
- `POST` forms with `enctype="text/plain"`
- `<form method="dialog">`
- A click or submit that another handler already cancelled with `preventDefault()`
- Anything inside an element with `data-navigate="false"`

```html
<a href="/export.csv" data-navigate="false">Download</a>
```

Mark links to files the same way, or with `download`. A same-origin link to a PDF or an image is fetched first; once the response turns out not to be HTML, the plugin stops downloading it and the browser loads the file again in full.

## Prefetch

With `prefetch: true`, the plugin starts fetching a link's page before it is clicked:

- When the pointer rests on the link for 100ms, or the link receives focus. Moving away sooner fetches nothing, so a pointer crossing the page does not fetch every link it passes.
- At once on `pointerdown`, which comes before the click by the time it takes to release the button or lift a finger.

```js
createApp().use(morphPlugin).use(navigate, { prefetch: true }).mount();
```

A click on that link then uses the response already on its way. One page is held at a time, for 10 seconds; any navigation to the same URL in that window uses it, except a `POST`. After that, or for another URL, the plugin fetches as usual.

Prefetching considers the same links a click would, so a link the plugin leaves to the browser is never prefetched. Neither is a link to the current page. Mark a link `data-navigate="false"` to keep it from being fetched early, such as one whose `GET` has a side effect:

```html
<a href="/notifications/read-all" data-navigate="false">Mark all read</a>
```

A prefetch request sends `X-Sec-Purpose: prefetch` alongside `X-Requested-With: litevue`, so a server can skip it in analytics or answer it differently. A response the server sends to a prefetch is the page the user sees if they click, so it must be the same page a navigation would receive.

A prefetch does not set the [loading state](#loading-state) and fires no events. A failed one is ignored; if the user then clicks, the navigation fails as any other would.

## Keeping state across pages

Morph matches elements by `id` first, then by position. A scope root with the same `id` on both pages is kept, and its state with it. Give the layout's scopes a fixed `id`, and give each page's own scope root an `id` of its own, so it starts fresh:

```html
<!-- on every page: kept, so the player keeps playing -->
<aside id="player" v-scope="{ playing: false }">…</aside>

<!-- different on each page: replaced, so each page gets its own state -->
<main id="page-orders" v-scope="{ filter: 'open' }">…</main>
```

::: warning A page root needs its own id
Two pages whose `<main v-scope="…">` has no `id`, or the same one, are matched by position. The second page's markup is patched into the first page's element, which keeps the first page's scope and data.
:::

To keep a client-only element that the next page does not contain, such as a toast or a chat widget, mark it `data-morph-preserve`, as with [morph](/plugins/morph#a-widget-the-client-owns).

### Stores live across pages

A [store](/globals/store) belongs to the app, not to a page, so its state survives every navigation. That suits state the whole site shares, such as a cart or a signed-in user. State that belongs to one page belongs in that page's `v-scope`, which starts fresh when the page's root is replaced.

## Forms

A `GET` form navigates to its `action` with the fields as the query string. A `POST` form follows the server's redirect, so the URL ends on the page the server sent you to. Fields are encoded as the browser would encode them: URL-encoded by default, and as `multipart/form-data` when the form's `enctype` says so. A file input in a URL-encoded form sends its file name, as the browser does. The submit button's `name` and `value`, and its `formaction`, `formmethod`, `formtarget` and `formenctype`, are honored.

When a `POST` response is an error, such as a `422` with validation messages, the page renders it in place without changing the URL, so the typed values and focus survive as they do with [morph](/plugins/morph). A `POST` that fails to reach the server is not retried, since sending it again could repeat the action; the form stays as it was and `navigate:error` fires.

While a form's `POST` is in flight, further submits of that form are ignored, so a double click sends one request. A `GET` form submitted again restarts with the newer values, so a search always shows the latest query.

## Loading state

While a navigation is in flight, `<html>` carries `aria-busy="true"`, and so does the form that started it. Both are removed when the new page is in place or the navigation fails. Style the wait with CSS:

```css
html[aria-busy='true'] {
  cursor: progress;
}

form[aria-busy='true'] button {
  opacity: 0.6;
}
```

`aria-busy` also tells assistive technology that the region is updating. When one navigation replaces another, the busy state passes to the newer one, so it never flickers off in between.

## The head

The fetched page's `<head>` is merged into the current one, so each page keeps its own stylesheets and meta tags:

- `<title>` is replaced.
- `<link>`, `<style>` and `<meta>` elements present on both pages are left in place, so a shared stylesheet is never reloaded.
- Ones only the next page has are added. New stylesheets finish loading before the page changes, so it never shows unstyled. A stylesheet that fails to load does not hold the navigation up.
- Ones only the current page has are removed once the new page is in place.
- `<script>` elements are never added or removed. A fetched page's `<script>` elements never run, and removing a script would not unload it.

Mark an element `data-navigate-preserve` to keep it even when the next page lacks it, such as a stylesheet a client-side library injected:

```html
<style data-navigate-preserve>…</style>
```

### Deploys

To reload the page when a deploy changes your scripts or styles, mark them `data-navigate-track`. If the fetched page's tracked assets differ from the current ones, the plugin does a full load instead, so old and new code never mix:

```html
<script type="module" src="/assets/app.4f2a.js" data-navigate-track></script>
<link rel="stylesheet" href="/assets/app.9c1e.css" data-navigate-track />
```

Untracked scripts are ignored, so a site with a different entry script on each page still navigates.

## Events

Each fires on `document`, with `event.detail.url`:

| Event | When |
| --- | --- |
| `navigate:before` | Before fetching. For a link or a form, call `preventDefault()` to stay on the current page. Back and forward have already changed the URL, so they cannot be cancelled |
| `navigate:after` | After the new page is in place |
| `navigate:error` | When a navigation fails; `detail.error` says why. A `GET` then falls back to a full load |

```js
document.addEventListener('navigate:before', () => progress.start());
document.addEventListener('navigate:after', () => progress.done());
```

### Unsaved changes

`beforeunload` does not fire for a navigation that stays on the page. To warn before leaving a form with unsaved changes, cancel `navigate:before`, and keep `beforeunload` for a full load or a closed tab:

```js
let dirty = false;
form.addEventListener('input', () => (dirty = true));
form.addEventListener('submit', () => (dirty = false));

document.addEventListener('navigate:before', (event) => {
  if (dirty && !confirm('Leave without saving your changes?')) {
    event.preventDefault();
  }
});

addEventListener('beforeunload', (event) => {
  if (dirty) event.preventDefault();
});
```

Back and forward cannot be held this way, since the URL has already changed when `navigate:before` fires.

## Behavior

- Requests send `X-Requested-With: litevue`, so a server can tell them apart from a full load. A server that returns a different response for them must also send `Vary: X-Requested-With`; otherwise a browser or proxy cache can serve that response to a full load of the same URL.
- A navigation still in flight is cancelled when another starts.
- The plugin falls back to a full load when the response is not HTML, redirects to another origin, is an error for a link or a `GET` form, or has no `target` element.
- `<script>` elements in the fetched page never run. Inline event handler attributes such as `onclick` or `onload` do, as they would on a full load of that page. Scripts the current page already ran stay run; put page behavior in directives or in your bundle.
- The URL changes before the new content mounts, so new scopes read the new `location`.
- Focus goes where a full load would put it: to an `autofocus` field in the new content if there is one. Otherwise, with the default `body` target, it returns to the start of the document; with a `target`, the target receives focus, gaining `tabindex="-1"` if it has none.
- The new page is announced through a visually hidden, polite live region, so screen-reader users learn the page changed: its title, or its first `<h1>` when it has none, or its path when it has neither. The first page load is not announced, since the screen reader reads it already.
- Back and forward fetch the page again and return to the scroll position the user left, even when the URL has a `#hash`. The plugin sets `history.scrollRestoration` to `manual` so the browser does not scroll the outgoing page first, and restores the previous value on unmount.
- There is no page cache. A snapshot of a live page cannot be restored, because mounting consumes the directives in the markup, so a restored copy would bind nothing. A cache of the server's HTML would only save the request, and could show stale content, so every traversal fetches the page.
- On full unmount, the plugin stops intercepting and removes its live region.

## Security

Morph initialises the directives in the markup it inserts, so a navigation evaluates expressions from the fetched page. That trusts the page as much as a full load of it would, and no more: the plugin fetches only same-origin URLs, checks the final URL after redirects, accepts only `text/html`, and never runs `<script>` elements from the response. Inline event handler attributes in the response do run, as on a full load. See [Security](/start-here/security#morph-and-server-rendered-updates).

### CSRF tokens

The head merge replaces a `<meta name="csrf-token">` whose value changed, and a hidden token field in a form is patched like any other markup. Code that read the token once at start-up keeps the old value, so read it when sending each request:

```js
const csrf = () => document.querySelector('meta[name="csrf-token"]').content;
```

### Content Security Policy

A nonce is valid only for the response that issued it. A fetched page's inline `<style nonce="…">` carries its own response's nonce, which the current page's policy does not allow, so the browser blocks it. Load page styles from stylesheets with `<link>`, which a `style-src 'self'` policy allows without a nonce. Fetched `<script>` elements never run, so their nonces do not matter.

## Coming from Turbo or htmx

The plugin works like Turbo Drive or htmx's `hx-boost` on `<body>`: links and forms are intercepted by default, and the new page is swapped in. Differences:

- The swap is a morph, not a replacement, so matching elements keep their scope, focus and state.
- Both merge the head. Turbo removes a stylesheet the next page lacks only when it is marked `data-turbo-track="dynamic"`; here every unshared one is removed unless marked `data-navigate-preserve`, as with htmx's head-support extension.
- Turbo reloads on changed assets only when they are marked `data-turbo-track="reload"`; here the marker is `data-navigate-track`.
- There is no page cache or frames. The busy state and the events let you add a progress indicator.
- Prefetching is off by default. Turbo prefetches on hover unless a page opts out; here `prefetch: true` opts in, with the same 100ms pause and 10-second reuse window.

## Related

[morph](/plugins/morph) · [Dynamic content](/essentials/dynamic-content) · [Security](/start-here/security) · [Installation](/plugins/installation)
