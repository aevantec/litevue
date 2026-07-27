# Security Policy

## Supported versions

Security fixes go into the latest published minor version. If you're on an older
one, upgrading is the fix.

## Reporting a vulnerability

**Do not open a public issue.** Report privately through
[GitHub security advisories](https://github.com/aevantec/litevue/security/advisories/new).

Please include a description of the issue, steps to reproduce (a minimal HTML page
is ideal), and the affected version. We'll acknowledge within 72 hours and credit
you in the advisory unless you'd rather stay anonymous.

## What isn't a vulnerability

`litevue` evaluates expressions found in HTML attributes — `v-scope`, `@click`,
`{{ }}` — by design, inherited from petite-vue. So:

- **Never mount `litevue` on markup built from untrusted input.** Expressions in
  attacker-controlled HTML will be evaluated as code. Sanitize before it reaches
  the DOM.
- Expression evaluation uses `new Function()`, so a CSP without `'unsafe-eval'`
  blocks it. See the
  [security and CSP notes](https://litevue.dev/start-here/introduction).

Reports of the above will be closed as working-as-documented. In scope: escaping
the intended scope of an expression, prototype pollution, bypassing the devtools
production kill-switch to reach application state, or getting content that should
have stayed inert to execute.
