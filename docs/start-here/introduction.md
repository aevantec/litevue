---
title: Introduction
---

# Introduction <Badge type="section" text="Start Here" />

**LiteVue** is a ~9kb<!-- size:dist/litevue.iife.js --> distribution of Vue's template syntax designed for _progressive enhancement_: adding interactivity to HTML that a server already rendered, without a build step, a virtual DOM, or a single-page-app architecture.

It is a maintained fork of [petite-vue](https://github.com/vuejs/petite-vue) by Evan You, continuing from 0.4.1 with devtools, transitions, a plugin system, a global store, and additional directives — while keeping the original goal of staying as close to standard Vue as the format allows.

```html
<script src="https://unpkg.com/@aevantec/litevue" defer init></script>

<div v-scope="{ count: 0 }">
  {{ count }}
  <button @click="count++">inc</button>
</div>
```

That's a complete application. No bundler, no compile step, no hydration.

## The core idea: the DOM is the template

Most frameworks treat HTML as output — you write a template, a compiler turns it into a render function, and the framework produces DOM. LiteVue inverts this. It **walks the DOM that is already on the page**, finds elements carrying directives, and attaches fine-grained reactive effects directly to them.

The practical consequences:

- **No template compiler ships to the browser.** Standard Vue's runtime + compiler build is ~13kb larger precisely because it must parse template strings at runtime.
- **No re-render pass.** There is no virtual DOM and no diffing. When `count` changes, exactly the one text node bound to it updates.
- **Server-rendered markup is never replaced.** Your HTML is the source of truth; LiteVue enhances it in place. There's no hydration mismatch to worry about, because there's no hydration.

This is roughly how Vue 1 worked, and it is a genuinely better fit for the "sprinkle interactivity onto server-rendered pages" use case than a modern virtual-DOM framework running without a build step.

## Reactivity is the real Vue

LiteVue is not a Vue look-alike with its own reactivity implementation. It depends on **`@vue/reactivity`** — the exact package that powers Vue 3 — so proxies, dependency tracking, effect scheduling, computed getters, and batching all behave the way they do in Vue:

```js
import { createApp, reactive } from '@aevantec/litevue';

const store = reactive({ items: [] });

createApp({
  store,
  get total() {
    return this.store.items.length; // a real reactive getter
  },
}).mount();
```

Updates are batched on a microtask, so multiple mutations in one tick produce one DOM update — same as Vue.

## What's Vue-compatible

These work the way you'd expect coming from Vue, including modifiers and shorthands:

| Feature                                                                                        | Notes                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Mustache text bindings                                                                         | configurable via [custom delimiters](/essentials/templating#custom-delimiters) |
| [`v-bind`](/directives/v-bind)                                                                 | `:` shorthand, `class` / `style` special handling                              |
| [`v-on`](/directives/v-on)                                                                     | `@` shorthand and all standard modifiers                                       |
| [`v-model`](/directives/v-model)                                                               | all input types, non-string `:value` bindings                                  |
| [`v-if`](/directives/v-if) / `v-else` / `v-else-if`                                            |                                                                                |
| [`v-for`](/directives/v-for)                                                                   | with keyed reconciliation                                                      |
| [`v-show`](/directives/v-show), [`v-text`](/directives/v-text), [`v-html`](/directives/v-html) |                                                                                |
| [`v-pre`](/directives/v-pre), [`v-once`](/directives/v-once), [`v-cloak`](/directives/v-cloak) |                                                                                |
| [`ref`](/directives/ref) template refs                                                         | exposed as [`$refs`](/magics/refs)                                             |
| `reactive()`, `nextTick()`                                                                     | re-exported from `@vue/reactivity`                                             |

## What behaves differently

Deliberate divergences, all stemming from the absence of a component system:

| Behavior                             | In LiteVue                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [`$el`](/magics/el)                  | the element the directive is bound to, not a component root                                     |
| [`createApp()`](/globals/create-app) | takes global state (or a setup function), not a component definition                            |
| [Components](/essentials/components) | plain functions returning scope objects                                                         |
| Custom directives                    | a different, simpler interface — see [`app.directive()`](/globals/create-app#custom-directives) |
| Scopes                               | inherit through a prototype chain; writes to inherited keys fall through to the owning parent   |

## What's not supported

Dropped because their utility-to-size ratio doesn't justify inclusion for progressive enhancement. **If you need these, use standard Vue** — that's the honest answer, not a workaround:

- `ref()` and `watch()` as standalone APIs (use scope state and [`$watch`](/magics/watch)) — `reactive()`, [`computed()`](/globals/computed) and [`watchEffect()`](/globals/watch-effect) _are_ exported
- Render functions and JSX — there is no virtual DOM
- Reactivity for collection types (`Map`, `Set`) — stripped from the build for size
- `KeepAlive`, `Suspense`, async components
- Single-file components, scoped styles, and everything else requiring a build step
- `v-for` deep destructuring, `v-on="object"`, `v-is` / `<component :is>`
- Server-side rendering and platform-agnostic rendering — LiteVue is coupled to the DOM by design

::: tip Partially covered
Vue's `<Transition>` and `<Teleport>` have LiteVue equivalents that are close in spirit but not identical: the [transition plugin](/plugins/transition) and [`v-teleport`](/directives/v-teleport).
:::

## When to use LiteVue

**Good fit:**

- Server-rendered applications — Rails, Laravel, Django, Phoenix, Go templates, WordPress — that need interactive islands: dropdowns, modals, tabs, filters, form validation, cart counters.
- Static sites and marketing pages where shipping a framework bundle would dwarf the actual interactivity.
- Pages where you want interactivity **without adopting a build pipeline** for the frontend.
- Teams that already know Vue and don't want to learn a second syntax for the simple cases.

**Reach for standard Vue instead when:**

- The page is a genuine single-page app with routing, deep component trees, or heavy client state.
- You want single-file components, scoped CSS, or TypeScript-checked templates.
- You need SSR, hydration, or a shared component library across an app.
- Your CSP forbids `unsafe-eval` — see below, this one is a hard blocker.

The migration path is deliberately short: because the template syntax matches, moving a LiteVue island to a real Vue component is mostly a copy-paste plus a `data()` wrapper.

## Comparison with Alpine

LiteVue addresses a similar scope to [Alpine](https://alpinejs.dev), with two differences in emphasis: it's **about half the size**, and it's **Vue-compatible by policy**.

Alpine resembles Vue but is free to diverge where that serves its own goals — and it does, in a number of places. LiteVue treats alignment with standard Vue as a constraint, so that graduating to Vue later involves as little friction as possible. Practically, the feature sets are now comparable: see the full [directive-by-directive cheatsheet](/migration/from-alpine).

One design difference worth calling out: Alpine automatically initializes markup added to the DOM after load. LiteVue [deliberately does not](/essentials/dynamic-content) — you call `app.mount(el)` on new fragments — because auto-initialization turns any HTML injection into expression execution.

## Security and CSP

::: danger Read this before deploying
LiteVue evaluates JavaScript expressions found in your markup, and two consequences decide whether it can be used at all.

- **Never mount over untrusted HTML.** An attacker who can inject a `v-scope` or `@click` attribute into a region you mount can execute code. Mount an explicit target rather than the whole document.
- **A strict CSP must allow `script-src 'unsafe-eval'`**, because expressions are compiled with `new Function()`. A nonce or hash does not substitute. If your policy cannot allow it, use standard Vue with pre-compiled templates instead — no CSP build is planned.

Both are covered in full, along with `v-html`, morph, devtools and third-party plugins, on the [Security](/start-here/security) page.
:::

## Size and what's optional

The core stays small because everything else is opt-in and separately bundled:

| Bundle                            | Size (gzipped) | Contents                                                            |
| --------------------------------- | -------------- | ------------------------------------------------------------------- |
| Core                              | ~9kb<!-- size:dist/litevue.iife.js --> | reactivity, directives, [store](/globals/store), [magics](/magics/) |
| [Plugins](/plugins/)              | ~4kb<!-- size:dist/litevue-plugins.iife.js --> (all nine) | intersect, persist, focus, collapse, mask, media, morph, resize, transition |
| [Devtools panel](/devtools/panel) | ~6kb<!-- size:dist/litevue-devtools.iife.js --> | dev-only; never load it in production                               |

Devtools registration can also be [disabled entirely](/globals/devtools#disabling-in-production) with one line so no scope data is exposed in production builds.

## Browser support

LiteVue targets modern evergreen browsers. It relies on ES2015+ (`Proxy` above all, which cannot be polyfilled), so **IE11 is not supported and cannot be**. If you need legacy browsers, use Vue 2 with its own build tooling.

## Next steps

- [Installation](/start-here/installation) — CDN, npm, and mount options
- [State](/essentials/state) — how scopes and reactivity fit together
- [Directives](/directives/) — the full attribute reference
- [Coming from Alpine](/migration/from-alpine) · [Migrating from petite-vue](/migration/from-petite-vue)
