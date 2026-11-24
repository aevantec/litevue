import { Directive } from '.';

export const show: Directive<
  HTMLElement & { _vod?: string; _vsh?: boolean; _vts?: number }
> = ({ el, get, effect }) => {
  el._vod = el.style.display == 'none' ? '' : el.style.display;
  effect(() => {
    const hidden = !get();
    if (el._vsh && !hidden) el._vts = performance.now();
    el._vsh = hidden;
    el.style.display = hidden ? 'none' : el._vod!;
  });
};
