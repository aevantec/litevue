import type { Plugin } from '../app';

/**
 * autoInit — mounts v-scope roots that appear in the DOM after the initial
 * mount (htmx swaps, fetch + innerHTML, CMS embeds). Opt-in because a
 * page-wide MutationObserver costs bytes and surprise on the static pages
 * that are the common case.
 *
 * Added fragments are mounted into the *same app*, so they see the root
 * scope and `$store`. Elements the framework itself inserts (v-if branches,
 * v-for items, teleported nodes, `$template` content) are skipped without
 * any marker: walking strips the `v-scope` attribute synchronously, and
 * observer callbacks run afterwards, so already-initialized markup never
 * matches `[v-scope]` again.
 *
 * The observer lives for the lifetime of the page (installing a plugin has
 * no teardown); unmounted apps simply stop being useful targets.
 */
export const autoInit: Plugin = (app) => {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const el = node as Element;
        // re-check the live DOM: an earlier record in this batch may have
        // mounted (and stripped) this subtree already
        if (el.hasAttribute('v-scope') || el.querySelector('[v-scope]')) {
          app.mount(el);
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};
