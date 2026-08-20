import type { Plugin } from '../../app';

/**
 * `v-resize="expr"` — element size, which no media query can report and which
 * CSS container queries cannot hand to JavaScript. The expression runs with
 * `$width` and `$height` in scope.
 *
 * Separate from the media plugin on purpose: that one is viewport state,
 * readable from a script with no element involved, while this is bound to the
 * element it sits on. They share no code, and the shape here — one directive
 * wrapping one observer — is the same as `intersect`.
 */
export const resize: Plugin = (app) => {
  app.directive('resize', ({ el, get, exp }) => {
    const handler = get(`(($width, $height) => { ${exp} })`);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.contentRect;
        handler(box.width, box.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  });
};
