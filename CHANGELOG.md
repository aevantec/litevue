# Changelog

## [0.5.16](https://github.com/aevantec/litevue/compare/v0.5.15...v0.5.16) (2026-10-26)


### Bug Fixes

* deliver an error to every onError handler, and build v-for rows by index ([#211](https://github.com/aevantec/litevue/issues/211)) ([60a617b](https://github.com/aevantec/litevue/commit/60a617b0c4a374cc742ae9014fb1a351cad317df))
* **plugins:** keep the attributes a v-bind object binds through a morph ([#210](https://github.com/aevantec/litevue/issues/210)) ([63e5843](https://github.com/aevantec/litevue/commit/63e58438bceec862e5f23b7466f7e77f69c549e2))
* release teleported content when morph removes its region ([#209](https://github.com/aevantec/litevue/issues/209)) ([0234802](https://github.com/aevantec/litevue/commit/0234802cabc560cbc0862f75f89d11c6be987d57))
* report errors from handlers and setters a directive compiles ([#213](https://github.com/aevantec/litevue/issues/213)) ([4583037](https://github.com/aevantec/litevue/commit/4583037f669c4af9e3abf82123258935cadcbafd))

## [0.5.15](https://github.com/aevantec/litevue/compare/v0.5.14...v0.5.15) (2026-10-18)


### Behavior changes

* An element with an initial inline `display: none` and `v-show` or `v-transition` now shows when the expression is truthy; previously it stayed hidden ([#202](https://github.com/aevantec/litevue/issues/202))
* A text-like `v-model` field whose model is `undefined` is now empty instead of reading "undefined" ([#202](https://github.com/aevantec/litevue/issues/202))
* `v-bind="{ class: … }"` merges with the static `class` instead of replacing it ([#203](https://github.com/aevantec/litevue/issues/203))
* A string `:style` merges with the static `style` attribute instead of replacing it, and a falsy `:style` clears only the properties it set. A property set both statically and by the binding is cleared, not restored, when the binding drops it ([#203](https://github.com/aevantec/litevue/issues/203))
* Content after a nested `v-once` inside another `v-once` no longer updates ([#203](https://github.com/aevantec/litevue/issues/203))
* An invalid `v-teleport` or `$template` selector no longer throws from `mount()`; it is reported to `app.onError()` as a `directive` error ([#203](https://github.com/aevantec/litevue/issues/203))
* A root-scope `$watch`, from `app.scope.$watch()` or a root without `v-scope`, no longer runs after `app.unmount()` ([#204](https://github.com/aevantec/litevue/issues/204))


### Bug Fixes

* keep nested v-once static, keep static class and style under v-bind, report bad markup selectors ([#203](https://github.com/aevantec/litevue/issues/203)) ([48b6563](https://github.com/aevantec/litevue/commit/48b656311ee7373c8b66d29cfd7f996b0d2af140))
* show elements that start with display: none, and leave unset v-model fields empty ([#202](https://github.com/aevantec/litevue/issues/202)) ([3f39ee1](https://github.com/aevantec/litevue/commit/3f39ee188b47ca8ecff9006c2a64bd7a65d95251))
* stop root-scope watchers on a full unmount ([#204](https://github.com/aevantec/litevue/issues/204)) ([4857799](https://github.com/aevantec/litevue/commit/4857799b9ba739c705fc17e88c9fdcd7350a29de))

## [0.5.14](https://github.com/aevantec/litevue/compare/v0.5.13...v0.5.14) (2026-10-17)


### Behavior changes

* `v-mask` dispatches an `input` event on mount when it formats a prefilled `v-model` value, so the model holds the formatted value. An `@input` handler on the field runs once at mount in that case ([#195](https://github.com/aevantec/litevue/issues/195))
* `v-intersect.full.leave` runs when an element stops being fully visible, rather than when it leaves the viewport. `.leave` no longer runs on mount for an element that starts out of view ([#194](https://github.com/aevantec/litevue/issues/194))
* `v-collapse` sets `visibility: hidden` on collapsed content, so Tab skips it and screen readers do not read it; CSS that sets `visibility` on that element is overridden while it is collapsed ([#194](https://github.com/aevantec/litevue/issues/194))
* `v-trap` counts only elements Tab reaches, so when it activates, focus can land on a different first element than before, for example past a hidden input ([#193](https://github.com/aevantec/litevue/issues/193))


### Bug Fixes

* **plugins:** format v-mask's initial model value and keep the caret in place ([#195](https://github.com/aevantec/litevue/issues/195)) ([40a35df](https://github.com/aevantec/litevue/commit/40a35dfcab1d2efa0dd1775255a6ef9a03082261))
* **plugins:** hide collapsed content, keep v-transition's display, and time v-intersect's modifiers ([#194](https://github.com/aevantec/litevue/issues/194)) ([2432634](https://github.com/aevantec/litevue/commit/243263460b602eb4eaf6f62dafba8cbfafb1e643))
* **plugins:** wrap v-trap from the last element Tab reaches ([#193](https://github.com/aevantec/litevue/issues/193)) ([d8e08fd](https://github.com/aevantec/litevue/commit/d8e08fdc959b60ab477574752d45e06a9e4b67b1))

## [0.5.13](https://github.com/aevantec/litevue/compare/v0.5.12...v0.5.13) (2026-10-17)


### Behavior changes

* A navigate `POST` is URL-encoded unless the form has `enctype="multipart/form-data"`, as a full load sends it; a file input in a URL-encoded form sends its file name. A `text/plain` form is no longer intercepted, so the browser submits it with a full load ([#186](https://github.com/aevantec/litevue/issues/186))
* `navigate:before` is no longer cancelable on back and forward, since the URL has already changed when it fires; `preventDefault()` there has no effect. Cancelling a link or a form still keeps the user on the current page ([#187](https://github.com/aevantec/litevue/issues/187))


### Features

* **plugins:** mark navigate's pending navigation with aria-busy ([#187](https://github.com/aevantec/litevue/issues/187)) ([f67177c](https://github.com/aevantec/litevue/commit/f67177c59cb1023f0e8808f60094eda9f0d98319))
* **plugins:** prefetch navigate links on hover, focus or pointerdown ([#188](https://github.com/aevantec/litevue/issues/188)) ([005aa02](https://github.com/aevantec/litevue/commit/005aa02c6a86a541cf0ed6c3d25967d35e29ccda))


### Bug Fixes

* **plugins:** encode navigate forms as the browser does, and cap media's query lists ([#186](https://github.com/aevantec/litevue/issues/186)) ([48ec1b9](https://github.com/aevantec/litevue/commit/48ec1b9e5ebf42ef727282827907671c4242f690))

## [0.5.12](https://github.com/aevantec/litevue/compare/v0.5.11...v0.5.12) (2026-10-17)


### Behavior changes

* A `v-scope` root that morph removes outside every mounted scope now stops: its effects, `.document`/`.window`/`.outside` listeners and devtools entry go with it. A new `v-scope` that such a morph adds stays inert until `app.mount(el)`; the navigate plugin mounts them itself ([#175](https://github.com/aevantec/litevue/issues/175))
* Morph no longer adds or removes `open` on an existing `<details>` or `<dialog>`, so one the user opened stays open. To change it from the server, give the element a new `id` so morph replaces it, or bind `:open` to state ([#181](https://github.com/aevantec/litevue/issues/181))
* With CSS anchor positioning, a `v-anchor` element that is not a popover uses `position: absolute` instead of `fixed`, so an ancestor with `overflow: hidden` can clip it. Popovers are unchanged ([#183](https://github.com/aevantec/litevue/issues/183))
* `v-anchor` adds and removes only its own name in the trigger's `anchor-name`, so an inline name the author set is kept ([#180](https://github.com/aevantec/litevue/issues/180))


### Features

* **plugins:** add a navigate plugin for partial-page navigation ([#174](https://github.com/aevantec/litevue/issues/174)) ([4fb1750](https://github.com/aevantec/litevue/commit/4fb17506c0dddba82f5418f343974a5214e20e1a))
* **plugins:** merge the head and widen the route announcer in navigate ([#176](https://github.com/aevantec/litevue/issues/176)) ([cfe0b9e](https://github.com/aevantec/litevue/commit/cfe0b9ea90e254e8486afd3430279c667a863dd8))


### Bug Fixes

* **plugins:** fix navigate's scroll on back, double POST, autofocus and stylesheet onload ([#177](https://github.com/aevantec/litevue/issues/177)) ([7ce68fe](https://github.com/aevantec/litevue/commit/7ce68feda9b1544c946981f702ed1440fa20694e))
* **plugins:** keep open on details and dialog through a morph ([#181](https://github.com/aevantec/litevue/issues/181)) ([d028119](https://github.com/aevantec/litevue/commit/d028119cc0ed7404206b6eb5726abbfcc33f3834))
* **plugins:** let several v-anchor elements share one trigger ([#180](https://github.com/aevantec/litevue/issues/180)) ([d723bf6](https://github.com/aevantec/litevue/commit/d723bf6637570e3c3f33958967c90f758627cc33))
* **plugins:** position v-anchor elements that are not popovers absolutely ([#183](https://github.com/aevantec/litevue/issues/183)) ([988e5b9](https://github.com/aevantec/litevue/commit/988e5b92869749ddd3ab3f646241731540e49665))
* **plugins:** release scope roots morph removes outside every mounted scope ([#175](https://github.com/aevantec/litevue/issues/175)) ([8c878f8](https://github.com/aevantec/litevue/commit/8c878f8beeb49746224c3b1c9357092c15155d70))

## [0.5.11](https://github.com/aevantec/litevue/compare/v0.5.10...v0.5.11) (2026-10-16)


### Behavior changes

* An event handler whose expression contains the word `await` now compiles as an async function, so it returns a promise, and a rejection after the `await` reaches `app.onError()` rather than throwing synchronously. Handlers without `await` are unchanged ([#166](https://github.com/aevantec/litevue/issues/166))
* The devtools bundle grows from about 6kb to about 7kb gzipped to hold the plugins view. It is development-only and does not affect the core or plugin bundles ([#165](https://github.com/aevantec/litevue/issues/165))


### Features

* **devtools:** list installed plugins and what each one registered ([#165](https://github.com/aevantec/litevue/issues/165)) ([3f34256](https://github.com/aevantec/litevue/commit/3f342564ba9c33e5998e9e80858bbaa48dc73251))
* **directives:** allow await in event handlers ([#166](https://github.com/aevantec/litevue/issues/166)) ([967fb2e](https://github.com/aevantec/litevue/commit/967fb2eab1563154d7de0438263354072a203ecb))
* **plugins:** add a popover plugin with v-popover and v-anchor ([#167](https://github.com/aevantec/litevue/issues/167)) ([7213416](https://github.com/aevantec/litevue/commit/72134169af55863e2e7963c2c7bc133a6c3f9f91))
* **plugins:** add v-resize.window and v-resize.visual for viewport size ([#168](https://github.com/aevantec/litevue/issues/168)) ([fa5e2c8](https://github.com/aevantec/litevue/commit/fa5e2c8864b0cd8419c9905998811b167ffb0ddf))

## [0.5.10](https://github.com/aevantec/litevue/compare/v0.5.9...v0.5.10) (2026-10-16)


### Behavior changes

* On an element carrying a `v-` directive other than `v-scope` or `v-on`, such as `v-show` or `v-collapse`, morph keeps the live inline `style` and no longer applies the server's. Send server-driven styling as a class, or as a CSS custom property on the `v-scope` root ([#160](https://github.com/aevantec/litevue/issues/160))
* On an element with `v-bind="obj"`, morph no longer removes live attributes the server stopped sending. Attributes the server sends are still updated ([#160](https://github.com/aevantec/litevue/issues/160))
* Replacing every row of a large keyed `v-for` is about 5% slower, while changing a few rows is about three times faster: one row of 500 went from 9.7 ms to 2.9 ms ([#156](https://github.com/aevantec/litevue/issues/156))


### Features

* **plugins:** opt-in view transitions on morph with { transition: true } ([#158](https://github.com/aevantec/litevue/issues/158)) ([f33560b](https://github.com/aevantec/litevue/commit/f33560b3871224680c2109c7c42a7499561aa50e))


### Bug Fixes

* **plugins:** stop morph removing attributes that v-show, v-bind objects and plugin directives wrote ([#160](https://github.com/aevantec/litevue/issues/160)) ([9cc068e](https://github.com/aevantec/litevue/commit/9cc068e86da3d970eeeaeb4e0e2b4409025c8411))


### Performance

* **directives:** stop v-for building a scoped context for every row on every update ([#156](https://github.com/aevantec/litevue/issues/156)) ([561447b](https://github.com/aevantec/litevue/commit/561447b30471961660f3e64b44da52776e6860a9))

## [0.5.9](https://github.com/aevantec/litevue/compare/v0.5.8...v0.5.9) (2026-10-15)


### Features

* **core:** $watch returns a stop function and accepts { immediate } ([#150](https://github.com/aevantec/litevue/issues/150)) ([de9d496](https://github.com/aevantec/litevue/commit/de9d49654378ef95e16adece3a839723a10fbae3))


### Bug Fixes

* **core:** cap the compiled-expression cache so morph-heavy pages stop growing it ([#145](https://github.com/aevantec/litevue/issues/145)) ([2acb741](https://github.com/aevantec/litevue/commit/2acb741922101a5eca290b012d3fd928e0820090))
* **core:** run leave transitions on &lt;template v-if&gt; and &lt;template v-for&gt; blocks ([#141](https://github.com/aevantec/litevue/issues/141)) ([837f2b1](https://github.com/aevantec/litevue/commit/837f2b1776df1cb565388a8d839f7d9e938b18ad))
* **directives:** render nothing for an empty v-if ([#143](https://github.com/aevantec/litevue/issues/143)) ([de141c0](https://github.com/aevantec/litevue/commit/de141c0b15b0ef6876f8c165b16cb44ccda2e9f6))
* **plugins:** return $mq's fallback for a missing map in production too ([#147](https://github.com/aevantec/litevue/issues/147)) ([69c1a76](https://github.com/aevantec/litevue/commit/69c1a7675577e8cbdfbcbddad9fb8c94be4c1c97))

## [0.5.8](https://github.com/aevantec/litevue/compare/v0.5.7...v0.5.8) (2026-10-15)


### Features

* lazy mounting with v-scope.visible, .idle and .interaction ([#118](https://github.com/aevantec/litevue/issues/118)) ([15922b1](https://github.com/aevantec/litevue/commit/15922b13b257daa26b12e5f57e5b9778619deed6))


### Bug Fixes

* **core:** name the selector when mount() finds no matching element ([#131](https://github.com/aevantec/litevue/issues/131)) ([a39b643](https://github.com/aevantec/litevue/commit/a39b6434f76846f3f38e0015ec942dc39a6f3bdc))
* **core:** re-run an effect re-queued after it already ran in the flush ([#123](https://github.com/aevantec/litevue/issues/123)) ([a0e9ebb](https://github.com/aevantec/litevue/commit/a0e9ebb61405e60f506ee1fa686e53096ab230e8))
* **core:** stop a throwing scope getter from aborting the mount ([#125](https://github.com/aevantec/litevue/issues/125)) ([d0bab9c](https://github.com/aevantec/litevue/commit/d0bab9cfc9c517b2ca7d759050a9dea3515ce69a))
* **directives:** allow v-for and v-if as direct children of a &lt;template&gt; ([#122](https://github.com/aevantec/litevue/issues/122)) ([60c8c93](https://github.com/aevantec/litevue/commit/60c8c9323867851710515cc98291ece98bfb8004))
* **directives:** clear keys deleted from a v-bind or :style object mutated in place ([#129](https://github.com/aevantec/litevue/issues/129)) ([54f4506](https://github.com/aevantec/litevue/commit/54f450686fd62824b6fa694faba2ec8f3083f4a8))
* **directives:** keep an SVG element's static class when :class is bound ([#126](https://github.com/aevantec/litevue/issues/126)) ([f931c98](https://github.com/aevantec/litevue/commit/f931c98c1019c9147168ce2357d426ae9acdc5b2))
* **directives:** make v-model.trim.number convert the trimmed value to a number ([#127](https://github.com/aevantec/litevue/issues/127)) ([97b790a](https://github.com/aevantec/litevue/commit/97b790a3cde079028b56ee240c1ea63a6abbd2dc))
* **directives:** remove the attribute when v-bind sets a string DOM property to null ([#128](https://github.com/aevantec/litevue/issues/128)) ([3ffc52f](https://github.com/aevantec/litevue/commit/3ffc52f2db7eaae55d1ebde07a65ad53ac655e07))
* **directives:** render undefined as empty in v-html ([#130](https://github.com/aevantec/litevue/issues/130)) ([a4e3531](https://github.com/aevantec/litevue/commit/a4e35310b4ce141e8c92b467111818bf33de5b35))
* **directives:** stop &lt;select multiple&gt; v-model throwing on a non-array value; a non-array model, including a `Set`, now selects nothing and warns in development builds ([#132](https://github.com/aevantec/litevue/issues/132)) ([98a5397](https://github.com/aevantec/litevue/commit/98a5397a88ed2d3a72d9f9df6a6577f5a47f6780))

## [0.5.7](https://github.com/aevantec/litevue/compare/v0.5.6...v0.5.7) (2026-09-28)


### Highlights

* **A throwing watcher no longer freezes the page.** In every earlier version, a `$watch` callback or `watchEffect` that threw stopped all reactive updates on the page for good, and left dependency tracking paused. Each update is now contained, reported to `app.onError()`, and the rest keep running. Shipped inside the error-diagnostics feature, so it has no entry of its own below ([#108](https://github.com/aevantec/litevue/issues/108))
* **A `Map` or `Set` in state no longer crashes the production bundle.** `v-scope="{ m: new Map() }"` threw on mount. Collections now work as plain values: usable, but not tracked; assign a new one to update the page ([#110](https://github.com/aevantec/litevue/issues/110))
* **Development warnings reach users for the first time.** Every earlier build stripped them, including the new "did you mean" diagnostics. From npm, Vite and webpack 5 pick `litevue.dev.mjs` automatically while you develop; from a CDN, load `litevue.dev.iife.js`. See [Development builds](https://litevue.dev/start-here/installation#development-builds) ([#111](https://github.com/aevantec/litevue/issues/111))


### Behavior changes

* `@keydown.delete` now matches Backspace as well as Delete, as in Vue ([#113](https://github.com/aevantec/litevue/issues/113))
* The core is documented as ~10kb gzipped, up from ~9kb: 9,962 bytes against 9,413 in 0.5.6, mostly error diagnostics ([#108](https://github.com/aevantec/litevue/issues/108))


### Features

* publish development builds, so the warnings reach users ([#111](https://github.com/aevantec/litevue/issues/111)) ([9da882c](https://github.com/aevantec/litevue/commit/9da882ccc422bfa0509aeb22f75596db251f6ebe))
* report runtime errors with context, and an app.onError() hook ([#108](https://github.com/aevantec/litevue/issues/108)) ([7ff6b4b](https://github.com/aevantec/litevue/commit/7ff6b4b7f778438cc8bfd0049f9852f5cea7befe))


### Bug Fixes

* keep a v-for row's $id and $refs across list updates ([#99](https://github.com/aevantec/litevue/issues/99)) ([a557e7a](https://github.com/aevantec/litevue/commit/a557e7afe11aa82f521315211186cd0e57e2fdb4))
* **plugins:** hand the element back untouched when v-collapse tears down ([#106](https://github.com/aevantec/litevue/issues/106)) ([598aa3c](https://github.com/aevantec/litevue/commit/598aa3c89bc4a9cca649e6c48b4c5bb381c74d3d))
* remove directives written with modifiers once they are bound ([#112](https://github.com/aevantec/litevue/issues/112)) ([64e7bcb](https://github.com/aevantec/litevue/commit/64e7bcb5c53f778cadafd052150480c0a2287396))
* report a missing $template selector instead of throwing ([#104](https://github.com/aevantec/litevue/issues/104)) ([302bf62](https://github.com/aevantec/litevue/commit/302bf62fb2fe7af1e7581a6482d0b27cfa9d93fb))
* stop a Map or Set in state from crashing the production build ([#110](https://github.com/aevantec/litevue/issues/110)) ([ad1b2b0](https://github.com/aevantec/litevue/commit/ad1b2b06c3406f6ae54f14d53b01ee40d07ba949))
* support Vue's key aliases, and make .left/.right arrow keys on key events ([#113](https://github.com/aevantec/litevue/issues/113)) ([c8be545](https://github.com/aevantec/litevue/commit/c8be545238c4654a6ca1a0a03eb45843a887b15b))


### Documentation

`docs` commits are hidden by the changelog config; listed by hand because both change what users read.

* Every reference page restructured around one shape (summary, Syntax or Signature, Examples, Behavior, Related), with new pages for `reactive()`, `nextTick()` and writing a plugin, and previously undocumented behaviour written down ([#109](https://github.com/aevantec/litevue/issues/109))
* Sizes, links and content checked before this release: the issue templates linked a dead docs domain, and the README described neither new feature ([#115](https://github.com/aevantec/litevue/issues/115))

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
