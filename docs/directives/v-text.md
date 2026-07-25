---
title: v-text
---

# v-text <Badge type="section" text="Directive" />

Sets the element's `textContent` from an expression — equivalent to mustache interpolation filling the whole element:

<<< ../.vitepress/demos/v-text.html{html}

<LiveDemo src="v-text" />

Useful when interpolation braces would flash before mount (see [v-cloak](/directives/v-cloak)) or conflict with a server templating language (see [custom delimiters](/essentials/templating#custom-delimiters)).
