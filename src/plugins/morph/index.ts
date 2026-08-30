import type { Context } from '../../context';
import type { Plugin } from '../../app';

/**
 * Update a live region in place from new HTML, instead of replacing it.
 *
 * Replacing markup destroys every element in the region — and with it every
 * scope, its state, and the browser state riding on those nodes: focus, caret,
 * selection, scroll, media playback, `<details open>`. Morphing patches only
 * the differences, so unchanged elements are never touched.
 */

export interface MorphOptions {
  /**
   * Identity used to match children across the update. Defaults to `id`.
   * Elements that match keep their DOM node (and therefore their scope);
   * unkeyed children fall back to matching by position.
   */
  key?: (el: Element) => string | null | undefined;
  /** Return true to leave a subtree completely untouched. */
  skip?: (from: Element, to: Element) => boolean;
  /**
   * Return true to keep an element the incoming HTML no longer contains.
   * `skip` cannot express this — it is only consulted for a matched pair, so
   * it never sees one the server stopped sending, which is exactly the case a
   * client-only widget hits. `data-morph-preserve` does the same declaratively.
   */
  preserve?: (el: Element) => boolean;
  /**
   * Called before a node is inserted. Return `false` to leave it out.
   */
  beforeNodeAdded?: (node: Node) => boolean | void;
  /**
   * Called after a node has been removed, once its effects and listeners are
   * released — so what arrives here is inert, not a live subtree.
   */
  afterNodeRemoved?: (node: Node) => void;
}

/**
 * A `data-` attribute rather than `v-preserve`: an unrecognised `v-` attribute
 * logs an unknown-directive error, and registering one would have the walker
 * strip it, leaving nothing for the next morph. Matches `data-morph-skip`.
 */
const preserved = (node: Node, opts: MorphOptions) =>
  node.nodeType === 1 &&
  ((node as Element).hasAttribute('data-morph-preserve') ||
    !!opts.preserve?.(node as Element));

const dirRE = /^(?:v-|:|@)/;
const bindRE = /^(?::|v-bind:)/;

/**
 * Attributes tried in order when no `key` option is given. All three express
 * identity, so none repeat among siblings the way `name` does on a radio group
 * — hence its absence. The attribute name is part of the key, so `id="5"` and
 * `data-id="5"` stay distinct.
 */
const KEY_ATTRS = ['id', 'data-key', 'data-id'];

const defaultKey = (el: Element) => {
  for (const attr of KEY_ATTRS) {
    const value = el.getAttribute(attr);
    if (value != null) return attr + '=' + value;
  }
  return null;
};

/**
 * The nearest stashed context, walking up from a live node. `v-scope` elements
 * record theirs during walk, so inserted markup binds with the scope it landed
 * in rather than the root.
 */
const nearestCtx = (node: Node | null): Context | undefined => {
  for (let el = node as any; el; el = el.parentElement) {
    if (el.__ctx) return el.__ctx as Context;
  }
};

/**
 * Attributes the client owns, read from the *incoming* markup — it still
 * carries the directives the live DOM had stripped. `:class` there means the
 * live `class` is bound and must survive the server's static value.
 */
const boundAttrs = (to: Element) => {
  const owned = new Set<string>();
  for (const { name } of to.attributes) {
    if (bindRE.test(name)) {
      // strip modifiers: :class.camel -> class
      owned.add(name.replace(bindRE, '').split('.')[0]);
    } else if (name === 'v-model') {
      owned.add('value');
      owned.add('checked');
    }
  }
  return owned;
};

/**
 * `v-for` and `v-if` render into Blocks: the live DOM holds anchors plus the
 * clones the data produced, while the server still sends one template. Matched
 * positionally, the rest would be deleted as "no longer sent".
 */
const isBlockRoot = (el: Element) =>
  el.hasAttribute('v-for') ||
  el.hasAttribute('v-if') ||
  el.hasAttribute('v-else') ||
  el.hasAttribute('v-else-if');

