---
title: $refs
---

# $refs <Badge type="section" text="Magic" />

Elements registered with the [ref](/directives/ref) attribute, keyed by name:

<<< ../.vitepress/demos/refs.html{html}

<LiveDemo src="refs" />

Each `v-scope` gets its own `$refs` object that inherits from the parent scope's refs.
