---
title: $nextTick
---

# $nextTick <Badge type="magic" text="Magic" />

Runs a callback after the next reactive flush — when the DOM reflects the latest state:

```html
<div v-scope="{ open: false }">
  <button @click="open = true; $nextTick(() => $refs.panel.focus())">
    open and focus
  </button>
  <div ref="panel" tabindex="-1" v-show="open">…</div>
</div>
```

Also exported for JS use: `import { nextTick } from 'litevue'`.
