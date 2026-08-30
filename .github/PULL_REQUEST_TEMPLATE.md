<!--
  The PR title becomes the commit message on main-next (we squash-merge), so it must
  follow Conventional Commits:

    feat(plugins): add v-clipboard plugin
    fix(events): clean up window listeners on unmount
    feat(core)!: drop @vue:mounted alias in favor of @mounted

  Types: feat | fix | perf | refactor | docs | test | build | ci | chore
  Scopes: core | directives | events | devtools | plugins | store | types | docs | extension
-->

## What's Changed?

<!--
  One bullet per change, in plain language. Each should read on its own to
  someone who has not seen the diff. Say what it does, not how it is built —
  "stops flush events after disableDevtools()", not "adds a guard to emitFlush".
  Numbers earn their place: sizes, counts, before and after.
-->

-

## Type of Change

<!--
  Feature     — new capability that did not exist
  Enhancement — worked before, works better now (refactors and performance too)
  Bug         — something was wrong and is now right
  Chore       — tooling, CI, dependencies, docs-only, tests-only

  List more than one when the PR genuinely does more than one thing.
-->

- **Feature** —

## Breaking change?

- [ ] No
- [ ] Yes — the title has `!` or the body has a `BREAKING CHANGE:` footer, and the
      migration path is described below

<!--
  If yes, describe what breaks and what users need to do:

  BREAKING CHANGE: @vue:mounted no longer fires. Use @mounted instead.
-->

<!--
  Before opening:
    pnpm test · pnpm test:browser · pnpm tsc --noEmit · pnpm build
    docs/ updated for anything user-facing
    a bug fix has a test that fails without it
    say so if this moves a bundle's size
-->
