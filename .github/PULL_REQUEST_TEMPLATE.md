<!--
  The PR title becomes the commit message on main (we squash-merge), so it must
  follow Conventional Commits:

    feat(plugins): add v-clipboard plugin
    fix(events): clean up window listeners on unmount
    feat(core)!: drop @vue:mounted alias in favor of @mounted

  Types: feat | fix | perf | refactor | docs | test | build | ci | chore
  Scopes: core | directives | events | devtools | plugins | store | types | docs | extension
-->

## What does this change?

<!-- A sentence or two. Link the issue it closes: "Closes #123". -->

## Why?

<!-- The problem being solved, or the behavior that was wrong. -->

## Checklist

- [ ] The PR title follows [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Tests added or updated in `test/` (bug fixes include a test that fails without the fix)
- [ ] `pnpm test`, `pnpm tsc --noEmit`, and `pnpm build` pass locally
- [ ] Docs in `docs/` updated for any user-facing change
- [ ] I've checked the effect on bundle size (the core is ~8kb gzipped — say so if this moves it)

## Breaking change?

- [ ] No
- [ ] Yes — the title has `!` or the body has a `BREAKING CHANGE:` footer, and the
      migration path is described below

<!--
  If yes, describe what breaks and what users need to do:

  BREAKING CHANGE: @vue:mounted no longer fires. Use @mounted instead.
-->
