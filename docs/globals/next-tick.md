---
title: nextTick()
---

# nextTick() <Badge type="section" text="Global" />

Run code after pending updates have reached the DOM.

```js
import { nextTick } from '@aevantec/litevue';

state.items.push(newItem);
await nextTick();
list.lastElementChild.scrollIntoView();
```

## Signature

```ts
nextTick(callback?: () => void): Promise<void>
```

Pass a callback, or await the returned promise. In expressions, use
[`$nextTick`](/magics/next-tick).

## Examples

```js
state.open = true;
nextTick(() => document.querySelector('#dialog input').focus());
```

## Behavior

- LiteVue applies state changes to the DOM in one batch at the end of the current task. Code that reads the DOM straight after a change sees the old content.
- Runs after the batch that is pending when it is called. A change made inside the callback schedules a new batch.

## Related

[$nextTick](/magics/next-tick) · [watchEffect()](/globals/watch-effect)
