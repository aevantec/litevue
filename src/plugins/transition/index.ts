import type { Plugin } from '../../app';

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

const durationOf = (el: Element) => {
  const s = getComputedStyle(el);
  return Math.max(
    maxOf(s.transitionDuration, s.transitionDelay),
    maxOf(s.animationDuration, s.animationDelay)
  );
};

/**
 * v-transition:name="expression" — an animated v-show, using Vue-style
 * classes: name-enter-from/-active/-to on show, name-leave-* before hiding.
 * The element hides only once the leave transition finishes, its duration read
 * from computed styles. The name defaults to "v", and the initial state does
 * not animate unless `.appear` is present.
 *
 * With no expression, on a v-if/v-for element, it switches to unmount mode:
 * enter runs on insertion, and a leave hook makes the core delay removal.
 */
export const transition: Plugin = (app) => {
  app.directive('transition', ({ el, get, effect, arg, modifiers, exp }) => {
    const elem = el as HTMLElement;
    const name = arg || 'v';
    const cls = (phase: string) => `${name}-${phase}`;
    let seq = 0;
    let endTimer: ReturnType<typeof setTimeout> | undefined;

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
      clearTimeout(endTimer);
      endTimer = setTimeout(() => {
        if (id === seq) {
          clear();
          if (done) done();
        }
      }, durationOf(elem));
    };

    if (!exp) {
      let live = true;
      Promise.resolve().then(() => {
        if (live) run('enter');
      });
      (elem as any).__leave = () => {
        live = false;
        return new Promise<void>((resolve) => run('leave', resolve));
      };
      return () => {
        live = false;
        clearTimeout(endTimer);
        clear();
        delete (elem as any).__leave;
      };
    }

    const display = elem.style.display == 'none' ? '' : elem.style.display;
    let shown: boolean | undefined;
    effect(() => {
      const show = !!get();
      if (show === shown) return;
      const animate = shown != null;
      shown = show;
      if (show) {
        elem.style.display = display;
        if (animate || modifiers?.appear) run('enter');
      } else if (animate) {
        run('leave', () => {
          elem.style.display = 'none';
        });
      } else {
        elem.style.display = 'none';
      }
    });

    return () => {
      clearTimeout(endTimer);
      clear();
      if (shown === false) elem.style.display = 'none';
    };
  });
};
