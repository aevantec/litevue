import type { Plugin } from '../../app';

const FOCUSABLE =
  'a[href], button, input, textarea, select, details, ' +
  '[tabindex]:not([tabindex="-1"])';

/**
 * Focus utilities.
 *
 * v-focus="expression" — focuses the element whenever the expression
 * becomes truthy (including on mount, making it an autofocus).
 * Modifiers:
 * - .select  also select the element's text (inputs/textareas)
 *
 * v-trap="expression" — while the expression is truthy, contains Tab /
 * Shift+Tab focus cycling within the element (for accessible modals).
 * Focus moves to the first focusable child on activation and returns to
 * the previously focused element on release or unmount.
 */
export const focus: Plugin = (app) => {
  app.directive('focus', ({ el, get, effect, modifiers }) => {
    let live = true;
    effect(() => {
      const on = !!get();
      // wait a tick so v-if/v-show updates land in the DOM first
      Promise.resolve().then(() => {
        // the element can be torn down inside that tick, and focusing a
        // detached node blurs whatever the user was actually typing in
        if (live && on) {
          (el as HTMLElement).focus();
          if (modifiers?.select && (el as HTMLInputElement).select) {
            (el as HTMLInputElement).select();
          }
        }
      });
    });
    return () => {
      live = false;
    };
  });

  app.directive('trap', ({ el, get, effect }) => {
    let active = false;
    let prevFocus: Element | null = null;

    const focusables = () =>
      [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (e) => !e.hasAttribute('disabled')
      );

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) {
        e.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const current = document.activeElement;
      // pull stray focus back inside, and wrap at the edges
      if (!el.contains(current)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const release = () => {
      active = false;
      document.removeEventListener('keydown', onKeydown, true);
      if (prevFocus && (prevFocus as HTMLElement).focus) {
        (prevFocus as HTMLElement).focus();
      }
    };

    effect(() => {
      const on = !!get();
      if (on && !active) {
        active = true;
        prevFocus = document.activeElement;
        document.addEventListener('keydown', onKeydown, true);
        // wait a tick so a v-if/v-show modal is in the DOM before focusing
        Promise.resolve().then(() => {
          if (active) (focusables()[0] || (el as HTMLElement)).focus();
        });
      } else if (!on && active) {
        release();
      }
    });

    return () => {
      if (active) release();
    };
  });
};
