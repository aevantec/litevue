---
title: Magics
---

# Magics <Badge type="section" text="Magic" />

Magic properties are available in every expression — helpers for reaching the element, the scope tree, shared state, and timing.

| Magic | Purpose |
| --- | --- |
| [$el](/magics/el) | the current element |
| [$data](/magics/data) | the current scope object |
| [$root](/magics/root) | the app's root scope |
| [$refs](/magics/refs) | elements registered with `ref` |
| [$store](/magics/store) | the global stores |
| [$dispatch](/magics/dispatch) | fire a bubbling `CustomEvent` |
| [$watch](/magics/watch) | observe state with `(value, oldValue)` callbacks |
| [$nextTick](/magics/next-tick) | run after the next reactive flush |
| [$id](/magics/id) | stable unique ids for accessibility |

::: warning Reserved keys
These names (plus the internal `$s`) are set on every root scope — avoid using them as your own data keys.
:::