/** True when the client, not the server, decides this element's contents. */
const ownsChildren = (to: Element) => {
  if (
    to.hasAttribute('v-text') ||
    to.hasAttribute('v-html') ||
    to.hasAttribute('v-pre') ||
    to.hasAttribute('v-once') ||
    isBlockRoot(to)
  ) {
    return true;
  }
  // a container hosting a block belongs to the client as a whole
  for (let c = to.firstElementChild; c; c = c.nextElementSibling) {
    if (isBlockRoot(c)) return true;
  }
  return false;
};

const patchAttrs = (from: Element, to: Element) => {
  const owned = boundAttrs(to);

  for (const { name, value } of [...to.attributes]) {
    // directives were stripped from the live element during walk; re-adding
    // them leaves inert markup, or double-binds on a later walk
    if (dirRE.test(name) || owned.has(name)) continue;
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }

  for (const { name } of [...from.attributes]) {
    if (owned.has(name) || to.hasAttribute(name)) continue;
    from.removeAttribute(name);
  }
};

/**
 * Incoming text still holding `{{ }}` is rendered by a text directive on the
 * live side, so the live value wins.
 */
const isInterpolation = (data: string, ctx?: Context) =>
  data.includes(ctx ? ctx.delimiters[0] : '{{');

const patchNode = (
  from: Node,
  to: Node,
  ctx: Context | undefined,
  opts: MorphOptions
): void => {
  if (from.nodeType !== to.nodeType) return replaceNode(from, to, ctx, opts);

  if (from.nodeType === 3 || from.nodeType === 8) {
    const data = (to as Text).data;
    if (isInterpolation(data, ctx)) return;
    if ((from as Text).data !== data) (from as Text).data = data;
    return;
  }

  if (from.nodeType !== 1) return;

  const a = from as Element;
  const b = to as Element;
  // a different tag can't be patched into place
  if (a.tagName !== b.tagName) return replaceNode(from, to, ctx, opts);
  if (opts.skip?.(a, b) || a.hasAttribute('data-morph-skip')) return;

  patchAttrs(a, b);
  if (!ownsChildren(b)) {
    patchChildren(a, b, (a as any).__ctx || ctx, opts);
  }
};

const replaceNode = (
  from: Node,
  to: Node,
  ctx: Context | undefined,
  opts: MorphOptions
) => {
  if (preserved(from, opts)) return;
  const fresh = to.cloneNode(true);
  if (opts.beforeNodeAdded?.(fresh) === false) return;
  // replaceChild detaches as surely as removeChild, so release first
  ctx?.dispose?.(from);
  from.parentNode!.replaceChild(fresh, from);
  opts.afterNodeRemoved?.(from);
  mountNew(fresh, ctx);
};

/**
 * Bind never-walked markup with the scope it was inserted into. The walker
 * comes off the context, not an import, so this plugin doesn't pull a second
 * copy of the core into the plugins bundle.
 */
const mountNew = (node: Node, ctx: Context | undefined) => {
  const target = ctx || nearestCtx(node.parentNode);
  target?.walk?.(node, target);
};

