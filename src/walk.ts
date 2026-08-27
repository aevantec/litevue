import { builtInDirectives, Directive } from './directives';
import { _if } from './directives/if';
import { _for } from './directives/for';
import { bind } from './directives/bind';
import { on } from './directives/on';
import { text } from './directives/text';
import { evaluate } from './eval';
import { checkAttr } from './utils';
import { ref } from './directives/ref';
import { Context, createScopedContext } from './context';
import { registerScope } from './devtools';
import { own, setOwner } from './ownership';

const dirRE = /^(?:v-|:|@)/;
const modifierRE = /\.([\w-]+)/g;

export let inOnce = false;

/**
 * Registers a cleanup on both owners: the context, which tears down whole
 * regions, and the node being walked, so a subtree detached on its own is
 * released too. Dropping it from the context when the node goes keeps a
 * repeatedly re-mounted region from accumulating one spent entry per cycle.
 *
 * The list doubles as the record of what has already run. Disposing a subtree
 * can reach the same cleanup twice — once through the block root that owns it,
 * whose teardown drains this list, and again through the node it was
 * registered on — and a cleanup that runs twice removes a listener a later
 * re-mount installed.
 */
const addCleanup = (ctx: Context, cleanup: () => void) => {
  ctx.cleanups.push(cleanup);
  own(() => {
    const i = ctx.cleanups.indexOf(cleanup);
    if (i > -1) {
      ctx.cleanups.splice(i, 1);
      cleanup();
    }
  });
};

export const walk = (node: Node, ctx: Context): ChildNode | null | void => {
  // The node being walked owns whatever it acquires, so a subtree removed on
  // its own can be disposed. Restored on the way out so a nested walk does not
  // leave the cursor pointing at a child.
  const previousOwner = setOwner(node);
  try {
    return walkNode(node, ctx);
  } finally {
    setOwner(previousOwner);
  }
};

const walkNode = (node: Node, ctx: Context): ChildNode | null | void => {
  const type = node.nodeType;
  if (type === 1) {
    // Element
    const el = node as Element;
    if (el.hasAttribute('v-pre')) {
      return;
    }

    checkAttr(el, 'v-cloak');

    let exp: string | null;

    // v-if
    if ((exp = checkAttr(el, 'v-if'))) {
      return _if(el, exp, ctx);
    }

    // v-for
    if ((exp = checkAttr(el, 'v-for'))) {
      return _for(el, exp, ctx);
    }

    // v-name: devtools label for scopes on elements that shouldn't rely on
    // an id. Read after the v-if/v-for early returns so the attribute stays
    // in their templates, and stripped from every element so it never falls
    // through to directive processing.
    const name = checkAttr(el, 'v-name');

    // v-teleport: move the element under a different parent (literal CSS
    // selector) while it keeps rendering with its original scope. Processed
    // after the v-if/v-for early returns so it composes with them, and
    // removed from the target when the owning block unmounts.
    let teleportNext: ChildNode | null | undefined;
    if ((exp = checkAttr(el, 'v-teleport'))) {
      const target = document.querySelector(exp);
      if (target) {
        // hand the parent's child walk its original next sibling — after
        // the move, el.nextSibling points into the target instead
        teleportNext = el.nextSibling;
        // Block.insert must not pull a teleported block root back to the
        // original position
        (el as any).__teleported = true;
        target.appendChild(el);
        ctx.cleanups.push(() => el.remove());
      } else if (import.meta.env.DEV) {
        console.error(`v-teleport target "${exp}" not found.`);
      }
    }

    // v-scope
    if ((exp = checkAttr(el, 'v-scope')) || exp === '') {
      const scope = exp ? evaluate(ctx.scope, exp) : {};
      ctx = createScopedContext(ctx, scope);
      // stash the context so code that inserts markup into a live tree later
      // (the morph plugin) can walk it with the scope it landed in, instead of
      // guessing or falling back to the root
      (el as any).__ctx = ctx;
      // through addCleanup, not ctx.cleanups directly: the devtools registry
      // is a strong Map keyed by Element, so a scope root that is morphed away
      // without deregistering keeps both the detached element and its scope
      // object alive for the life of the page
      addCleanup(
        ctx,
        registerScope(el, ctx.scope, exp || undefined, name || undefined)
      );
      if (scope.$template) {
        resolveTemplate(el, scope.$template);
      }
    }

    // v-once
    const hasVOnce = checkAttr(el, 'v-once') != null;
    if (hasVOnce) {
      inOnce = true;
    }

    // ref
    if ((exp = checkAttr(el, 'ref'))) {
      applyDirective(el, ref, `"${exp}"`, ctx);
    }

    // process children first before self attrs
    walkChildren(el, ctx);

    // other directives
    const deferred: [string, string][] = [];
    for (const { name, value } of [...el.attributes]) {
      if (dirRE.test(name) && name !== 'v-cloak') {
        if (name === 'v-model') {
          // defer v-model since it relies on :value bindings to be processed
          // first, but also before v-on listeners (#73)
          deferred.unshift([name, value]);
        } else if (name[0] === '@' || /^v-on\b/.test(name)) {
          deferred.push([name, value]);
        } else {
          processDirective(el, name, value, ctx);
        }
      }
    }
    for (const [name, value] of deferred) {
      processDirective(el, name, value, ctx);
    }

    if (hasVOnce) {
      inOnce = false;
    }
    return teleportNext;
  } else if (type === 3) {
    // Text
    const data = (node as Text).data;
    if (data.includes(ctx.delimiters[0])) {
      let segments: string[] = [];
      let lastIndex = 0;
      let match;
      while ((match = ctx.delimitersRE.exec(data))) {
        const leading = data.slice(lastIndex, match.index);
        if (leading) segments.push(JSON.stringify(leading));
        segments.push(`$s(${match[1]})`);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < data.length) {
        segments.push(JSON.stringify(data.slice(lastIndex)));
      }
      applyDirective(node, text, segments.join('+'), ctx);
    }
  } else if (type === 11) {
    walkChildren(node as DocumentFragment, ctx);
  }
};

