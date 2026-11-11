import type { Plugin } from '../../app';

const FOCUSABLE =
  'a[href],area[href],button,input:not([type=hidden]),select,textarea,' +
  'summary,iframe,audio[controls],video[controls],[contenteditable],[tabindex]';

// active traps, latest last: only the innermost handles Tab, or an outer trap
// wraps first and the inner one pulls focus back
const traps: Element[] = [];

// a radio group's tab stop: its checked radio, else its first
const isTabStop = (e: any, _: number, all: any[]) =>
  e.type !== 'radio' ||
  !e.name ||
  e ===
    (all.find((o) => o.type === 'radio' && o.name === e.name && o.checked) ||
      all.find((o) => o.type === 'radio' && o.name === e.name));

/**
 * Focus utilities.
 *
 * v-focus="expression" — focuses the element when the expression becomes truthy,
 * on mount included, making it an autofocus.
 * - .select  also select the text (inputs/textareas)
 *
 * v-trap="expression" — cycles Tab / Shift+Tab within the element while truthy,
 * for accessible modals. Focus enters the first focusable child and returns to
 * the previous element on release or unmount.
 */
export const focus: Plugin = (app) => {
  app.directive('focus', ({ el, get, effect, modifiers }) => {
    let live = true;
    let on = false;
    effect(() => {
      // only a change to truthy focuses, or any other dependency change
      // would pull focus back from where the user has moved it
      if (on === (on = !!get())) return;
      // wait a tick so v-if/v-show updates land in the DOM first
      Promise.resolve().then(() => {
        // the element can be torn down within that tick, and focusing a
        // detached node blurs whatever the user was typing in
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

    // only what Tab reaches: the trap wraps from the last one it counts
    const focusables = () =>
      [...el.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter(
          (e: any) =>
            e.tabIndex >= 0 &&
            !e.matches(':disabled,[inert],[inert] *') &&
            e.checkVisibility?.({ visibilityProperty: true }) !== false
        )
        .filter(isTabStop);

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || traps.at(-1) !== el) return;
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
      } else if (e.shiftKey && (current === first || current === el)) {
        // the focused container counts as before the first
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const release = () => {
      active = false;
      traps.splice(traps.indexOf(el), 1);
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
        // before any active trap inside it (-1 >>> 0 appends), as a child's
        // effect runs first and would otherwise leave the outer trap last
        traps.splice(traps.findIndex((t) => el.contains(t)) >>> 0, 0, el);
        document.addEventListener('keydown', onKeydown, true);
        // wait a tick so a v-if/v-show modal is in the DOM before focusing
        Promise.resolve().then(() => {
          if (active && traps.at(-1) === el)
            (focusables()[0] || (el as HTMLElement)).focus();
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
