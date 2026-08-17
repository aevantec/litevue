/**
 * One route for everything that goes wrong at runtime.
 *
 * Before this, a bad expression produced a bare `ReferenceError` with no
 * element, directive or scope, and an error thrown inside an event handler
 * escaped the framework entirely — the listener rejected and the console
 * showed a stack with no hint of which `@click` caused it.
 *
 * Every diagnostic string here is behind `import.meta.env.DEV` so a production
 * bundle carries the routing but none of the prose. `onError` handlers still
 * run in production, which is the point: that is where monitoring hooks in.
 */

export type ErrorPhase =
  /** evaluating a directive's expression, or a text interpolation */
  | 'expression'
  /** inside a v-on handler, after the event fired */
  | 'handler'
  /** a directive's own setup threw */
  | 'directive'
  /** the expression could not be compiled into a function at all */
  | 'compile';

export interface ErrorInfo {
  phase: ErrorPhase;
  /** the expression text, as written in the attribute */
  expression?: string;
  /** the attribute or construct it came from, e.g. `v-on:click` or `{{ }}` */
  source?: string;
  /** the element the directive sits on */
  el?: Node;
  /** the scope the expression was evaluated against */
  scope?: Record<string, any>;
}

export type ErrorHandler = (err: unknown, info: ErrorInfo) => void;

/** Levenshtein, bounded — only used to rank candidate names in DEV. */
const distance = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr.slice();
  }
  return prev[n];
};

/**
 * Every name the expression could legitimately have used. Walks the prototype
 * chain because scopes nest that way: a child `v-scope` inherits its parent's
 * properties rather than copying them.
 */
const scopeNames = (scope: Record<string, any>): string[] => {
  const names = new Set<string>();
  let cur: any = scope;
  while (cur && cur !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(cur)) {
      if (key !== '__v_skip' && !key.startsWith('__v_')) names.add(key);
    }
    cur = Object.getPrototypeOf(cur);
  }
  return [...names];
};

/** `count is not defined` → the closest name actually in scope. */
const suggestName = (err: unknown, scope?: Record<string, any>) => {
  if (!scope || !(err instanceof ReferenceError)) return;
  const missing = /^(\w+) is not defined$/.exec(err.message)?.[1];
  if (!missing) return;

  const candidates = scopeNames(scope).filter((n) => !n.startsWith('$'));
  let best: string | undefined;
  let bestScore = Infinity;
  for (const name of candidates) {
    const d = distance(missing.toLowerCase(), name.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = name;
    }
  }
  // only offer a name that is genuinely close, or the noise outweighs the help
  const limit = Math.max(1, Math.floor(missing.length / 3));
  return best && bestScore <= limit
    ? { missing, suggestion: best }
    : { missing };
};

/** A short, recognisable rendering of the element — not its whole subtree. */
export const describeEl = (el?: Node): string | undefined => {
  if (!el) return;
  if (!(el instanceof Element)) {
    return el.nodeType === 3
      ? `text node "${el.nodeValue?.trim().slice(0, 40)}"`
      : undefined;
  }
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = el.classList.length ? `.${[...el.classList].join('.')}` : '';
  return `<${tag}${id}${cls}>`;
};

const handlers: ErrorHandler[] = [];

/** Registered by `app.onError()`. Shared across apps, like the store registry. */
export const addErrorHandler = (fn: ErrorHandler) => {
  handlers.push(fn);
  return () => {
    const i = handlers.indexOf(fn);
    if (i > -1) handlers.splice(i, 1);
  };
};

/** Test seam — drops every registered handler. */
export const clearErrorHandlers = () =>
  void handlers.splice(0, handlers.length);

const PHASES: Record<ErrorPhase, string> = {
  expression: 'evaluating',
  handler: 'handling an event in',
  directive: 'setting up',
  compile: 'compiling',
};

export const handleError = (err: unknown, info: ErrorInfo) => {
  // Handlers run first and in production too — this is where an app routes
  // errors to monitoring. One throwing must not hide the original error.
  for (const fn of handlers) {
    try {
      fn(err, info);
    } catch (inner) {
      if (import.meta.env.DEV) {
        console.error('[litevue] an onError handler itself threw:', inner);
      }
    }
  }

  if (!import.meta.env.DEV) {
    // Never swallow: without a handler the error still has to reach someone.
    if (!handlers.length) console.error(err);
    return;
  }

  const where = info.source ? ` ${info.source}` : '';
  const parts: string[] = [`[litevue] error ${PHASES[info.phase]}${where}`];
  if (info.expression) parts.push(`\n  expression: ${info.expression.trim()}`);

  const el = describeEl(info.el);
  if (el) parts.push(`\n  element:    ${el}`);

  const named = suggestName(err, info.scope);
  if (named?.suggestion) {
    parts.push(
      `\n  "${named.missing}" is not in scope — did you mean "${named.suggestion}"?`
    );
  } else if (named) {
    const names = scopeNames(info.scope!).filter((n) => !n.startsWith('$'));
    parts.push(
      `\n  "${named.missing}" is not in scope.` +
        (names.length
          ? ` Available: ${names.slice(0, 12).join(', ')}${names.length > 12 ? ', …' : ''}`
          : ' This scope declares nothing — is the v-scope on the right element?')
    );
  }

  console.error(parts.join(''), '\n ', err);
  if (info.el) console.error(info.el);
};
