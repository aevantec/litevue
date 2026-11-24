import {
  builtInDirectives,
  Directive,
  structuralDirectives,
} from './directives';
import { hasOwn } from '@vue/shared';
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

export const withOnce = (once: boolean, fn: () => unknown) => {
  const previous = inOnce;
  inOnce = once;
  try {
    fn();
  } finally {
    inOnce = previous;
  }
};

const walkDeferred = (node: Node, ctx: Context, once: boolean) =>
  withOnce(once, () => walk(node, ctx));

export const walk = (node: Node, ctx: Context): ChildNode | null | void => {
  const previousOwner = setOwner(node);
  try {
    return walkNode(node, ctx);
  } finally {
    setOwner(previousOwner);
  }
};

const walkNode = (node: Node, ctx: Context): ChildNode | null | void => {
  if ((node as any).__r) return;
  const type = node.nodeType;
  if (type === 1) {
    const el = node as Element;
    if (!el.hasAttributes()) return walkChildren(el, ctx);
    if (el.hasAttribute('v-pre')) {
      return;
    }

    let exp: string | null;

    if ((exp = checkAttr(el, 'v-if')) != null) {
      return _if(el, exp, ctx);
    }

    if ((exp = checkAttr(el, 'v-for'))) {
      return _for(el, exp, ctx);
    }

    if (deferScope(el, ctx, walkDeferred, inOnce)) return;

    checkAttr(el, 'v-cloak');

    const name = checkAttr(el, 'v-name');

    let teleportNext: ChildNode | null | undefined;
    if ((exp = checkAttr(el, 'v-teleport'))) {
      const target = query(exp, el, 'v-teleport');
      if (target) {
        teleportNext = el.nextSibling;
        const marker = ((el as any).__marker = new Text(''));
        el.before(marker);
        try {
          target.appendChild(el);
        } catch (e) {
          handleError(e, {
            phase: 'directive',
            source: 'v-teleport',
            el,
            expression: exp,
          });
        }
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

    if ((exp = checkAttr(el, 'v-scope')) || exp === '') {
      const scope =
        (exp ? evaluate(ctx.scope, exp, el, { source: 'v-scope', el }) : {}) ||
        {};
      ctx = createScopedContext(ctx, scope);
      (el as any).__ctx = ctx;
      const deregister = registerScope(
        el,
        ctx.scope,
        exp || undefined,
        name || undefined
      );
      addCleanup(ctx, () => {
        deregister();
        delete (el as any).__ctx;
      });
      if (scope.$template) {
        resolveTemplate(el, scope.$template);
      }
    }

    const wasOnce = inOnce;
    if (checkAttr(el, 'v-once') != null) {
      inOnce = true;
    }

    if ((exp = checkAttr(el, 'ref'))) {
      applyDirective(el, ref, `"${exp}"`, ctx);
    }

    if (!el.hasAttribute('v-text') && !el.hasAttribute('v-html')) {
      walkChildren(el, ctx);
    }

    const deferred: [string, string][] = [];
    for (const { name, value } of [...el.attributes]) {
      if (dirRE.test(name) && name !== 'v-cloak') {
        if (name === 'v-model' || name.startsWith('v-model.')) {
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
    const data = (node as Text).data;
    if (
      data.includes(ctx.delimiters[0]) &&
      (node.parentNode as Element)?.localName != 'script'
    ) {
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
  let dir: Directive | undefined;
  let arg: string | undefined;
  let modifiers: Record<string, true> | undefined;
  const source = raw;

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
    dir = hasOwn(builtInDirectives, dirName)
      ? builtInDirectives[dirName]
      : hasOwn(ctx.dirs, dirName)
        ? ctx.dirs[dirName]
        : undefined;
    arg = argIndex > 0 ? raw.slice(argIndex + 1) : undefined;
  }
  if (dir) {
    if (dir === bind && arg === 'ref') dir = ref;
    applyDirective(el, dir, exp, ctx, arg, modifiers, source);
    el.removeAttribute(source);
  } else if (import.meta.env.DEV) {
    const known = [
      ...structuralDirectives.map((d) => 'v-' + d),
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
  const meta = { source, el, expression: displayExp || exp };
  const report = (err: unknown) =>
    handleError(err, {
      phase: 'handler',
      source,
      el,
      expression: exp,
      scope: ctx.scope,
    });
  const get = (code?: string) => {
    const value = evaluate(ctx.scope, code ?? exp, el, meta);
    return code && typeof value == 'function'
      ? (...args: any[]) => {
          const previous = setOwner(el);
          try {
            const result = value(...args);
            if (result instanceof Promise) result.catch(report);
            return result;
          } catch (err) {
            report(err);
          } finally {
            setOwner(previous);
          }
        }
      : value;
  };
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
    handleError(e, { phase: 'directive', source, el, expression: exp });
    return;
  }
  if (cleanup) {
    addCleanup(ctx, () => {
      try {
        cleanup();
      } catch (e) {
        handleError(e, { phase: 'teardown', source, el, expression: exp });
      }
    });
  }
};

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
    if (!(templateEl instanceof HTMLTemplateElement)) {
      if (import.meta.env.DEV && templateEl !== undefined) {
        console.error(
          `template selector ${template} has no matching <template> element.`
        );
      }
      return;
    }
    el.appendChild(templateEl.content.cloneNode(true));
    return;
  }
  el.innerHTML = template;
};