const walkChildren = (node: Element | DocumentFragment, ctx: Context) => {
  let child = node.firstChild;
  while (child) {
    child = walk(child, ctx) || child.nextSibling;
  }
};

const processDirective = (
  el: Element,
  raw: string,
  exp: string,
  ctx: Context
) => {
  let dir: Directive;
  let arg: string | undefined;
  let modifiers: Record<string, true> | undefined;

  // modifiers
  raw = raw.replace(modifierRE, (_, m) => {
    (modifiers || (modifiers = {}))[m] = true;
    return '';
  });

  if (raw[0] === ':') {
    dir = bind;
    arg = raw.slice(1);
  } else if (raw[0] === '@') {
    dir = on;
    arg = raw.slice(1);
  } else {
    const argIndex = raw.indexOf(':');
    const dirName = argIndex > 0 ? raw.slice(2, argIndex) : raw.slice(2);
    dir = builtInDirectives[dirName] || ctx.dirs[dirName];
    arg = argIndex > 0 ? raw.slice(argIndex + 1) : undefined;
  }
  if (dir) {
    if (dir === bind && arg === 'ref') dir = ref;
    applyDirective(el, dir, exp, ctx, arg, modifiers);
    el.removeAttribute(raw);
  } else if (import.meta.env.DEV) {
    console.error(`unknown custom directive ${raw}.`);
  }
};

const applyDirective = (
  el: Node,
  dir: Directive<any>,
  exp: string,
  ctx: Context,
  arg?: string,
  modifiers?: Record<string, true>
) => {
  const get = (e = exp) => evaluate(ctx.scope, e, el);
  // ctx.effect is passed through unwrapped: directives are applied while the
  // walk cursor still points at this element, so anything they create
  // synchronously is attributed correctly. v-effect is the one exception and
  // restores the cursor itself.
  const cleanup = dir({
    el,
    get,
    effect: ctx.effect,
    ctx,
    exp,
    arg,
    modifiers,
  });
  if (cleanup) {
    addCleanup(ctx, cleanup);
  }
};

const resolveTemplate = (el: Element, template: string) => {
  if (template[0] === '#') {
    const templateEl = document.querySelector(template);
    if (import.meta.env.DEV && !templateEl) {
      console.error(
        `template selector ${template} has no matching <template> element.`
      );
    }
    el.appendChild((templateEl as HTMLTemplateElement).content.cloneNode(true));
    return;
  }
  el.innerHTML = template;
};
