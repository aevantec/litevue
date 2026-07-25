---
title: $id
---

# $id <Badge type="section" text="Magic" />

Unique ids for accessibility attributes. Ids are **stable within a scope** — repeated calls with the same name return the same id, so label/input pairs match — and **unique across scopes**:

<<< ../.vitepress/demos/id.html{html}

<LiveDemo src="id" />

The Alpine equivalent is `x-id` / `$id`.
