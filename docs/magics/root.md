---
title: $root
---

# $root <Badge type="section" text="Magic" />

The app's root scope, reachable from any nested scope — read or write:

<<< ../.vitepress/demos/root.html{html}

<LiveDemo src="root" />

Writes through `$root` bypass the scope chain and land directly on the root scope.
