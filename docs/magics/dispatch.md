---
title: $dispatch
---

# $dispatch <Badge type="section" text="Magic" />

Fires a bubbling `CustomEvent` from the current element — the standard way for a child scope to notify a parent:

<<< ../.vitepress/demos/dispatch.html{html}

<LiveDemo src="dispatch" />

The second argument becomes `$event.detail`. Listen with plain [`v-on`](/directives/v-on) anywhere up the tree.
