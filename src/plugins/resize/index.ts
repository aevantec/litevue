import type { Plugin } from '../../app';

/**
 * `v-resize="expr"` — element size, which no media query reports and container
 * queries cannot hand to JavaScript. The expression runs with `$width` and
 * `$height` in scope.
 *
 * Separate from the media plugin: that is viewport state, readable with no
 * element involved, while this is bound to the element it sits on.
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
