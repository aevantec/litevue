import { Directive } from '.';

export const html: Directive = ({ el, get, effect }) => {
  effect(() => {
    // innerHTML turns undefined into the text "undefined"; null already clears
    el.innerHTML = get() ?? '';
  });
};
