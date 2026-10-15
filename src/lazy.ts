import type { Context } from './context';
import { own } from './ownership';

/**
 * `v-scope.visible` / `.idle` / `.interaction`: defer a region's walk, so
 * nothing inside is bound until the trigger. The author still wrote
 * `v-scope`; only the moment of initialisation moves.
 */
export type LazyMode = 'visible' | 'idle' | 'interaction';

export const LAZY_MODES: LazyMode[] = ['visible', 'idle', 'interaction'];

/** Selector matching every scope root, deferred or not. */
export const SCOPE_SELECTOR = [
  '[v-scope]',
  ...LAZY_MODES.map((m) => `[v-scope\\.${m}]`),
].join(',');

const INTERACTIONS = ['pointerdown', 'keydown', 'focusin'] as const;

/**
 * Arms `mode` and returns a disposer. Fires at most once; disposing first
 * cancels it, since a region can be unmounted while still waiting.
 */
const arm = (el: Element, mode: LazyMode, fire: () => void): (() => void) => {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    stop();
    fire();
  };
  let stop = () => {};

  // without IntersectionObserver (jsdom, an app's own test suite) .visible
  // mounts like .idle rather than throwing mid-walk
  if (mode === 'visible' && typeof IntersectionObserver == 'function') {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) once();
    });
    io.observe(el);
    stop = () => io.disconnect();
  } else if (mode !== 'interaction') {
    const ric = (window as any).requestIdleCallback;
    const id = ric ? ric(once) : setTimeout(once);
    stop = () =>
      ric ? (window as any).cancelIdleCallback(id) : clearTimeout(id);
  } else {
    for (const type of INTERACTIONS) {
      el.addEventListener(type, once);
    }
    stop = () => {
      for (const type of INTERACTIONS) el.removeEventListener(type, once);
    };
  }

  return () => {
    done = true;
    stop();
  };
};

/**
 * Returns true if `el` was deferred. The walk must not descend into it:
 * walking consumes directives, so it could not be walked again later.
 */
export const deferScope = (
  el: Element,
  ctx: Context,
  walk: (node: Node, ctx: Context, once: boolean) => unknown,
  once: boolean
): boolean => {
  const mode = LAZY_MODES.find((m) => el.hasAttribute(`v-scope.${m}`));
  if (!mode) return false;

  const attr = `v-scope.${mode}`;
  const dispose = arm(el, mode, () => {
    // gone if a second mount() armed it again and the first trigger won
    if (!el.hasAttribute(attr)) return;
    // hand the walker an ordinary v-scope; from here it is a normal mount
    el.setAttribute('v-scope', el.getAttribute(attr)!);
    el.removeAttribute(attr);
    walk(el, ctx, once);
  });
  ctx.cleanups.push(dispose);
  own(dispose);
  return true;
};
