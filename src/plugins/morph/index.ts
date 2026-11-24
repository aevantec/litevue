import type { Context } from '../../context';
import type { Plugin } from '../../app';

export interface MorphOptions {
  /**
   * Identity used to match children across the update. Defaults to `id`,
   * then `data-key`, then `data-id`.
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
  /**
   * Patch inside `document.startViewTransition()` where supported. The patch
   * then runs once the browser has captured the old view, not before `morph`
   * returns. Without the API it patches immediately, as if the option were off.
   */
  transition?: boolean;
  /**
   * Set `value`, `checked` and `selected` from the incoming markup, as a full
   * load would, so typed text gives way to the server's. Fields the client
   * binds, and `data-morph-skip` subtrees, keep theirs.
   */
  values?: boolean;
}

const preserved = (node: Node, opts: MorphOptions) =>
  node.nodeType === 1 &&
  ((node as Element).hasAttribute('data-morph-preserve') ||
    (node as any).__marker ||
    !!opts.preserve?.(node as Element));

const LAZY = '[v-scope\\.visible],[v-scope\\.idle],[v-scope\\.interaction]';

const dirRE = /^(?:v-|:|@)/;
const bindRE = /^(?::|v-bind:)/;
const clientStyleRE = /^v-(?!scope|on:)/;

const KEY_ATTRS = ['id', 'data-key', 'data-id'];

const defaultKey = (el: Element) => {
  for (const attr of KEY_ATTRS) {
    const value = el.getAttribute(attr);
    if (value != null) return attr + '=' + value;
  }
  return null;
};

const nearestCtx = (node: Node | null): Context | undefined => {
  for (let el = node as any; el; el = el.parentElement) {
    if (el.__ctx) return el.__ctx as Context;
  }
};

const ctxIn = (n: any): Context | undefined =>
  n.__ctx || [...(n.children || [])].map(ctxIn).find(Boolean);
const release = (node: Node, ctx: Context | undefined) =>
  (ctx || ctxIn(node))?.dispose?.(node);

const boundAttrs = (to: Element) => {
  const owned = new Set<string>();
  // the user opens and closes these; showModal() sets open on a dialog too
  if (to.matches('details,dialog')) owned.add('open');
  for (const { name } of to.attributes) {
    if (bindRE.test(name)) {
      const attr = name.replace(bindRE, '').split('.')[0];
      owned.add(
        /\.camel\b/.test(name)
          ? attr.replace(/-(\w)/g, (_, c) => c.toUpperCase())
          : attr
      );
    } else if (/^v-model\b/.test(name)) {
      owned.add('value');
      owned.add('checked');
    } else if (name === 'v-bind') {
      owned.add('*');
    } else if (clientStyleRE.test(name)) {
      owned.add('style');
      name == 'v-popover' && owned.add('popover');
    }
  }
  return owned;
};

const isBlockRoot = (el: Element) =>
  el.hasAttribute('v-for') ||
  el.hasAttribute('v-if') ||
  el.hasAttribute('v-else') ||
  el.hasAttribute('v-else-if');

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
  for (let c = to.firstElementChild; c; c = c.nextElementSibling) {
    if (isBlockRoot(c)) return true;
  }
  return false;
};

const FIELD_PROPS = ['Value', 'Checked', 'Selected'];

const syncValues = (from: any, to: any, owned: Set<string>) => {
  const ctl = boundAttrs(to.closest('select') || to);
  if (
    owned.has('*') ||
    ctl.has('*') ||
    ctl.has('value') ||
    from.type == 'output' ||
    (from.type == 'textarea' && to.value.includes('{{'))
  )
    return;
  for (const name of FIELD_PROPS) {
    const prop = name.toLowerCase();
    const init = 'default' + name;
    const src = name == 'Selected' ? init : prop;
    if (!owned.has(prop) && init in from && from[prop] !== to[src]) {
      from[prop] = to[src];
    }
  }
};

const patchAttrs = (from: Element, to: Element, values?: boolean) => {
  const owned = boundAttrs(to);
  if ((from as any).__anchor) owned.add('style');
  if (values) syncValues(from, to, owned);
  const bound = Object((from as any).__bound);

  for (const { name, value } of to.attributes) {
    if (dirRE.test(name) || owned.has(name) || name in bound) {
      continue;
    }
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }

  for (const { name } of [...from.attributes]) {
    if (owned.has('*') || owned.has(name) || to.hasAttribute(name)) continue;
    from.removeAttribute(name);
  }
};

