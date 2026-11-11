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

/**
 * jsdom has no ResizeObserver. This one follows the spec: an observation
 * starts at 0x0, and `layout()` reports each element whose size has changed.
 */
let observers: { cb: () => void; els: Map<Element, string> }[] = [];
const layout = () => {
  for (const { cb, els } of observers) {
    for (const [el, last] of els) {
      const size = `${(el as HTMLElement).offsetWidth}x${(el as HTMLElement).offsetHeight}`;
      if (size !== last) {
        els.set(el, size);
        cb();
      }
    }
  }
};

const realCSS = (globalThis as any).CSS;
beforeEach(() => {
  (globalThis as any).CSS = { supports: () => false };
  (window as any).ResizeObserver = class {
    els = new Map<Element, string>();
    constructor(cb: () => void) {
      observers.push({ cb, els: this.els });
    }
    observe(el: Element) {
      this.els.set(el, '0x0');
    }
    disconnect() {
      this.els.clear();
    }
  };
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
  delete (window as any).ResizeObserver;
  observers = [];
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
    expect(observers[0].els.size).toBe(0);
  });
});

describe('v-anchor script placement: no size at mount', () => {
  const proto = HTMLElement.prototype as any;
  // an element has a size only while it is connected and displayed
  beforeEach(() => {
    const laidOut = (el: HTMLElement) =>
      el.isConnected && el.style.display !== 'none';
    for (const [prop, key] of [
      ['offsetWidth', 'w'],
      ['offsetHeight', 'h'],
    ]) {
      Object.defineProperty(proto, prop, {
        configurable: true,
        get(this: HTMLElement) {
          return laidOut(this) ? +(this.dataset[key] ?? 0) : 0;
        },
      });
    }
  });
  afterEach(() => {
    delete proto.offsetWidth;
    delete proto.offsetHeight;
  });

  /** Anchor at (400, 300) sized 100x20; tooltip 60x40, shown on click. */
  const show = async (directive: string) => {
    document.body.innerHTML = `
      <div v-scope="{ tip: false }">
        <button ref="a" @click="tip = true"></button>
        <span id="f" data-w="60" data-h="40" ${directive}="tip" v-anchor.top="$refs.a"></span>
      </div>`;
    const a = document.querySelector('button')!;
    a.getBoundingClientRect = () =>
      ({
        left: 400,
        top: 300,
        right: 500,
        bottom: 320,
        width: 100,
        height: 20,
      }) as DOMRect;
    createApp().use(popover).mount(document.body.firstElementChild!);
    await tick();
    a.click();
    await tick();
    layout();
    const f = document.querySelector('#f') as HTMLElement;
    return [f.style.left, f.style.top];
  };

  test('a v-show element hidden at mount is placed once shown', async () => {
    expect(await show('v-show')).toEqual(['420px', '260px']);
  });

  test('a v-if element is placed once inserted', async () => {
    expect(await show('v-if')).toEqual(['420px', '260px']);
  });
});
