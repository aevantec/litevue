import type { Plugin } from '../../app';

/**
 * v-popover="open" keeps a native [popover] and state in step, both ways, so
 * light dismiss (Escape, an outside click) writes back. v-anchor.<placement>
 * ="$refs.trigger" positions an element against another: CSS anchor
 * positioning where supported, a script fallback elsewhere.
 *
 * Placements: top, bottom (default), left, right, each with -start or -end.
 */

// position-area for each placement; "span-right" starts at the anchor's left edge
const AREAS: Record<string, string> = {
  top: 'top',
  'top-start': 'top span-right',
  'top-end': 'top span-left',
  bottom: 'bottom',
  'bottom-start': 'bottom span-right',
  'bottom-end': 'bottom span-left',
  left: 'left',
  'left-start': 'left span-bottom',
  'left-end': 'left span-top',
  right: 'right',
  'right-start': 'right span-bottom',
  'right-end': 'right span-top',
};

const OPPOSITE: Record<string, string> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

let count = 0;

/** Script placement for engines without anchor positioning: flip, then align. */
const place = (float: HTMLElement, target: Element, placement: string) => {
  const [side, align] = placement.split('-');
  const t = target.getBoundingClientRect();
  const { width: w, height: h } = float.getBoundingClientRect();
  const room: Record<string, number> = {
    top: t.top - h,
    bottom: innerHeight - t.bottom - h,
    left: t.left - w,
    right: innerWidth - t.right - w,
  };
  const s = room[side] < 0 && room[OPPOSITE[side]] >= 0 ? OPPOSITE[side] : side;
  const vertical = s === 'top' || s === 'bottom';
  const [start, size, span] = vertical
    ? [t.left, t.width, w]
    : [t.top, t.height, h];
  const along =
    align === 'start'
      ? start
      : align === 'end'
        ? start + size - span
        : start + (size - span) / 2;
  const across =
    s === 'top'
      ? t.top - h
      : s === 'bottom'
        ? t.bottom
        : s === 'left'
          ? t.left - w
          : t.right;
  float.style.left = (vertical ? along : across) + 'px';
  float.style.top = (vertical ? across : along) + 'px';
};

export const popover: Plugin = (app) => {
  app.directive('popover', ({ el, get, effect, exp }) => {
    const pop = el as HTMLElement;
    if (!pop.popover) pop.popover = 'auto';
    const assign = get(`(val) => { ${exp} = val }`);
    const sync = (e: Event) => assign((e as ToggleEvent).newState === 'open');
    pop.addEventListener('toggle', sync);
    effect(() => {
      const open = !!get();
      if (open !== pop.matches(':popover-open')) {
        open ? pop.showPopover() : pop.hidePopover();
      }
    });
    return () => pop.removeEventListener('toggle', sync);
  });

  app.directive('anchor', ({ el, get, effect, modifiers }) => {
    const float = el as HTMLElement;
    const placement =
      Object.keys(modifiers || {}).find((m) => m in AREAS) || 'bottom';
    const before = float.style.cssText;
    let target: HTMLElement | undefined;

    // the UA centres a popover with inset: 0 and margin: auto
    float.style.inset = 'auto';
    float.style.margin = '0';

    if (CSS.supports('anchor-name: --a')) {
      const name = `--litevue-anchor-${++count}`;
      float.style.setProperty('position-anchor', name);
      float.style.setProperty('position-area', AREAS[placement]);
      float.style.setProperty(
        'position-try-fallbacks',
        'flip-block, flip-inline'
      );
      effect(() => {
        target?.style.removeProperty('anchor-name');
        target = get();
        target?.style.setProperty('anchor-name', name);
      });
    } else {
      float.style.position = 'fixed';
      const update = () => {
        if (target && (!float.popover || float.matches(':popover-open'))) {
          place(float, target, placement);
        }
      };
      effect(() => {
        target = get();
        update();
      });
      addEventListener('scroll', update, true);
      addEventListener('resize', update);
      float.addEventListener('toggle', update);
      return () => {
        removeEventListener('scroll', update, true);
        removeEventListener('resize', update);
        float.removeEventListener('toggle', update);
        float.style.cssText = before;
      };
    }

    return () => {
      target?.style.removeProperty('anchor-name');
      float.style.cssText = before;
    };
  });
};
