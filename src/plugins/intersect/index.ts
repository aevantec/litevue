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
    // isIntersecting is true for any overlap whatever the threshold, and the
    // first entry arrives on observe(), so track the state and act on changes
    let seen = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const now = modifiers?.full
            ? entry.intersectionRatio >= 1
            : entry.isIntersecting;
          const hit = modifiers?.leave ? seen && !now : now && !seen;
          seen = now;
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
