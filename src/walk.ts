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
import { disposeSubtree, own, setOwner } from './ownership';
import { describeEl, handleError } from './errors';
import { deferScope } from './lazy';

const dirRE = /^(?:v-|:|@)/;
const modifierRE = /\.([\w-]+)/g;

export let inOnce = false;

/**
 * Registers a cleanup on both owners: the context, for whole-region teardown,
 * and the walked node, for a subtree detached on its own. Dropping the entry
 * when the node goes keeps a re-mounted region from accumulating spent ones.
 *
 * The `indexOf` guard also makes this run-once. A subtree can reach the same
 * cleanup twice — via the block root, whose teardown drains `ctx.cleanups`,
 * and via the node — and a second run would remove a listener the next mount
 * installed.
 */
const addCleanup = (ctx: Context, cleanup: () => void, node?: Node) => {
  ctx.cleanups.push(cleanup);
  own(() => {
    const i = ctx.cleanups.indexOf(cleanup);
    if (i > -1) {
      ctx.cleanups.splice(i, 1);
      cleanup();
    }
  }, node);
};

// A deferred region walks after the original walk has reset inOnce, so it
// carries the value it was deferred under.
const walkDeferred = (node: Node, ctx: Context, once: boolean) => {
  const previous = inOnce;
  inOnce = once;
  try {
    walk(node, ctx);
  } finally {
    inOnce = previous;
  }
};

