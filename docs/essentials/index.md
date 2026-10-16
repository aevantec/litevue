---
title: Essentials
---

# Essentials <Badge type="section" text="Essentials" />

The core concepts behind every LiteVue page: where state lives, how templates render it, when elements come and go, and how dynamically added markup becomes live. It builds to the pattern the rest of it is for, [server-driven HTML](/essentials/server-driven-html), followed by recipes for loading data and submitting forms, and by error handling.

| Page                                                 | What it covers                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| [State](/essentials/state)                           | Root scope, setup functions, nested scope inheritance                            |
| [Templating](/essentials/templating)                 | Interpolation, custom delimiters, hiding uncompiled templates                    |
| [Components](/essentials/components)                 | Reusable logic as functions, reusable markup via `$template`                     |
| [Lifecycle](/essentials/lifecycle)                   | `@mounted` / `@unmounted` element hooks                                          |
| [Dynamic Content](/essentials/dynamic-content)       | Initializing injected markup with `app.mount(el)` — and why it's opt-in          |
| [Server-Driven HTML](/essentials/server-driven-html) | The server renders, the client keeps state — with htmx, Turbo and Unpoly recipes |
| [Resources](/essentials/resources)                   | Loading data with loading, error and abort handling, and re-fetching on change   |
| [Forms](/essentials/forms)                           | Submitting forms with validation errors, from JSON or with server-rendered HTML  |
| [Error Handling](/essentials/error-handling)         | What LiteVue catches, how it reports it, and `app.onError()` for monitoring      |
