import { Directive } from '.';

export const show: Directive<HTMLElement> = ({ el, get, effect }) => {
  // an initial none only hides the element until mount; restoring it would
  // keep the element hidden for good
  const initialDisplay = el.style.display == 'none' ? '' : el.style.display;
  effect(() => {
    el.style.display = get() ? initialDisplay : 'none';
  });
};
