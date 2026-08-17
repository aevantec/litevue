import { Directive } from '.';
import { hyphenate } from '@vue/shared';
import { nextTick } from '../scheduler';
import { handleError } from '../errors';

/**
 * Can `exp` stand as a single expression, or is it a statement list?
 *
 * Memoised: this compiles a throwaway function to find out, and the answer
 * only depends on the text. Without the cache a `v-for` over 100 rows paid
 * 100 identical compiles for the same handler attribute.
 */
const expressionCache: Record<string, boolean> = Object.create(null);
const isExpression = (exp: string) => {
  const hit = expressionCache[exp];
  if (hit !== undefined) return hit;
  try {
    new Function(`return (${exp})`);
    return (expressionCache[exp] = true);
  } catch {
    return (expressionCache[exp] = false);
  }
};

// same as vue 2
const simplePathRE =
  /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;

const systemModifiers = ['ctrl', 'shift', 'alt', 'meta'];

type KeyedEvent = KeyboardEvent | MouseEvent | TouchEvent;

const modifierGuards: Record<
  string,
  (e: Event, modifiers: Record<string, true>) => void | boolean
> = {
  stop: (e) => e.stopPropagation(),
  prevent: (e) => e.preventDefault(),
  self: (e) => e.target !== e.currentTarget,
  ctrl: (e) => !(e as KeyedEvent).ctrlKey,
  shift: (e) => !(e as KeyedEvent).shiftKey,
  alt: (e) => !(e as KeyedEvent).altKey,
  meta: (e) => !(e as KeyedEvent).metaKey,
  left: (e) => 'button' in e && (e as MouseEvent).button !== 0,
  middle: (e) => 'button' in e && (e as MouseEvent).button !== 1,
  right: (e) => 'button' in e && (e as MouseEvent).button !== 2,
  exact: (e, modifiers) =>
    systemModifiers.some((m) => (e as any)[`${m}Key`] && !modifiers[m]),
};

// modifiers that are never key-name filters on keyboard events
const nonKeyModifierRE =
  /^(stop|prevent|self|ctrl|shift|alt|meta|left|middle|right|exact|once|capture|passive|window|document|outside|debounce(-\d+)?|throttle(-\d+)?|prop-.+|name-.+)$/;

export const on: Directive = ({ el, get, ctx, exp, arg, modifiers }) => {
  if (!arg) {
    if (import.meta.env.DEV) {
      console.error(`v-on="obj" syntax is not supported in LiteVue.`);
    }
    return;
  }

  // Prefer a form that yields the expression's value, so an async handler's
  // promise is reachable and its rejection can be reported. Statements like
  // `a++; b++` are not expressions, so fall back to the block form for those
  // and accept that their return value is unavailable. Returning a value is
  // safe either way: addEventListener ignores it.
  const raw = simplePathRE.test(exp)
    ? get(`(e => ${exp}(e))`)
    : isExpression(exp)
      ? get(`($event => (${exp}))`)
      : get(`($event => { ${exp} })`);

  // An error thrown once the event fires happens long after `get()` returned,
  // so the evaluator's own try/catch is out of scope by then — it used to
  // escape into the DOM's listener machinery, where the console showed a
  // stack with no hint of which handler produced it. A rejected promise from
  // an async handler was worse: entirely silent.
  let handler = (...args: any[]) => {
    try {
      const result = raw(...args);
      if (result && typeof result.then === 'function') {
        result.catch((err: unknown) => fail(err));
      }
      return result;
    } catch (e) {
      fail(e);
    }
  };

  function fail(e: unknown) {
    handleError(e, {
      phase: 'handler',
      source: `@${arg}`,
      expression: exp,
      el,
      scope: ctx.scope,
    });
  }

  // special lifecycle events: @mounted / @unmounted
  // (the legacy vue:-prefixed names still work but are deprecated)
  if (
    import.meta.env.DEV &&
    (arg === 'vue:mounted' || arg === 'vue:unmounted')
  ) {
    console.warn(
      `@${arg} is deprecated in LiteVue - use @${arg.slice(4)} instead.`
    );
  }
  if (arg === 'mounted' || arg === 'vue:mounted') {
    // same race as v-effect: the element may be torn down before this tick
    let live = true;
    nextTick(() => {
      if (live) handler();
    });
    return () => {
      live = false;
    };
  } else if (arg === 'unmounted' || arg === 'vue:unmounted') {
    return () => handler();
  }

  // Held at directive scope so teardown can cancel it: a debounce pending at
  // unmount would otherwise fire against a scope meant to be inert.
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  if (modifiers) {
    // map modifiers
    if (arg === 'click') {
      if (modifiers.right) arg = 'contextmenu';
      if (modifiers.middle) arg = 'mouseup';
    }

    // rate-limit only the user callback so guards like .prevent still act
    // on the event synchronously
    let invoke = handler;
    for (const key in modifiers) {
      let m = /^debounce(?:-(\d+))?$/.exec(key);
      if (m) {
        const fn = invoke;
        const ms = m[1] ? +m[1] : 250;
        invoke = (e: Event) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fn, ms, e);
        };
        continue;
      }
      m = /^throttle(?:-(\d+))?$/.exec(key);
      if (m) {
        const fn = invoke;
        const ms = m[1] ? +m[1] : 250;
        let last = 0;
        invoke = (e: Event) => {
          const now = Date.now();
          if (now - last >= ms) {
            last = now;
            fn(e);
          }
        };
      }
    }

    const keyFilter = Object.keys(modifiers).filter(
      (k) => !nonKeyModifierRE.test(k)
    );

    handler = (e: Event) => {
      if (modifiers.outside && el.contains(e.target as Node)) {
        return;
      }
      if (
        'key' in e &&
        keyFilter.length &&
        !(hyphenate((e as KeyboardEvent).key) in modifiers)
      ) {
        return;
      }
      for (const key in modifiers) {
        const guard = modifierGuards[key];
        if (guard && guard(e, modifiers)) {
          return;
        }
        // animation/transition event filters: @transitionend.prop-opacity,
        // @animationend.name-bounce
        if (
          key.startsWith('prop-') &&
          'propertyName' in e &&
          (e as TransitionEvent).propertyName !== key.slice(5)
        ) {
          return;
        }
        if (
          key.startsWith('name-') &&
          'animationName' in e &&
          (e as AnimationEvent).animationName !== key.slice(5)
        ) {
          return;
        }
      }
      return invoke(e);
    };
  }

  // .window/.document/.outside listen beyond the element
  const target: EventTarget = modifiers?.window
    ? window
    : modifiers?.document || modifiers?.outside
      ? document
      : el;
  const event = arg;
  target.addEventListener(event, handler, modifiers);
  // Element listeners are removed too. They once died with the element, but
  // app.unmount(el) tears down a region that stays in the document, where a
  // live handler would keep mutating inert state.
  return () => {
    clearTimeout(debounceTimer);
    target.removeEventListener(event, handler, modifiers);
  };
};
