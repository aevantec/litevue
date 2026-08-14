import type { Plugin } from '../app';

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
    elem.style.overflow = 'hidden';
    let first = true;
    let seq = 0;
    // pending timers are cancelled on teardown: app.unmount(el) leaves the
    // element in the document, so a timer firing afterwards would still be
    // writing styles for a directive that no longer exists
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
      const id = ++seq;
      if (first) {
        first = false;
        if (!show) elem.style.height = '0px';
        // enable the transition only after the initial state is applied
        later(() => {
          elem.style.transition = `height ${duration}ms ease`;
        });
        return;
      }
      if (show) {
        elem.style.height = elem.scrollHeight + 'px';
        later(() => {
          // release the fixed height so content can resize freely
          if (id === seq) elem.style.height = '';
        }, duration);
      } else {
        elem.style.height = elem.scrollHeight + 'px';
        // force a reflow so the browser animates from the measured height
        void elem.offsetHeight;
        elem.style.height = '0px';
      }
    });

    return () => timers.forEach(clearTimeout);
  });
};
