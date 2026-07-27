---
title: $data
---

# $data <Badge type="section" text="Magic" />

The current scope object — handy for debugging and serialization:

<<< ../.vitepress/demos/data.html{html}

<LiveDemo src="data" />

Only the scope's own state serializes; inherited parent state and `$`-helpers are excluded.
