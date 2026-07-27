---
title: $store
---

# $store <Badge type="section" text="Magic" />

Access the [global stores](/globals/store) from any expression:

<<< ../.vitepress/demos/store.html{html}

<LiveDemo src="store" />

Stores are shared across every app on the page, fully reactive (getters included), and stores registered _after_ mount are picked up reactively by expressions that reference them.
