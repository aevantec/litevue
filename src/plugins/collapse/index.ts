import type { Plugin } from '../../app';

/**
 * v-collapse="expression" — expands/collapses the element's height with a
 * transition as the expression toggles. The initial state applies without
 * animating.
 *
 * Modifiers:
 * - .duration-<ms>  transition duration (default 250)
 */
export const collapse: Plugin = (app) => {
  app.directive('collapse', ({ el, get, effect, modifiers }) => {
    const elem = el as HTMLElement;
    let duration = 250;
    for (const m in modifiers || {}) {
      const match = /^duration-(\d+)$/.exec(m);
      if (match) duration = +match[1];
    }
    const owned = ['overflow', 'height', 'transition', 'visibility'] as const;
    const before = owned.map((k) => elem.style[k]);
    // a height of 0 leaves content in the tab order and the accessibility tree
    const hide = (hidden: boolean) =>
      (elem.style.visibility = hidden ? 'hidden' : before[3]);
    let shown: boolean | undefined;
    let seq = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms?: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    effect(() => {
      const show = !!get();
      if (show === shown) return;
      const id = ++seq;
      hide(!show);
      elem.style.overflow = show && shown == null ? before[0] : 'hidden';
      if (shown == null) {
        // visibility switches at the end of a collapse, at the start of an expand
        later(() => {
          elem.style.transition = `height ${duration}ms ease, visibility ${duration}ms`;
        });
      } else {
        elem.style.height = before[1] || elem.scrollHeight + 'px';
        if (show) {
          later(() => {
            if (id === seq) {
              elem.style.height = before[1];
              elem.style.overflow = before[0];
            }
          }, duration);
        } else {
          // force a reflow so the browser animates from the measured height
          void elem.offsetHeight;
        }
      }
      if (!show) elem.style.height = '0px';
      shown = show;
    });

    return () => {
      timers.forEach(clearTimeout);
      owned.forEach((k, i) => (elem.style[k] = before[i]));
    };
  });
};
