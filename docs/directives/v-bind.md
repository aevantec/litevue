---
title: v-bind
---

# v-bind <Badge type="section" text="Directive" />

Bind an attribute or DOM property to an expression.

```html
<img :src="avatarUrl" :alt="name" />
```

## Syntax

| Form | Meaning |
| --- | --- |
| `v-bind:name="expression"` | Bind one attribute or property |
| `:name="expression"` | Shorthand for the above |
| `v-bind="object"` | Bind every key of an object as an attribute |

### Modifiers

| Modifier | Meaning |
| --- | --- |
| `.camel` | Convert a kebab-case name to camelCase — `:view-box.camel` sets `viewBox` |

### Values

| Value | Property name (`disabled`, `value`, `title`) | Attribute only (`aria-*`, `data-*`) |
| --- | --- | --- |
| `true` / `false` | Assigned to the property; `false` clears a boolean such as `disabled` | Written as the string `"true"` / `"false"` |
| `null` / `undefined` | Assigned to the property — a string property such as `title` then reads `"null"` | Attribute removed |
| Anything else | Assigned to the property | Written as a string |

A name is treated as a property when the element has one by that name. SVG
elements, and `type`, `form`, `list`, `spellcheck` and `draggable`, always use
the attribute.

## Examples

<<< ../.vitepress/demos/v-bind.html{html}

<LiveDemo src="v-bind" />

### Class and style

`:class` accepts a string, an object or an array, and merges with the static
`class` attribute. `:style` accepts a string, an object or an array of objects.

```html
<span class="badge" :class="{ active: isOpen, muted: !enabled }"></span>
<div :style="{ color: theme.text, marginTop: gap + 'px' }"></div>
```

Style objects also take CSS custom properties and `!important`:

```html
<div :style="{ '--gap': gap + 'px', color: 'red !important' }"></div>
```

### Binding an object

Without an argument, each key becomes an attribute. Keys that disappear on a
later update are removed:

```html
<input v-bind="{ id: fieldId, 'aria-invalid': hasError, placeholder }" />
```

### Dynamic refs

`:ref` is handled by the [`ref`](/directives/ref) directive, so the ref name
can come from an expression:

```html
<input :ref="'field-' + name" />
```

## Behavior

- Dynamic argument names such as `:[name]` are not supported.
- For boolean attributes that are not properties, bind `null` to remove the attribute, since `false` is written as the string `"false"`: `:aria-hidden="open ? null : 'true'"`.
- `:value` also stores the raw value on the element, so [`v-model`](/directives/v-model) can read non-string option and checkbox values.
- Checkboxes read `:true-value` and `:false-value` as values rather than attributes — see `v-model`.

## Related

[v-model](/directives/v-model) · [ref](/directives/ref) · [Templating](/essentials/templating)
