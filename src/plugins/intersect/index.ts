import type { Plugin } from '../../app';

/**
 * v-intersect="expression" — evaluates the expression when the element
 * enters the viewport.
 *
 * Modifiers:
 * - .once   stop observing after the first trigger
 * - .leave  trigger when the element leaves the viewport instead
 * - .full   require the element to be fully visible (threshold: 1)
 */
export const intersect: Plugin = (app) => {
  app.directive('intersect', ({ el, get, modifiers }) => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const hit = modifiers?.leave
            ? !entry.isIntersecting
            : entry.isIntersecting;
          if (hit) {
            get();
            if (modifiers?.once) observer.disconnect();
          }
        }
      },
      { threshold: modifiers?.full ? 1 : 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });
};
