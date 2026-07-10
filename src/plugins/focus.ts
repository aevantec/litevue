import type { Plugin } from '../app';

/**
 * v-focus="expression" — focuses the element whenever the expression
 * becomes truthy (including on mount, making it an autofocus).
 *
 * Modifiers:
 * - .select  also select the element's text (inputs/textareas)
 */
export const focus: Plugin = (app) => {
  app.directive('focus', ({ el, get, effect, modifiers }) => {
    effect(() => {
      const on = !!get();
      // wait a tick so v-if/v-show updates land in the DOM first
      Promise.resolve().then(() => {
        if (on) {
          (el as HTMLElement).focus();
          if (modifiers?.select && (el as HTMLInputElement).select) {
            (el as HTMLInputElement).select();
          }
        }
      });
    });
  });
};
