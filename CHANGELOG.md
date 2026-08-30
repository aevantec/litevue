# Changelog

## [0.5.6](https://github.com/aevantec/litevue/compare/v0.5.5...v0.5.6) (2026-08-30)


### Features

* **devtools:** name a scope after the component that produced it ([#88](https://github.com/aevantec/litevue/issues/88)) ([ac74753](https://github.com/aevantec/litevue/commit/ac747534585326d0122006b32c83d7573050e48b))
* **devtools:** resize the panel from a handle on the edge that moves ([#91](https://github.com/aevantec/litevue/issues/91)) ([8eeb3f1](https://github.com/aevantec/litevue/commit/8eeb3f1b9343111692dc7776d7c162272f061fb4))
* **plugins:** preserve nodes and report morph's lifecycle ([#90](https://github.com/aevantec/litevue/issues/90)) ([cede331](https://github.com/aevantec/litevue/commit/cede331da63f3d7caa9425b02aab00161ebbe0e3))


### Bug Fixes

* **devtools:** keep the floating panel inside the viewport ([#93](https://github.com/aevantec/litevue/issues/93)) ([8cb1fc7](https://github.com/aevantec/litevue/commit/8cb1fc78a793bdf892c1e0c63e657cc28c60ac92))

## [0.5.5](https://github.com/aevantec/litevue/compare/v0.5.4...v0.5.5) (2026-08-27)


### Features

* **devtools:** dock the panel to a viewport edge ([#71](https://github.com/aevantec/litevue/issues/71)) ([30ee6f0](https://github.com/aevantec/litevue/commit/30ee6f0924b4c42b8b03319a99b11a7fe3b63836))
* **devtools:** search within state, and collapse the scope tree ([#77](https://github.com/aevantec/litevue/issues/77)) ([b98572c](https://github.com/aevantec/litevue/commit/b98572c3117e98b877b6799edb6eb7b40e0f30bb))
* let a plugin return a teardown, and release media's subscriptions ([#67](https://github.com/aevantec/litevue/issues/67)) ([b9fc5d6](https://github.com/aevantec/litevue/commit/b9fc5d60371373ff3d44a934b3e6c2f57c11772e))
* register components by name with app.component() ([#79](https://github.com/aevantec/litevue/issues/79)) ([dd48a4c](https://github.com/aevantec/litevue/commit/dd48a4c4d046d4913223a8a66429642f4a72c99b))
* warn in development about mistakes that otherwise fail silently ([#78](https://github.com/aevantec/litevue/issues/78)) ([84f7f21](https://github.com/aevantec/litevue/commit/84f7f21235c42511de64aa7ca1ce3653c6a4e4ae))


### Bug Fixes

* cancel pending timers when a region is torn down ([#66](https://github.com/aevantec/litevue/issues/66)) ([e2ad921](https://github.com/aevantec/litevue/commit/e2ad9215d9f5d615ca684215c205927e63410388))
* **devtools:** keep the dragged position out of the docked layouts ([#72](https://github.com/aevantec/litevue/issues/72)) ([ff63c52](https://github.com/aevantec/litevue/commit/ff63c52630333be1d5612c5de7adc69c7479fd4f))
* **devtools:** stop flush events after disableDevtools() ([#81](https://github.com/aevantec/litevue/issues/81)) ([91763f9](https://github.com/aevantec/litevue/commit/91763f92309e6d37035fdc328f81e76b9a8bcda6))
* release effects and cleanups when a node is detached on its own ([#75](https://github.com/aevantec/litevue/issues/75)) ([6d2df87](https://github.com/aevantec/litevue/commit/6d2df87ac9b19e085a54fb7a0c071775a137590a))

## [0.5.4](https://github.com/aevantec/litevue/compare/v0.5.3...v0.5.4) (2026-08-20)


### Features

* **plugins:** add media for viewport-driven behaviour ([#54](https://github.com/aevantec/litevue/issues/54)) ([39a3474](https://github.com/aevantec/litevue/commit/39a3474cd4111da9ebe558f044d65c6bb93bc50a))
* tear down a single region with app.unmount(el) ([#49](https://github.com/aevantec/litevue/issues/49)) ([14bbf2d](https://github.com/aevantec/litevue/commit/14bbf2d3841a851e5645e8b3e4fbaab2231659cc))


### Bug Fixes

* **plugins:** warn when a second app replaces the page-wide media scale ([#61](https://github.com/aevantec/litevue/issues/61)) ([c38f76f](https://github.com/aevantec/litevue/commit/c38f76faf1ef0c3754c9cbcdc64b72c8f0acde03))


### Packaging

Both entries below are `refactor` commits, which the changelog config hides.
They are listed by hand because each adds public API.

* **plugins:** every first-party plugin now ships as its own module — an npm subpath `@aevantec/litevue/plugins/<name>` and a standalone `dist/plugins/<name>.iife.js`, so a page can load one plugin by URL instead of the whole set ([#51](https://github.com/aevantec/litevue/issues/51)) ([395957a](https://github.com/aevantec/litevue/commit/395957a))
* **plugins:** `v-resize` is its own plugin rather than part of media, at `@aevantec/litevue/plugins/resize` and the `LiteVueResize` global. The two share no code — different platform API, and the same split CSS draws between media and container queries ([#55](https://github.com/aevantec/litevue/issues/55)) ([4cedb87](https://github.com/aevantec/litevue/commit/4cedb87))

## [0.5.3](https://github.com/aevantec/litevue/compare/v0.5.2...v0.5.3) (2026-08-13)


### Features

* expose computed() for cached derived state ([5915164](https://github.com/aevantec/litevue/commit/5915164cd8ee9a3f8a5b6811b3ff0b51fecebdd3))
* **plugins:** add morph for in-place region updates ([d235b37](https://github.com/aevantec/litevue/commit/d235b376d7d5229e1822c2d7f7a9d1f24c300f54))


### Bug Fixes

* **deps:** pin @vue/shared to track @vue/reactivity ([3a270d1](https://github.com/aevantec/litevue/commit/3a270d19b9b504f45ceb5a4eb03f01c19e71479f))

## [0.5.2](https://github.com/aevantec/litevue/compare/v0.5.1...v0.5.2) (2026-07-31)


### Bug Fixes

* **build:** keep the core external in the plugins bundle ([#32](https://github.com/aevantec/litevue/issues/32)) ([2056079](https://github.com/aevantec/litevue/commit/20560797874f79114273cb67f60606192b1131cf))

## [0.5.1](https://github.com/aevantec/litevue/compare/v0.5.0...v0.5.1) (2026-07-27)

### Bug Fixes

* **ci:** make release-please tag and changelog match the repo ([#22](https://github.com/aevantec/litevue/issues/22)) ([5cc170a](https://github.com/aevantec/litevue/commit/5cc170a3098d78853db4bcfd5369c8488504276c))
* **docs:** serve the site from litevue.dev only ([#21](https://github.com/aevantec/litevue/issues/21)) ([d06b1b9](https://github.com/aevantec/litevue/commit/d06b1b9036c6dea4a3cc8ceabf36b994e4b3bf70))
* **docs:** update docs ([#19](https://github.com/aevantec/litevue/issues/19)) ([0b88307](https://github.com/aevantec/litevue/commit/0b88307450e322c68d8c331dd294028a5c9d979e))

## [0.5.0](https://github.com/aevantec/litevue) (2026-07-11)

First release of `litevue`, a fork continuing from petite-vue
0.4.1 (upstream history preserved below).

### Features

- **devtools:** registry on `window.__LITE_VUE__` (scopes, names, stores,
  events, `getScope` / `getScopeByName`) with production kill-switch
  (`disableDevtools()` / `window.__LITE_VUE_DEVTOOLS__ = false`)
- **devtools:** in-page inspector panel as a separate bundle, loadable by
  script tag (iife) or `import '@aevantec/litevue/devtools'` from npm (esm) — elements /
  stores tabs with live counts, name filter, tag-style labels, expandable
  state tree with inline editing (boolean checkboxes, read-only getters),
  hover highlight, pick mode, dark / light / system themes
- **devtools:** `v-name` attribute for naming scopes without an id
- **events:** new `v-on` modifiers `.window`, `.document`, `.outside`,
  `.debounce[-ms]`, `.throttle[-ms]`; animation event filters `.prop-*` /
  `.name-*`; `.once` / `.capture` / `.passive` pass through as listener
  options; window/document listeners are cleaned up on unmount
- **lifecycle:** hooks renamed to `@mounted` / `@unmounted` (legacy
  `@vue:mounted` / `@vue:unmounted` still work, deprecated)
- **core:** `createApp` accepts a setup function returning the root scope
- **core:** plugin system — `app.use(plugin, options)` with `App` /
  `Plugin` types and `app.scope` access
- **core:** global store — `store(name, value)` + `$store` magic, reactive
  registry, `init()` hook, reactive late registration
- **core:** magic properties `$dispatch`, `$watch` (scope-lifecycle-tied),
  `$id`
- **core:** `watchEffect(fn)` — JS-side reactive effects batched through the
  scheduler, returning a stop function (the `v-effect` counterpart for work
  not tied to an element); `persistStore()` is built on it
- **plugins:** first-party plugin bundle (`litevue/plugins`):
  `intersect`, `persist`, `focus` (incl. `v-trap` focus containment),
  `collapse`, `mask` (`v-mask` input masking), `transition` (Vue-style
  enter/leave classes on show/hide, `.appear`, and an unmount mode that
  animates `v-if`/`v-for` enter/leave)
- **plugins:** `persist` can narrow to specific properties
  (`v-persist:draft,to="key"`) and exports `persistStore(name, options?)`
  for persisting global stores from JS (returns a stop function; getters
  and methods are skipped; writes batched through the scheduler)
- **plugins:** persistence targets any storage — `localStorage` (default),
  `sessionStorage`, or a custom `getItem`/`setItem` object — selected per
  usage (`v-persist.session="key"`, `persistStore(n, { storage })`), by name
  via `registerStorage()`, or globally via `setDefaultStorage()`
- **core:** `v-teleport="selector"` — render an element under a different
  parent while keeping its scope; composes with `v-if`
- **core:** deferred block removal — leave transitions delay DOM removal
  and `@unmounted` until the animation completes
- **core:** `$root` magic property; `v-model.debounce[-ms]` and
  `v-model.fill` modifiers
- **core:** `mount()` can be called repeatedly to initialize dynamically
  added content into the same app (the `Alpine.initTree` equivalent);
  `unmount()` tears down every mounted batch (previously only the last,
  leaking effects and listeners). Injected markup is deliberately inert
  until explicitly mounted — automatic initialization of added DOM was
  rejected as a security hazard (HTML injection must not become
  expression execution)

### Bug Fixes

- scoped-context set trap recursed infinitely with `@vue/reactivity` >=
  3.2.46 (`hasOwn` instead of `target.hasOwnProperty`)
- shipped type declarations referenced `@vue/reactivity` while it was a
  devDependency, breaking all published types; it is now a runtime
  dependency and the `./plugins` subpath is fully typed
- bundles ship ASCII-only so icons render on pages without an explicit
  utf-8 charset
- `examples/todomvc.html` routing (broken upstream since the 0.4 lifecycle
  rename) works again via `@mounted`

### Build & Tooling

- brand name is written **LiteVue** in all display text — devtools panel and
  extension, dev-mode console messages, examples, tests and docs (the npm
  package, subpath imports, bundle filenames, `litevue:` storage prefix and
  `__LITE_VUE__` global keep their lowercase identifiers)
- devtools panel state keys renamed `lite-vue-devtools-*` →
  `litevue-devtools-*` (a stale pre-rebrand name; resets a saved panel
  position/theme once)

- published as `litevue` (the hyphenated `lite-vue` npm name is squatted);
  version continues from upstream 0.4.1 as 0.5.0
- toolchain upgraded: vite 5, TypeScript 5, prettier 3, Node >= 18;
  `@vue/reactivity` bumped to `~3.4.0`
- vitest + jsdom test suite (`pnpm test`), prettier `format` script, GitHub
  Actions CI
- VitePress documentation site in `docs/` (`pnpm docs:dev`) — Alpine-style
  structure with a page per directive/magic/plugin, section overview pages,
  an introduction covering Vue compatibility/limitations/security and CSP,
  migration guides (petite-vue, Alpine), brand theme, logo and section
  badges, and live interactive demos on every directive, magic and plugin
  page (30 in total, each running a real litevue app from the same file
  the code block shows); deployed to Cloudflare via `wrangler.jsonc`; README
  reduced to a quick start
- devtools browser extension (Chrome + Firefox MV3) in `extension/`,
  reading the registry via `chrome.devtools.inspectedWindow.eval`

---

Older history, from before the fork, lives in
[CHANGELOG-petite-vue.md](CHANGELOG-petite-vue.md).