const patchChildren = (
  from: Element,
  to: Element,
  ctx: Context | undefined,
  opts: MorphOptions
) => {
  const key = opts.key || defaultKey;

  // index the live children that carry a key, so a reordered or
  // newly-prepended server list still reuses the matching live nodes
  const keyed = new Map<string, Element>();
  for (let n = from.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1) {
      const k = key(n as Element);
      if (k == null) continue;
      // a repeated key costs the earlier element its node, and its scope
      // state with it — say so rather than losing it quietly
      if (import.meta.env.DEV && keyed.has(k)) {
        console.warn(
          `[morph] duplicate key ${JSON.stringify(k)} among siblings; ` +
            `only the last is reusable. Keys must be unique within a parent.`
        );
      }
      keyed.set(k, n as Element);
    }
  }

  const keyOf = (n: Node | null) =>
    n && n.nodeType === 1 ? key(n as Element) : null;

  let oldChild = from.firstChild;
  let newChild = to.firstChild;

  const insert = (node: Node) => {
    const fresh = node.cloneNode(true);
    if (opts.beforeNodeAdded?.(fresh) === false) return;
    from.insertBefore(fresh, oldChild);
    mountNew(fresh, ctx);
  };

  while (newChild) {
    const nextNew = newChild.nextSibling;
    const wantKey = keyOf(newChild);

    if (wantKey != null) {
      const match = keyed.get(wantKey);
      if (match) {
        // reuse the live node, moving it if the server reordered it
        if (match === oldChild) {
          oldChild = oldChild.nextSibling;
        } else {
          from.insertBefore(match, oldChild);
        }
        keyed.delete(wantKey);
        patchNode(match, newChild, ctx, opts);
      } else {
        // a key with no live counterpart is genuinely new; patching it over
        // this position would hand one row's identity, and scope, to another
        insert(newChild);
      }
    } else if (oldChild && keyOf(oldChild) == null) {
      // unkeyed on both sides: match by position
      const nextOld = oldChild.nextSibling;
      patchNode(oldChild, newChild, ctx, opts);
      oldChild = nextOld;
    } else {
      // never consume a keyed live node for an unkeyed slot: it belongs to a
      // later position and would lose its scope here
      insert(newChild);
    }
    newChild = nextNew;
  }

  // Whatever the server no longer sends. Every reused node was moved ahead of
  // this cursor, so the remainder is genuinely unmatched — sweeping the key
  // map instead would delete nodes that were matched positionally.
  while (oldChild) {
    const next = oldChild.nextSibling;
    if (!preserved(oldChild, opts)) {
      // release what the subtree owned first: removeChild alone leaves its
      // effects live and still reacting
      ctx?.dispose?.(oldChild);
      from.removeChild(oldChild);
      opts.afterNodeRemoved?.(oldChild);
    }
    oldChild = next;
  }
};

/**
 * morph(from, to) — patch `from` in place so it matches `to`, which may be an
 * element or an HTML string for the *outer* element.
 */
export const morph = (
  from: Element,
  to: Element | string,
  opts: MorphOptions = {}
): Element => {
  let target: Element | null;
  if (typeof to === 'string') {
    // parsed in a <template> so table rows, <li> and <option> survive; a
    // single-element fragment is the outer target
    const holder = document.createElement('template');
    holder.innerHTML = to.trim();
    const content = holder.content;
    target =
      content.childElementCount === 1
        ? content.firstElementChild
        : (() => {
            const wrapper = from.cloneNode(false) as Element;
            wrapper.appendChild(content);
            return wrapper;
          })();
  } else {
    target = to;
  }
  if (target) {
    const restore = captureFocus();
    patchNode(from, target, nearestCtx(from), opts);
    restore();
  }
  return from;
};

/**
 * `insertBefore` blurs the node it moves, so a reorder drops focus even though
 * the element survived. Re-focus afterwards and restore the caret. Only
 * observable in a real browser — jsdom does not blur on move.
 */
const captureFocus = () => {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return () => {};
  const field = active as HTMLInputElement;
  let start: number | null = null;
  let end: number | null = null;
  try {
    // throws on input types that don't expose a selection (email, number, …)
    start = field.selectionStart;
    end = field.selectionEnd;
  } catch {}

  return () => {
    if (active === document.activeElement || !active.isConnected) return;
    active.focus();
    if (start !== null) {
      try {
        field.setSelectionRange(start, end);
      } catch {}
    }
  };
};

/**
 * Registers `$morph`, so a template can update a region from a fetch response
 * without dropping into JavaScript.
 */
export const morphPlugin: Plugin = (app) => {
  app.scope.$morph = morph;
};
