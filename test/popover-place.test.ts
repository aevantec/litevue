import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { popover } from '../src/plugins/popover';
import { tick } from './utils';

/**
 * The script fallback's placement, with layout stubbed: jsdom has no layout,
 * so the anchor's rect and the element's size are set by hand. Real layout,
 * CSS anchor positioning and the Popover API are covered in
 * test/browser/popover.test.ts.
 */

const realCSS = (globalThis as any).CSS;
beforeEach(() => {
  (globalThis as any).CSS = { supports: () => false };
  Object.defineProperty(window, 'innerWidth', {
    value: 1000,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: 800,
    configurable: true,
  });
});
afterEach(() => {
  (globalThis as any).CSS = realCSS;
  document.body.innerHTML = '';
});

/** Anchor at (left, top) sized 100x20; floating element 60x40. */
const place = async (modifiers: string, left = 400, top = 300) => {
  document.body.innerHTML = `
    <div v-scope>
      <button ref="a"></button>
      <div id="f" v-anchor${modifiers}="$refs.a"></div>
    </div>`;
  const a = document.querySelector('button')!;
  a.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + 100,
      bottom: top + 20,
      width: 100,
      height: 20,
    }) as DOMRect;
  const f = document.querySelector('#f') as HTMLElement;
  Object.defineProperty(f, 'offsetWidth', { value: 60 });
  Object.defineProperty(f, 'offsetHeight', { value: 40 });
  const app = createApp().use(popover);
  app.mount(document.body.firstElementChild!);
  await tick();
  return {
    f,
    app,
    at: () => [parseFloat(f.style.left), parseFloat(f.style.top)],
  };
};

describe('v-anchor script placement', () => {
  test('defaults to bottom, centred', async () => {
    const { at } = await place('');
    expect(at()).toEqual([420, 320]);
  });

  test('bottom-start aligns to the left edge', async () => {
    const { at } = await place('.bottom-start');
    expect(at()).toEqual([400, 320]);
  });

  test('top-end aligns to the right edge, above', async () => {
    const { at } = await place('.top-end');
    expect(at()).toEqual([440, 260]);
  });

  test('right-start sits to the right, aligned to the top', async () => {
    const { at } = await place('.right-start');
    expect(at()).toEqual([500, 300]);
  });

  test('left sits to the left, centred vertically', async () => {
    const { at } = await place('.left');
    expect(at()).toEqual([340, 290]);
  });

  test('flips to the top when there is no room below', async () => {
    const { at } = await place('.bottom', 400, 770);
    expect(at()).toEqual([420, 730]);
  });

  test('stays put when neither side has room', async () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 60,
      configurable: true,
    });
    const { at } = await place('.bottom', 400, 30);
    expect(at()).toEqual([420, 50]);
  });

  test('.offset-8 adds a gap, and keeps it through a flip', async () => {
    expect((await place('.bottom.offset-8')).at()).toEqual([420, 328]);
    expect((await place('.bottom.offset-8', 400, 770)).at()).toEqual([
      420, 722,
    ]);
  });

  test('sets position: fixed and restores the inline style on unmount', async () => {
    const { f, app } = await place('.bottom');
    expect(f.style.position).toBe('fixed');

    app.unmount();

    expect(f.getAttribute('style') ?? '').toBe('');
  });
});
