import { NOOP, remove } from '@vue/shared';
import type { Context } from './context';
import { own } from './ownership';

export type LazyMode = 'visible' | 'idle' | 'interaction';

export const LAZY_MODES: LazyMode[] = ['visible', 'idle', 'interaction'];

export const SCOPE_SELECTOR = [
  '[v-scope]',
  ...LAZY_MODES.map((m) => `[v-scope\\.${m}]`),
].join(',');

const INTERACTIONS = ['pointerdown', 'keydown', 'focusin'] as const;

const arm = (el: Element, mode: LazyMode, fire: () => void): (() => void) => {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    stop();
    fire();
  };
  let stop = NOOP;

  if (mode === 'visible' && typeof IntersectionObserver == 'function') {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) return once();
        // display: none, as a v-cloak rule gives it, leaves no box to
        // intersect; the parent stands in until the region mounts
        const parent = e.target.parentElement;
        if (!e.boundingClientRect.width && parent) io.observe(parent);
      }
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
    if (!el.hasAttribute(attr)) return;
    el.setAttribute('v-scope', el.getAttribute(attr)!);
    el.removeAttribute(attr);
    walk(el, ctx, once);
  });
  ctx.cleanups.push(dispose);
  own(() => {
    remove(ctx.cleanups, dispose);
    dispose();
  });
  return true;
};
