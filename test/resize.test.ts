import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { resize } from '../src/plugins';
import { tick } from './utils';

/** jsdom has no ResizeObserver, so the suite drives one by hand. */
let fire: (w: number, h: number) => void = () => {};
let observed: Element[] = [];
let disconnects = 0;

const installResizeObserver = () => {
  (window as any).ResizeObserver = class {
    constructor(cb: (entries: any[]) => void) {
      fire = (w, h) => cb([{ contentRect: { width: w, height: h } }]);
    }
    observe(el: Element) {
      observed.push(el);
    }
    disconnect() {
      disconnects++;
    }
  };
};

const mount = (html: string) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  const app = createApp().use(resize);
  app.mount(root);
  return { app, root };
};

afterEach(() => {
  observed = [];
  disconnects = 0;
  document.body.innerHTML = '';
});

describe('v-resize', () => {
  test('exposes $width and $height to the expression', async () => {
    installResizeObserver();
    const { root } = mount(
      `<div v-scope="{ w: 0, h: 0 }" v-resize="w = $width; h = $height">
        <span>{{ w }}x{{ h }}</span>
      </div>`
    );
    await tick();
    expect(observed).toEqual([root]);

    fire(640, 480);
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('640x480');

    fire(320, 200);
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('320x200');
  });

  test('stops observing when the region unmounts', async () => {
    installResizeObserver();
    const { app, root } = mount(
      `<div v-scope="{ w: 0 }" v-resize="w = $width"><span>{{ w }}</span></div>`
    );
    await tick();

    app.unmount(root);
    expect(disconnects).toBe(1);
  });

  test('works without the media plugin installed', async () => {
    installResizeObserver();
    // the point of the split: container width should not drag in the
    // breakpoint machinery, so this app never calls use(media)
    const { root } = mount(
      `<div v-scope="{ w: 0 }" v-resize="w = Math.round($width)"><span>{{ w }}</span></div>`
    );
    await tick();
    fire(123.4, 50);
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('123');
  });
});
