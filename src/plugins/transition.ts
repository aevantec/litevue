import type { Plugin } from '../app';

const toMs = (v: string) =>
  (parseFloat(v) || 0) * (v.includes('ms') ? 1 : 1000);

const maxOf = (durations: string, delays: string) => {
  const ds = durations.split(',');
  const dl = delays.split(',');
  let max = 0;
  for (let i = 0; i < ds.length; i++) {
    max = Math.max(max, toMs(ds[i]) + toMs(dl[i % dl.length]));
  }
  return max;
};

// longest transition/animation (duration + delay) currently applying to el
const durationOf = (el: Element) => {
  const s = getComputedStyle(el);
  return Math.max(
    maxOf(s.transitionDuration, s.transitionDelay),
    maxOf(s.animationDuration, s.animationDelay)
  );
};

/**
 * v-transition:name="expression" — an animated v-show. Toggles the element
 * with Vue-style transition classes: name-enter-from / name-enter-active /
 * name-enter-to on show, and name-leave-from / name-leave-active /
 * name-leave-to before hiding. The element is only hidden after the leave
 * transition finishes (duration is read from computed styles).
 *
 * The name defaults to "v". The initial state applies without animating
 * unless the .appear modifier is present. Use it instead of v-show.
 *
 * With no expression (`v-transition:fade` on a v-if/v-for element) it
 * switches to unmount mode: the enter transition runs when the element is
 * inserted, and a leave hook is registered so the core delays removal until
 * the leave transition finishes.
 */
export const transition: Plugin = (app) => {
  app.directive('transition', ({ el, get, effect, arg, modifiers, exp }) => {
    const elem = el as HTMLElement;
    const name = arg || 'v';
    const cls = (phase: string) => `${name}-${phase}`;
    let seq = 0;
    let first = true;

    const clear = () => {
      elem.classList.remove(
        cls('enter-from'),
        cls('enter-active'),
        cls('enter-to'),
        cls('leave-from'),
        cls('leave-active'),
        cls('leave-to')
      );
    };

    const run = (phase: 'enter' | 'leave', done?: () => void) => {
      const id = ++seq;
      clear();
      elem.classList.add(cls(phase + '-from'), cls(phase + '-active'));
      // commit the -from styles so the browser transitions from them
      void elem.offsetWidth;
      elem.classList.remove(cls(phase + '-from'));
      elem.classList.add(cls(phase + '-to'));
      setTimeout(() => {
        if (id === seq) {
          clear();
          if (done) done();
        }
      }, durationOf(elem));
    };

    if (!exp) {
      // unmount mode: the element's lifetime is controlled by v-if/v-for.
      // enter runs a microtask later, once the block has been inserted
      Promise.resolve().then(() => run('enter'));
      (elem as any).__leave = () =>
        new Promise<void>((resolve) => run('leave', resolve));
      return () => {
        delete (elem as any).__leave;
      };
    }

    effect(() => {
      const show = !!get();
      if (first) {
        first = false;
        elem.style.display = show ? '' : 'none';
        if (show && modifiers?.appear) run('enter');
        return;
      }
      if (show) {
        elem.style.display = '';
        run('enter');
      } else {
        run('leave', () => {
          elem.style.display = 'none';
        });
      }
    });
  });
};
