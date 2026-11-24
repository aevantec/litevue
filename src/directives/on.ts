import { Directive } from '.';
import { hyphenate } from '@vue/shared';
import { nextTick } from '../scheduler';
import { warnOnce } from '../warn';
import { EVAL_CACHE_LIMIT } from '../eval';

let expressionCache: Record<string, boolean> = Object.create(null);
let cachedExpressions = 0;

export const expressionCacheSize = () => cachedExpressions;

const isExpression = (exp: string) => {
  const hit = expressionCache[exp];
  if (hit !== undefined) return hit;
  if (++cachedExpressions > EVAL_CACHE_LIMIT) {
    expressionCache = Object.create(null);
    cachedExpressions = 1;
  }
  try {
    new Function(`return (${exp})`);
    return (expressionCache[exp] = true);
  } catch {
    return (expressionCache[exp] = false);
  }
};

const fnExpRE =
  /^\s*(async\s*)?(\([^)]*?\)|[\w$]+)\s*=>|^\s*(async\s+)?function\b/;

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

const keyAliases: Record<string, string> = {
  esc: 'escape',
  space: ' ',
  up: 'arrow-up',
  down: 'arrow-down',
  left: 'arrow-left',
  right: 'arrow-right',
  delete: 'backspace',
};

const nonKeyModifierRE =
  /^(stop|prevent|self|ctrl|shift|alt|meta|left|middle|right|exact|once|capture|passive|window|document|outside|debounce(-\d+)?|throttle(-\d+)?|prop-.+|name-.+)$/;

export const on: Directive = ({ el, get, exp, arg, modifiers }) => {
  if (!arg) {
    if (import.meta.env.DEV) {
      console.error(`v-on="obj" syntax is not supported in LiteVue.`);
    }
    return;
  }

  const a = /\bawait\b/.test(exp) ? 'async ' : '';
  const body = exp.replace(/;\s*$/, '');
  let handler =
    simplePathRE.test(exp) || fnExpRE.test(exp)
      ? get(`(e => (${body})(e))`)
      : isExpression(body)
        ? get(`(${a}$event => (${body}))`)
        : get(`(${a}$event => { ${exp} })`);
  if (!handler) return;

  if (
    import.meta.env.DEV &&
    (arg === 'vue:mounted' || arg === 'vue:unmounted')
  ) {
    console.warn(
      `@${arg} is deprecated in LiteVue - use @${arg.slice(4)} instead.`
    );
  }
  if (arg === 'mounted' || arg === 'vue:mounted') {
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

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  if (modifiers) {
    if (arg === 'click') {
      if (modifiers.right) arg = 'contextmenu';
      if (modifiers.middle) arg = 'mouseup';
    }

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
      // the path is fixed at dispatch, so a target removed by an earlier
      // listener still counts as inside
      if (
        modifiers.outside &&
        (e.composedPath().includes(el) ||
          (el as any)._vsh ||
          e.timeStamp < (el as any)._vts)
      ) {
        return;
      }
      // a key-less key event (Chrome's autofill keydown) matches no key
      if (keyFilter.length && ('key' in e || e.type.startsWith('key'))) {
        const key = hyphenate((e as KeyboardEvent).key || '');
        if (!keyFilter.some((k) => k === key || keyAliases[k] === key)) return;
      }
      for (const key in modifiers) {
        const guard = modifierGuards[key];
        if (guard && guard(e, modifiers)) {
          return;
        }
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
      if (modifiers.once) target.removeEventListener(event, handler, modifiers);
      return invoke(e);
    };
  }

  const target: EventTarget = modifiers?.window
    ? window
    : modifiers?.document || modifiers?.outside
      ? document
      : el;
  const event = arg;
  // in the clock of event.timeStamp
  if (modifiers?.outside) (el as any)._vts = performance.now();
  target.addEventListener(event, handler, { ...modifiers, once: false });
  return () => {
    clearTimeout(debounceTimer);
    target.removeEventListener(event, handler, modifiers);
  };
};
