import { Directive } from '.';

export const html: Directive = ({ el, get, effect }) => {
  (el as any).__r = 1;
  effect(() => {
    // innerHTML turns undefined into the text "undefined"; null already clears
    el.innerHTML = get() ?? '';
  });
};