const isInterpolation = (data: string, ctx?: Context) =>
  data.includes(ctx ? ctx.delimiters[0] : '{{');

const patchNode = (
  from: Node,
  to: Node,
  ctx: Context | undefined,
  opts: MorphOptions
): Node | void => {
  if (from.nodeType !== to.nodeType) return replaceNode(from, to, ctx, opts);

  if (from.nodeType === 3 || from.nodeType === 8) {
    const data = (to as Text).data;
    if (isInterpolation(data, ctx) && from.parentNode?.nodeName != 'SCRIPT')
      return;
    if (!(from as Text).data) return replaceNode(from, to, ctx, opts);
    if ((from as Text).data !== data) (from as Text).data = data;
    return;
  }

  if (from.nodeType !== 1) return;

  const a = from as Element;
  const b = to as Element;
  if (a.tagName !== b.tagName) return replaceNode(from, to, ctx, opts);
  if (opts.skip?.(a, b) || a.hasAttribute('data-morph-skip')) return;
  if (a.matches(LAZY))
    return a.isEqualNode(b) ? undefined : replaceNode(from, to, ctx, opts);

  patchAttrs(a, b, opts.values);
  if (
    a.tagName == 'TEMPLATE' &&
    !(a as HTMLTemplateElement).content.isEqualNode(
      (b as HTMLTemplateElement).content
    )
  )
    a.innerHTML = b.innerHTML;
  // Not Object.hasOwn, which raises the browser floor
  if (
    !ownsChildren(b) &&
    !Object.getOwnPropertyDescriptor(
      Object((a as any).__ctx?.scope),
      '$template'
    )
  ) {
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
  release(from, ctx);
  from.parentNode!.replaceChild(fresh, from);
  opts.afterNodeRemoved?.(from);
  mountNew(fresh, ctx);
  return fresh;
};

const mountNew = (node: Node, ctx: Context | undefined) => {
  if (node.parentElement?.closest(LAZY)) return;
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

  const keyed = new Map<string, Element>();
  for (let n = from.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1) {
      const k = key(n as Element);
      if (k == null) continue;
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

  const wanted = new Set<string | null | undefined>();
  for (let n = to.firstChild; n; n = n.nextSibling) wanted.add(keyOf(n));

  const drop = (node: ChildNode) => {
    if (!preserved(node, opts)) {
      release(node, ctx);
      from.removeChild(node);
      opts.afterNodeRemoved?.(node);
    }
  };

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

    if (
      (oldChild as Text)?.data === '' &&
      (newChild as Element).hasAttribute?.('v-teleport')
    ) {
      oldChild = oldChild!.nextSibling;
    } else if (wantKey != null) {
      const match = keyed.get(wantKey);
      if (match) {
        if (match === oldChild) {
          oldChild = oldChild.nextSibling;
        } else {
          from.insertBefore(match, oldChild);
        }
        keyed.delete(wantKey);
        patchNode(match, newChild, ctx, opts);
      } else {
        insert(newChild);
      }
    } else if (oldChild && keyOf(oldChild) == null) {
      if (preserved(oldChild, opts) && !preserved(newChild, opts)) {
        oldChild = oldChild.nextSibling;
        continue;
      }
      const nextOld = oldChild.nextSibling;
      patchNode(oldChild, newChild, ctx, opts);
      oldChild = nextOld;
    } else if (oldChild && !wanted.has(keyOf(oldChild))) {
      const nextOld = oldChild.nextSibling;
      drop(oldChild);
      oldChild = nextOld;
      continue;
    } else {
      insert(newChild);
    }
    newChild = nextNew;
  }

  while (oldChild) {
    const next = oldChild.nextSibling;
    drop(oldChild);
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
    const holder = document.createElement('template');
    // inside an <svg>, so SVG children are parsed in the SVG namespace
    const svg = from instanceof SVGElement;
    holder.innerHTML = svg ? `<svg>${to.trim()}</svg>` : to.trim();
    const content = svg
      ? (holder.content.firstChild as Element)
      : holder.content;
    target =
      content.childNodes.length === 1 && content.firstElementChild
        ? content.firstElementChild
        : (() => {
            const wrapper = from.cloneNode(false) as Element;
            wrapper.append(...content.childNodes);
            return wrapper;
          })();
  } else {
    target = to;
  }
  if (target) {
    const patch = () => {
      const restore = captureFocus();
      from = (patchNode(from, target!, nearestCtx(from.parentNode), opts) ||
        from) as Element;
      restore();
    };
    opts.transition && document.startViewTransition
      ? document.startViewTransition(patch)
      : patch();
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
