import type { Plugin } from '../../app';

/**
 * `v-resize="expr"` — element size, which no media query reports and container
 * queries cannot hand to JavaScript. The expression runs with `$width` and
 * `$height` in scope.
 *
 * `.window` measures the viewport instead, from `innerWidth`/`innerHeight`.
 * A ResizeObserver cannot do this: on `documentElement` it reports the
 * *document* height, so a 3000px page under a 700px viewport reports 3000.
 * `.visual` measures the visual viewport, which shrinks for an on-screen
 * keyboard where `innerHeight` does not.
 */
export const resize: Plugin = (app) => {
  app.directive('resize', ({ el, get, exp, modifiers }) => {
    const handler = get(`(($width, $height) => { ${exp} })`);
    if (modifiers?.window || modifiers?.visual) {
      // window has no width, so it falls through to innerWidth / innerHeight
      const view: any = (modifiers.visual && window.visualViewport) || window;
      const fire = () =>
        handler(view.width || innerWidth, view.height || innerHeight);
      view.addEventListener('resize', fire);
      fire();
      return () => view.removeEventListener('resize', fire);
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
