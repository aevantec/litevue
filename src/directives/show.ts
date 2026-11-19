import { Directive } from '.';

export const show: Directive<
  HTMLElement & { _vod?: string; _vsh?: boolean; _vts?: number }
> = ({ el, get, effect }) => {
  // the display to show again, which :style updates; an initial none only
  // hides the element until mount, and restoring it would hide it for good
  el._vod = el.style.display == 'none' ? '' : el.style.display;
  effect(() => {
    const hidden = !get();
    // when it was shown, so @click.outside ignores the click that showed it
    if (el._vsh && !hidden) el._vts = performance.now();
    el._vsh = hidden;
    el.style.display = hidden ? 'none' : el._vod!;
  });
};
