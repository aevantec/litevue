---
title: Directives
---

# Directives <Badge type="section" text="Directive" />

Attributes that give elements behavior. Vue users will recognize almost all of them; `v-teleport` and `v-name` are LiteVue additions, and `v-on` / `v-model` carry extra modifiers.

Two of them have a shorthand, and both spellings are equivalent — the examples
throughout these pages use the shorthand because it is what most code is
written in, but the full form is always available and is what a directive is
actually called:

| Full form | Shorthand |
| --- | --- |
| `v-bind:class="…"` | `:class="…"` |
| `v-on:click="…"` | `@click="…"` |

Modifiers attach to either spelling: `v-on:click.prevent` and `@click.prevent`
do the same thing.

| Directive                            | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| [v-scope](/directives/v-scope)       | declare a region and its state                                         |
| [v-bind](/directives/v-bind) (`:`)   | bind attributes, class, style                                          |
| [v-on](/directives/v-on) (`@`)       | events — with `.outside`, `.window`, `.debounce`, animation filters, … |
| [v-model](/directives/v-model)       | two-way form binding — with `.debounce`, `.fill`, …                    |
| [v-if](/directives/v-if)             | conditional mount/unmount (+ `v-else-if` / `v-else`)                   |
| [v-for](/directives/v-for)           | keyed list rendering                                                   |
| [v-show](/directives/v-show)         | toggle visibility via `display`                                        |
| [v-text](/directives/v-text)         | set `textContent`                                                      |
| [v-html](/directives/v-html)         | set `innerHTML`                                                        |
| [v-effect](/directives/v-effect)     | reactive inline statements                                             |
| [v-teleport](/directives/v-teleport) | render under a different parent                                        |
| [v-pre](/directives/v-pre)           | skip compilation                                                       |
| [v-once](/directives/v-once)         | render once, never update                                              |
| [v-cloak](/directives/v-cloak)       | hide until mounted                                                     |
| [ref](/directives/ref)               | register the element on `$refs`                                        |
| [v-name](/directives/v-name)         | name a scope for devtools                                              |

Plugins register additional directives — `v-transition`, `v-intersect`, `v-persist`, `v-focus`, `v-trap`, `v-collapse`, `v-mask` — see [Plugins](/plugins/).
