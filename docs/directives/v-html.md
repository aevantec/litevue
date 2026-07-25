---
title: v-html
---

# v-html <Badge type="section" text="Directive" />

Sets the element's `innerHTML` from an expression:

<<< ../.vitepress/demos/v-html.html{html}

<LiveDemo src="v-html" />

::: danger XSS
Never feed untrusted input to `v-html` — it renders raw HTML. Note that even markup injected through `v-html` stays inert as litevue templates: directives inside it are **not** compiled (see [Dynamic Content](/essentials/dynamic-content)), but plain HTML/script injection hazards still apply as with any `innerHTML`.
:::