export const walk = (node: Node, ctx: Context): ChildNode | null | void => {
  // Own what this node acquires, so a subtree removed on its own can be
  // disposed. Restored on exit so a nested walk leaves the cursor intact.
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

    // v-scope.visible / .idle / .interaction defer the whole subtree — ahead
    // of v-cloak, which must stay on the element until the region mounts, or
    // its raw {{ }} shows while it waits.
    if (deferScope(el, ctx, walkDeferred, inOnce)) return;

    checkAttr(el, 'v-cloak');

    let exp: string | null;

    // v-if; `!= null` so an empty v-if="" reaches _if, which reads it as false
    if ((exp = checkAttr(el, 'v-if')) != null) {
      return _if(el, exp, ctx);
    }

    // v-for
    if ((exp = checkAttr(el, 'v-for'))) {
      return _for(el, exp, ctx);
    }

    // v-name: devtools label for scopes without an id. Read after the
    // v-if/v-for early returns so it survives in their templates, and stripped
    // everywhere so it never reaches directive processing.
    const name = checkAttr(el, 'v-name');

    // v-teleport: reparent the element (literal CSS selector) while it keeps
    // its original scope. After the v-if/v-for early returns so it composes
    // with them; removed from the target when the owning block unmounts.
    let teleportNext: ChildNode | null | undefined;
    if ((exp = checkAttr(el, 'v-teleport'))) {
      const target = query(exp, el, 'v-teleport');
      if (target) {
        // hand the parent's child walk its original next sibling — after
        // the move, el.nextSibling points into the target instead
        teleportNext = el.nextSibling;
        // A marker holds the original place, so disposing that subtree still
        // reaches the element. A block root has no parent yet; Block.insert
        // places its marker.
        const marker = ((el as any).__marker = new Text(''));
        el.before(marker);
        target.appendChild(el);
        addCleanup(
          ctx,
          () => {
            disposeSubtree(el);
            el.remove();
          },
          marker
        );
      } else if (import.meta.env.DEV && target === null) {
        console.error(`v-teleport target "${exp}" not found.`);
      }
    }

    // v-scope
    if ((exp = checkAttr(el, 'v-scope')) || exp === '') {
      // `|| {}`: a throwing expression evaluates to undefined, and reading
      // $template off that would take down the whole mount, not one region
      const scope =
        (exp ? evaluate(ctx.scope, exp, el, { source: 'v-scope', el }) : {}) ||
        {};
      ctx = createScopedContext(ctx, scope);
      // stashed so code inserting markup into a live tree later (the morph
      // plugin) walks it with the scope it landed in, not the root
      (el as any).__ctx = ctx;
      // via addCleanup, not ctx.cleanups: the devtools registry is a strong
      // Map keyed by Element, so a scope root morphed away without
      // deregistering leaks the element and its scope for the page's life
      addCleanup(
        ctx,
        registerScope(el, ctx.scope, exp || undefined, name || undefined)
      );
      if (scope.$template) {
        resolveTemplate(el, scope.$template);
      }
    }

    // v-once; restored on exit rather than cleared, so a nested v-once
    // cannot end the region around it
    const wasOnce = inOnce;
    if (checkAttr(el, 'v-once') != null) {
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
        if (name === 'v-model' || name.startsWith('v-model.')) {
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

    inOnce = wasOnce;
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
      applyDirective(
        node,
        text,
        segments.join('+'),
        ctx,
        undefined,
        undefined,
        '{{ }}',
        data.trim()
      );
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
  // the attribute as written, modifiers included: what diagnostics quote and
  // what must be removed — the stripped name below never existed on the element
  const source = raw;

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
    applyDirective(el, dir, exp, ctx, arg, modifiers, source);
    el.removeAttribute(source);
  } else if (import.meta.env.DEV) {
    // The structural ones are consumed directly in walk() rather than living
    // in builtInDirectives, so listing only that map would have told the
    // reader that v-if and v-for do not exist.
    const known = [
      'v-scope',
      'v-if',
      'v-for',
      'v-once',
      'v-pre',
      'v-cloak',
      'v-teleport',
      'v-name',
      'ref',
      ...Object.keys(builtInDirectives).map((d) => 'v-' + d),
      ...Object.keys(ctx.dirs).map((d) => 'v-' + d),
    ].sort();
    console.error(
      `[litevue] unknown directive ${source} on ${describeEl(el)}.\n` +
        `  Known directives: ${known.join(', ')}.\n` +
        `  A directive from a plugin needs app.use(...) before mount().`
    );
  }
};

const applyDirective = (
  el: Node,
  dir: Directive<any>,
  exp: string,
  ctx: Context,
  arg?: string,
  modifiers?: Record<string, true>,
  source?: string,
  displayExp?: string
) => {
  const meta = { source, el, expression: displayExp };
  const report = (err: unknown) =>
    handleError(err, {
      phase: 'handler',
      source,
      el,
      expression: exp,
      scope: ctx.scope,
    });
  // Code a directive compiles itself is a handler or setter, called later from
  // an event or observer, outside evaluate's containment. Its calls report
  // throws and rejections; `get()` of the directive's own value is untouched.
  const get = (code?: string) => {
    const value = evaluate(ctx.scope, code ?? exp, el, meta);
    return code && typeof value == 'function'
      ? (...args: any[]) => {
          try {
            const result = value(...args);
            // only a real Promise: a thenable may be a lazy query builder
            if (result instanceof Promise) result.catch(report);
            return result;
          } catch (err) {
            report(err);
          }
        }
      : value;
  };
  // ctx.effect is passed through unwrapped: directives are applied while the
  // walk cursor still points at this element, so anything they create
  // synchronously is attributed correctly. v-effect is the one exception and
  // restores the cursor itself.
  let cleanup;
  try {
    cleanup = dir({
      el,
      get,
      effect: ctx.effect,
      ctx,
      exp,
      arg,
      modifiers,
    });
  } catch (e) {
    // contained, so one throwing setup cannot abort the walk and leave the
    // rest of the page unbound
    handleError(e, { phase: 'directive', source, el, expression: exp });
    return;
  }
  if (cleanup) {
    addCleanup(ctx, cleanup);
  }
};

/**
 * `querySelector` for a selector written in markup. One that does not parse is
 * reported and yields undefined, rather than throwing out of `mount()`.
 */
const query = (sel: string, el: Element, source: string) => {
  try {
    return document.querySelector(sel);
  } catch (e) {
    handleError(e, { phase: 'directive', source, el, expression: sel });
  }
};

const resolveTemplate = (el: Element, template: string) => {
  if (template[0] === '#') {
    const templateEl = query(template, el, 'v-scope');
    // Returning matters in production, where the warning below is stripped:
    // without it a missing selector reaches `.content` and throws with no
    // diagnostic at all.
    if (!templateEl) {
      if (import.meta.env.DEV && templateEl === null) {
        console.error(
          `template selector ${template} has no matching <template> element.`
        );
      }
      return;
    }
    el.appendChild((templateEl as HTMLTemplateElement).content.cloneNode(true));
    return;
  }
  el.innerHTML = template;
};
