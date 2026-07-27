# Contributing to litevue

Thanks for taking the time to contribute. `litevue` is a fork of
[petite-vue](https://github.com/vuejs/petite-vue) — a lightweight subset of Vue for
progressive enhancement. This document covers how to get set up, what we expect in
a pull request, and how releases work.

## Scope

Before proposing a feature, it helps to know what `litevue` is trying to be:

- **Small.** The core is ~8kb gzipped. Bundle size is a feature, not an
  afterthought — a change that grows it needs to earn the bytes.
- **Vue-aligned.** Syntax and semantics should match standard Vue wherever
  possible, so code can graduate to full Vue with minimal friction.
- **No build step required.** It has to keep working from a `<script>` tag.

Features that don't fit the core often fit the **plugin system**
(`app.use()` — see the [plugin docs](https://litevue.pages.dev/plugins/)). That's
what it's there for, and a third-party plugin needs no permission from us.

## Getting set up

Requires Node >= 18 and [pnpm](https://pnpm.io) 10 — the exact version is pinned in
the `packageManager` field, so `corepack enable` gets you the right one.

```bash
git clone https://github.com/aevantec/litevue.git
cd litevue
pnpm install
```

`npm install` and `yarn` will not work here: the lockfile is pnpm's, and npm
crashes outright when it meets a pnpm-created `node_modules`
(`Cannot read properties of null (reading 'matches')`). If you hit that, use
`pnpm install`.

Common commands:

```bash
pnpm dev        # manual test pages at localhost:3000
pnpm test       # vitest suite (test/)
pnpm test:watch # vitest in watch mode
pnpm build      # core + devtools + plugins bundles + types
pnpm docs:dev   # documentation site at localhost:5173
pnpm format     # prettier
```

## Repository layout

| Path | What's in it |
| --- | --- |
| `src/` | Library source — core, directives, plugins, devtools |
| `test/` | Automated tests (vitest + jsdom) — run by `pnpm test` |
| `playground/` | Manual HTML pages you open in a browser via `pnpm dev` |
| `docs/` | VitePress documentation site |
| `examples/` | Standalone usage examples, linked from the docs |
| `extension/` | Browser devtools extension |
| `scripts/` | Build and release tooling |

**Automated tests go in `test/`.** `playground/` holds hand-driven pages for the
behavior jsdom can't reproduce — transitions, focus order, caret position, the
devtools panel. Nothing there runs in CI; see [playground/README.md](playground/README.md).

## Making a change

1. Branch from `main` using a descriptive prefix: `feat/…`, `fix/…`, `docs/…`,
   `chore/…`.
2. Write the code, and **add a test in `test/`**. Bug fixes should include a test
   that fails before your fix.
3. Update the docs in `docs/` in the same PR if you changed anything user-facing.
   A feature without documentation isn't finished.
4. Run the full check locally before pushing:

   ```bash
   pnpm prettier --check "**/*.{ts,mts,js,html,json}"
   pnpm tsc --noEmit
   pnpm test
   pnpm build
   ```

5. Open a pull request against `main` and fill in the template.

PRs are **squash-merged**, so the PR title becomes the commit on `main` — it must
follow the commit convention below.

## Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/). This isn't
bureaucracy: releases, version numbers, and `CHANGELOG.md` are generated from these
messages automatically.

```
<type>(<scope>): <subject>

<optional body>

<optional footer, e.g. BREAKING CHANGE: …>
```

**Types:**

| Type | Use for | Effect on the next release |
| --- | --- | --- |
| `feat` | A new user-facing capability | minor version bump |
| `fix` | A bug fix | patch version bump |
| `perf` | A performance improvement | patch version bump |
| `refactor` | Internal change with no behavior change | none |
| `docs` | Documentation only | none |
| `test` | Tests only | none |
| `build`, `ci`, `chore` | Tooling, dependencies, config | none |

Add `!` after the type/scope, or a `BREAKING CHANGE:` footer, for anything
incompatible — that triggers a major bump (a minor while we're below 1.0.0).

**Scopes:** `core`, `directives`, `events`, `devtools`, `plugins`, `store`,
`types`, `docs`, `extension`.

**Examples:**

```
feat(plugins): add v-clipboard plugin
fix(events): clean up window listeners on unmount
docs(directives): document v-mask token syntax
feat(core)!: drop @vue:mounted alias in favor of @mounted
```

The PR title matters most: on a squash merge it's the only message that ends up in
history, and it's what determines the next version number. CI checks it and will
tell you what's wrong if it doesn't parse — subjects start with a lowercase letter,
and the scope, if you use one, comes from the list above.

## Reporting bugs

Open a [bug report](https://github.com/aevantec/litevue/issues/new/choose) and
include a **minimal reproduction** — a small HTML page, a
[StackBlitz](https://stackblitz.com), or a CodePen. Reports without one can't be
triaged and will be closed after 14 days of inactivity.

Questions and "how do I…" belong in
[Discussions](https://github.com/aevantec/litevue/discussions), not issues.

## Security

Do not open a public issue for a security vulnerability — see
[SECURITY.md](SECURITY.md) for private reporting, and for what does and doesn't
count as one.

## Releases

Releases are cut by the maintainers. Contributors never need to bump versions or
edit `CHANGELOG.md` — both are generated from the commit messages above, so a
well-formed commit is the whole of your part in it.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
