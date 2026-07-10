import { Directive } from '.';
import { hyphenate } from '@vue/shared';
import { nextTick } from '../scheduler';

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

export const on: Directive = ({ el, get, exp, arg, modifiers }) => {
  if (!arg) {
    if (import.meta.env.DEV) {
      console.error(`v-on="obj" syntax is not supported in lite-vue.`);
    }
    return;
  }

  let handler = simplePathRE.test(exp)
    ? get(`(e => ${exp}(e))`)
    : get(`($event => { ${exp} })`);

  // special lifecycle events: @mounted / @unmounted
  // (the legacy vue:-prefixed names still work but are deprecated)
  if (
    import.meta.env.DEV &&
    (arg === 'vue:mounted' || arg === 'vue:unmounted')
  ) {
    console.warn(
      `@${arg} is deprecated in lite-vue - use @${arg.slice(4)} instead.`
    );
  }
  if (arg === 'mounted' || arg === 'vue:mounted') {
    nextTick(handler);
    return;
  } else if (arg === 'unmounted' || arg === 'vue:unmounted') {
    return () => handler();
  }

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
        let t: ReturnType<typeof setTimeout>;
        invoke = (e: Event) => {
          clearTimeout(t);
          t = setTimeout(fn, ms, e);
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

  // .window/.document/.outside listen beyond the element, so they need
  // explicit cleanup — the element's own listeners die with it
  const target: EventTarget = modifiers?.window
    ? window
    : modifiers?.document || modifiers?.outside
    ? document
    : el;
  const event = arg;
  target.addEventListener(event, handler, modifiers);
  if (target !== el) {
    return () => target.removeEventListener(event, handler, modifiers);
  }
};
