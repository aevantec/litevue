---
title: Security
---

# Security <Badge type="section" text="Start Here" />

LiteVue evaluates JavaScript expressions it finds in your markup. `v-scope`, `@click`, `:class` and `{{ }}` are all code, compiled at runtime from attribute values. Everything on this page follows from that one fact.

That design is inherited from petite-vue and is not a defect. It is what allows a server-rendered page to become interactive without a build step. It also means **the markup LiteVue walks is part of your trusted codebase**, exactly like a `<script>` tag, and has to be treated that way.

::: danger Read this before deploying
Two of the constraints below decide whether LiteVue can be used at all: the CSP requirement, and the rule about untrusted HTML. They are the first two sections; check both before building on it.
:::

## Content Security Policy

Expressions are compiled with `new Function()`, so a strict CSP must allow dynamic evaluation:

```
Content-Security-Policy: script-src 'self' 'unsafe-eval';
```

**A nonce or a hash does not help.** Those authorise specific `<script>` elements; `'unsafe-eval'` governs runtime compilation, which is a separate capability. There is no way to keep the policy strict and still evaluate expressions at runtime.

If your policy cannot allow `'unsafe-eval'`, LiteVue is the wrong tool, and no CSP build is planned — shipping an expression parser would defeat the size budget that is the reason to choose it. Use standard Vue with pre-compiled templates, which needs no runtime evaluation.

## Never mount over untrusted HTML

If LiteVue walks a region containing HTML built from user input, anyone who can inject an attribute can run code:

```html
<!-- a comment field rendered without sanitisation -->
<div class="comment">
  Nice article! <img src="x" @error="fetch('/api/keys').then(r => r.text()).then(send)" />
</div>
```

Mounting over that comment executes the handler. No `<script>` tag is involved, so a filter that only strips `<script>` will not catch it.

Mitigations, most effective first:

1. **Mount explicitly**, so only regions you control are walked:

   ```js
   createApp().mount('#app-i-control');
   ```

   Avoid the `init` attribute and a bare `createApp().mount()` on any page that renders user-submitted HTML — both crawl the entire document.

2. **Sanitise before rendering.** Strip `v-*`, `@*` and `:*` attributes from user HTML. An allowlist of permitted attributes is safer than a denylist of forbidden ones.

3. **Keep injected markup inert.** LiteVue never initialises HTML that appears after mount; [dynamic content](/essentials/dynamic-content) becomes live only when you call `app.mount(el)` on it. Do not call it on markup you did not produce.

::: tip Why there is no automatic initialisation
Other libraries watch the DOM and activate anything inserted later. LiteVue deliberately does not, because that turns every HTML injection anywhere on the page into code execution. The explicit `app.mount(el)` call is the trust boundary, and it is the reason a `MutationObserver` mode is not built in.
:::

## `v-html`

[`v-html`](/directives/v-html) assigns to `innerHTML` and carries the usual risks: it will render whatever markup it is given. Content assigned this way is **not** walked by LiteVue, so directives inside it stay inert — but scripts, event-handler attributes and `javascript:` URLs behave exactly as they would in any other `innerHTML` assignment.

Use it only with markup you trust, or sanitise first.

## Morph and server-rendered updates

The [morph](/plugins/morph) plugin patches a live region from new HTML, and elements it inserts **are** initialised, including any `v-scope` they carry — that is what makes newly-added content work.

This is narrower than automatic initialisation, because it only happens inside a region you explicitly named. It still means the HTML you morph in is trusted input. Treat a morph source the same as anything you would pass to `app.mount()`: it should come from your own server, over a response you control.

## Devtools in production

The devtools registry exposes mounted scopes and stores on `window.__LITE_VUE__`, and the panel can edit them live.

This is **not** a privilege boundary — script running on your origin already has full access to the page, so the registry grants an attacker nothing they could not obtain anyway. What it does is make application state trivially enumerable, which is worth removing from a production build:

```js
import { disableDevtools } from '@aevantec/litevue';

disableDevtools();
```

For `<script>` users, set the flag before the library loads:

```html
<script>
  window.__LITE_VUE_DEVTOOLS__ = false;
</script>
```

Bypassing that kill-switch to reach application state **is** treated as a vulnerability — see below.

## Third-party plugins

A plugin receives the app and can read and write `app.scope`, register directives, and run arbitrary code at install time. Installing one is equivalent to adding a `<script>` tag: audit it, and pin the version.

## Before you deploy

- Mount an explicit target rather than the whole document.
- Confirm no region you mount contains unsanitised user HTML.
- Confirm your CSP allows `'unsafe-eval'`, or that you have accepted the alternative.
- Call `disableDevtools()`, or set `__LITE_VUE_DEVTOOLS__ = false`.
- Review any third-party plugin as you would any dependency that ships code.

## Reporting a vulnerability

Report privately through [GitHub security advisories](https://github.com/aevantec/litevue/security/advisories/new) rather than a public issue.

Because expression evaluation is intentional, reports that restate it — that `@click` in attacker-supplied HTML runs, or that a CSP without `'unsafe-eval'` blocks the library — are closed as working as documented.

In scope: escaping the intended scope of an expression, prototype pollution, bypassing the devtools production kill-switch to reach application state, or getting content that should have stayed inert to execute. The full policy is in [SECURITY.md](https://github.com/aevantec/litevue/blob/main/SECURITY.md).
