import { Directive } from '.';

export const show: Directive<
  HTMLElement & { _vod?: string; _vsh?: boolean }
> = ({ el, get, effect }) => {
  // the display to show again, which :style updates; an initial none only
  // hides the element until mount, and restoring it would hide it for good
  el._vod = el.style.display == 'none' ? '' : el.style.display;
  effect(() => {
    el._vsh = !get();
    el.style.display = el._vsh ? 'none' : el._vod!;
  });
};
