---
title: $nextTick
---

# $nextTick <Badge type="section" text="Magic" />

Run code after pending updates have reached the DOM.

```html
<button @click="open = true; $nextTick(() => $refs.input.focus())">Edit</button>
```

## Signature

```ts
$nextTick(callback?: () => void): Promise<void>
```

Also exported as [`nextTick()`](/globals/next-tick) for use outside templates.

## Examples

<<< ../.vitepress/demos/next-tick.html{html}

<LiveDemo src="next-tick" />

### Awaiting

```js
async save() {
  this.saving = true;
  await this.$nextTick();
  // the "Saving…" state is now on screen
}
```

## Behavior

- State changes are applied to the DOM in one batch at the end of the current task. Code that reads the DOM straight after a change sees the old content.
- Use it to focus, measure or scroll an element that a change just rendered.

## Related

[nextTick()](/globals/next-tick) · [$refs](/magics/refs) · [v-effect](/directives/v-effect)
