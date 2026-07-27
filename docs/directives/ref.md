---
title: ref
---

# ref <Badge type="section" text="Directive" />

Registers the element on the scope's [`$refs`](/magics/refs) object:

<<< ../.vitepress/demos/ref.html{html}

<LiveDemo src="ref" />

Refs are scoped: nested `v-scope`s get their own `$refs` that inherit from the parent's. For a dynamic ref name, use the [`:ref` binding](/directives/v-bind#ref-binding).
