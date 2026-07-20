# [0.5.0](https://github.com/abiacarl/litevue) (2026-07-11)

First release of `litevue`, a fork continuing from petite-vue
0.4.1 (upstream history preserved below).

### Features

- **devtools:** registry on `window.__LITE_VUE__` (scopes, names, stores,
  events, `getScope` / `getScopeByName`) with production kill-switch
  (`disableDevtools()` / `window.__LITE_VUE_DEVTOOLS__ = false`)
- **devtools:** in-page inspector panel as a separate bundle — elements /
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
- **plugins:** first-party plugin bundle (`litevue/plugins`):
  `intersect`, `persist`, `focus` (incl. `v-trap` focus containment),
  `collapse`, `mask` (`v-mask` input masking), `transition` (Vue-style
  enter/leave classes on show/hide, `.appear`, and an unmount mode that
  animates `v-if`/`v-for` enter/leave)
- **core:** `v-teleport="selector"` — render an element under a different
  parent while keeping its scope; composes with `v-if`
- **core:** deferred block removal — leave transitions delay DOM removal
  and `@unmounted` until the animation completes
- **core:** `$root` magic property; `v-model.debounce[-ms]` and
  `v-model.fill` modifiers
- **plugins:** `autoInit` — auto-mounts `v-scope` roots added to the DOM
  after the initial mount (htmx swaps, `fetch` + `innerHTML`), into the
  same app so fragments share the root scope and `$store`
- **core:** `mount()` can be called repeatedly to add roots; `unmount()`
  tears down every mounted batch (previously only the last, leaking
  effects and listeners)

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

- published as `litevue` (the hyphenated `lite-vue` npm name is squatted);
  version continues from upstream 0.4.1 as 0.5.0
- toolchain upgraded: vite 5, TypeScript 5, prettier 3, Node >= 18;
  `@vue/reactivity` bumped to `~3.4.0`
- vitest + jsdom test suite (`pnpm test`), prettier `format` script, GitHub
  Actions CI

---

# Upstream petite-vue history

## [0.4.1](https://github.com/vuejs/petite-vue/compare/v0.4.0...v0.4.1) (2022-01-18)

### Bug Fixes

- custom delimiters in child contexts ([#90](https://github.com/vuejs/petite-vue/issues/90)) ([1bbd4d1](https://github.com/vuejs/petite-vue/commit/1bbd4d1c00c6c19f2ee6740e728fb274101fc6c9))

# [0.4.0](https://github.com/vuejs/petite-vue/compare/v0.3.0...v0.4.0) (2021-12-10)

### Breaking Changes

- require vue: prefix for lifecycle hooks ([a981928](https://github.com/vuejs/petite-vue/commit/a9819283f8504a9c2d0cea4d9d122028eba2d10d))

# [0.3.0](https://github.com/vuejs/petite-vue/compare/v0.2.3...v0.3.0) (2021-09-14)

### Bug Fixes

- fix parsing chained modifiers ([15f75e9](https://github.com/vuejs/petite-vue/commit/15f75e94db3ce1d3630d7ffc10e2db4748d94f3e))
- fix v-cloak on toggle ([#71](https://github.com/vuejs/petite-vue/issues/71)) ([f41981b](https://github.com/vuejs/petite-vue/commit/f41981b32ae4832e58223f55c209fd112dfbede7))
- v-for update on move ([#79](https://github.com/vuejs/petite-vue/issues/79)) ([9af4ea3](https://github.com/vuejs/petite-vue/commit/9af4ea35957053665e586556f7ffb90b9077db26))
- **v-model:** ensure v-model listeners are attached before v-on ([06d3aa7](https://github.com/vuejs/petite-vue/commit/06d3aa79b066410fe4e270b1a9dad65cb8d3fb97)), closes [#65](https://github.com/vuejs/petite-vue/issues/65)

### Features

- bind methods to context ([#74](https://github.com/vuejs/petite-vue/issues/74)) ([167c49d](https://github.com/vuejs/petite-vue/commit/167c49d6940c6f35c6002093d8807ac0e835dcea))
- custom delimiters ([eda903c](https://github.com/vuejs/petite-vue/commit/eda903c0a93fe048219b74b0a44064c87b553ad4))
