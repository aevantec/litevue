---
title: Error Handling
---

# Error Handling <Badge type="section" text="Essentials" />

Expressions in attributes are evaluated at runtime, so a typo is not caught until the page runs. LiteVue catches those failures, reports them with enough context to find the cause, and lets you route them somewhere in production.

## In development

A failing expression names the directive, the element and the expression, and checks a missing identifier against the names actually in scope:

```
[litevue] error evaluating v-text
  expression: conter
  element:    <span#total>
  "conter" is not in scope — did you mean "counter"?
```

When nothing is close enough to suggest, it lists what the scope does offer instead:

```
  "zzzzzz" is not in scope. Available: counter, userName, items
```

The element is also logged as an object, so it is clickable in the browser's console and highlights in the DOM inspector.

An unknown directive reports the ones that exist, which usually means a plugin was not installed:

```
[litevue] unknown directive v-collapse on <div.panel>.
  Known directives: ref, v-bind, v-cloak, v-effect, v-for, v-html, …
  A directive from a plugin needs app.use(...) before mount().
```

::: tip These messages are development-only
The prose above is compiled out of the production build, so it costs your users nothing. `onError` below still runs in production — that part is deliberate.
:::

## What gets caught

| Phase | When |
|---|---|
| `expression` | a directive's expression or a `{{ }}` interpolation threw |
| `handler` | a [`v-on`](/directives/v-on) handler threw, or its promise rejected |
| `directive` | a directive's own setup threw |
| `compile` | the expression could not be parsed into a function at all |

`source` names the construct it came from — `v-if`, `v-for`, `v-scope`, `:key`, `v-effect`, `@click`, or `{{ }}` for a text interpolation — and an interpolation reports the text as you wrote it rather than the `$s(...)` form it compiles to.

Two of these are worth calling out.

**Event handlers.** An error thrown once the event fires happens long after the expression was bound, so it used to escape into the browser's listener machinery — a stack trace with no indication of which `@click` caused it. It is now attributed like any other failure.

**Async handlers.** A handler whose promise rejects was previously silent:

```html
<button @click="save()">Save</button>
```

```js
save() {
  return fetch('/api/save', { method: 'POST' }); // rejects if the network is down
}
```

The rejection is now reported with the same context as a synchronous throw. Return the promise from your method for this to work — a method that fires a request and returns nothing has nothing to observe.

## Recovering, not crashing

A failure is contained to the thing that failed. A broken expression yields `undefined` and the rest of the page still binds; a directive that throws during setup no longer aborts the walk, so the remaining elements are still processed; a failing `v-scope` falls back to an empty scope rather than taking the mount down with it; and a handler that throws does not stop later events from firing.

That keeps a single mistake from taking down a whole page — but it also means a silent `undefined` can be the only symptom, which is why the console output above is worth reading rather than ignoring.

## app.onError()

Register a handler to receive everything LiteVue catches. It runs in **both** development and production, which is what makes it the hook for monitoring:

```js
import { createApp } from '@aevantec/litevue';

const app = createApp({ count: 0 });

app.onError((err, info) => {
  Sentry.captureException(err, {
    tags: { phase: info.phase, directive: info.source },
    extra: { expression: info.expression },
  });
});

app.mount();
```

The second argument describes where the failure came from:

```ts
interface ErrorInfo {
  phase: 'expression' | 'handler' | 'directive' | 'compile';
  expression?: string; // as written in the attribute
  source?: string; // the attribute, e.g. 'v-text' or '@click'
  el?: Node; // the element it sits on
  scope?: Record<string, any>; // the scope it was evaluated against
}
```

It returns a function that unregisters:

```js
const stop = app.onError(report);
stop();
```

Several handlers may be registered and all of them run. One throwing does not prevent the others, nor hide the original error.

::: warning Without a handler, production still logs
If nothing is registered, a caught error is written to `console.error` so it is never swallowed entirely. Registering a handler takes over that responsibility — if yours discards the error, nothing else will report it.
:::

## Scope for what this covers

These are errors LiteVue catches while running your expressions. An error thrown in code it never sees — a `setTimeout` callback, a module's top level, a promise you created outside a handler — belongs to the page, not the framework, and needs `window.onerror` or `unhandledrejection` as usual.
