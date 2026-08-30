import type { Plugin } from '../../app';

/**
 * `v-resize="expr"` — element size, which no media query reports and container
 * queries cannot hand to JavaScript. The expression runs with `$width` and
 * `$height` in scope.
 *
 * `.window` measures the viewport instead, from `innerWidth`/`innerHeight`.
 * A ResizeObserver cannot do this: on `documentElement` it reports the
 * *document* height, so a 3000px page under a 700px viewport reports 3000.
 */
export const resize: Plugin = (app) => {
  app.directive('resize', ({ el, get, exp, modifiers }) => {
    const handler = get(`(($width, $height) => { ${exp} })`);
    if (modifiers?.window) {
      const fire = () => handler(innerWidth, innerHeight);
      addEventListener('resize', fire);
      fire();
      return () => removeEventListener('resize', fire);
    }
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
