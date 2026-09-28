---
title: Magics
---

# Magics <Badge type="section" text="Magic" />

`$`-prefixed helpers available in every expression, for reaching elements,
state, events and timing.

```html
<button @click="$dispatch('saved', $data)">Save</button>
```

## Reference

| Magic | Signature | Purpose |
| --- | --- | --- |
| [$el](/magics/el) | `Element` | The element the directive sits on |
| [$refs](/magics/refs) | `Record<string, Element>` | Elements registered with `ref` |
| [$data](/magics/data) | `object` | The current scope |
| [$root](/magics/root) | `object` | The app's root scope |
| [$store](/magics/store) | `Record<string, object>` | The global stores |
| [$watch](/magics/watch) | `(source, callback) => void` | Run a callback when one value changes |
| [$nextTick](/magics/next-tick) | `(callback?) => Promise` | Run after the DOM has updated |
| [$dispatch](/magics/dispatch) | `(event, detail?) => boolean` | Fire a bubbling custom event |
| [$id](/magics/id) | `(name?) => string` | A stable, unique id for accessibility attributes |

## In methods

Methods declared in a scope are bound to it, so the same helpers are reachable
through `this`:

```js
{
  async open() {
    this.expanded = true;
    await this.$nextTick();
    this.$refs.panel.focus();
  }
}
```

`$el` and `$dispatch` are the exception: they belong to the directive that is
running, so pass them in when a method needs them — `@click="save($el)"`.

::: warning Reserved names
Every scope defines these names, plus the internal `$s`. Do not use them as keys
in your own state.
:::
