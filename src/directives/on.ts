import { Directive } from '.';
import { hyphenate } from '@vue/shared';
import { nextTick } from '../scheduler';
import { handleError } from '../errors';
import { warnOnce } from '../warn';

/**
 * Can `exp` stand as a single expression, or is it a statement list?
 * Memoised: it compiles a throwaway function, which a `v-for` pays per row.
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

// Vue's key aliases. `left` and `right` are mouse buttons too — which one
// depends on the event. `delete` also matches Backspace, as in Vue.
const keyAliases: Record<string, string> = {
  esc: 'escape',
  space: ' ',
  up: 'arrow-up',
  down: 'arrow-down',
  left: 'arrow-left',
  right: 'arrow-right',
  delete: 'backspace',
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

  // The expression form returns the value, so an async handler's rejection
  // can be reported. Statement lists like `a++; b++` keep the block form.
  const raw = simplePathRE.test(exp)
    ? get(`(e => ${exp}(e))`)
    : isExpression(exp)
      ? get(`($event => (${exp}))`)
      : get(`($event => { ${exp} })`);

  // The event fires long after get() returned, so the evaluator's try/catch
  // no longer applies; without this, throws go unattributed and rejections
  // are silent.
  let handler = (...args: any[]) => {
    try {
      const result = raw(...args);
      // only a real Promise: a query builder is a thenable with no .catch,
      // and would run its query if its then were called on its behalf
      if (result instanceof Promise) result.catch(fail);
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
      (k) => !nonKeyModifierRE.test(k) || k in keyAliases
    );

    // A key name on a non-keyboard event filters nothing: Alpine's
    // `.debounce.500ms` otherwise runs at 250ms without a sound.
    if (import.meta.env.DEV && !arg.startsWith('key')) {
      for (const k of keyFilter) {
        if (k in keyAliases) continue;
        const ms = /^(\d+)ms$/.exec(k);
        warnOnce(
          `modifier:${arg}.${k}`,
          `@${arg}.${k}: .${k} is not a modifier LiteVue knows, so it is ` +
            `ignored.` +
            (ms
              ? ` Timings are written with a dash — .debounce-${ms[1]} or ` +
                `.throttle-${ms[1]}.`
              : ` Key names only filter keyboard events.`)
        );
      }
    }

    handler = (e: Event) => {
      if (modifiers.outside && el.contains(e.target as Node)) {
        return;
      }
      if ('key' in e && keyFilter.length) {
        const key = hyphenate((e as KeyboardEvent).key);
        if (!keyFilter.some((k) => k === key || keyAliases[k] === key)) return;
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
