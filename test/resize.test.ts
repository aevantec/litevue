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

describe('v-resize.window', () => {
  test('fires immediately with the viewport, then on every resize', async () => {
    installResizeObserver();
    (window as any).innerWidth = 1024;
    (window as any).innerHeight = 768;
    const { root } = mount(
      `<div v-scope="{ w: 0, h: 0 }"><div v-resize.window="w = $width; h = $height"></div></div>`
    );
    await tick();
    // fires on mount, not only on the first resize: a layout that branches on
    // width would otherwise render once against nothing
    expect((root as any).__ctx.scope.w).toBe(1024);
    expect((root as any).__ctx.scope.h).toBe(768);

    (window as any).innerWidth = 480;
    (window as any).innerHeight = 900;
    window.dispatchEvent(new Event('resize'));
    await tick();
    expect((root as any).__ctx.scope.w).toBe(480);
    expect((root as any).__ctx.scope.h).toBe(900);
  });

  test('does not observe the element', async () => {
    installResizeObserver();
    mount(`<div v-scope><div v-resize.window="0"></div></div>`);
    await tick();
    expect(observed).toEqual([]);
  });

  test('stops listening when the region unmounts', async () => {
    installResizeObserver();
    (window as any).innerWidth = 800;
    const { app, root } = mount(
      `<div v-scope="{ n: 0 }"><div v-resize.window="n++"></div></div>`
    );
    await tick();
    const settled = (root as any).__ctx.scope.n;
    app.unmount();
    (window as any).innerWidth = 300;
    window.dispatchEvent(new Event('resize'));
    await tick();
    expect((root as any).__ctx.scope.n).toBe(settled);
  });
});

describe('v-resize.visual', () => {
  /** A stand-in visualViewport: an EventTarget with a size, as browsers expose. */
  const stubVisualViewport = (width: number, height: number) => {
    const view = Object.assign(new EventTarget(), { width, height });
    Object.defineProperty(window, 'visualViewport', {
      value: view,
      configurable: true,
    });
    return view;
  };
  afterEach(() => {
    delete (window as any).visualViewport;
  });

  test('reads the visual viewport, which shrinks when a keyboard opens', async () => {
    installResizeObserver();
    (window as any).innerHeight = 800;
    const view = stubVisualViewport(390, 800);
    const { root } = mount(
      `<div v-scope="{ w: 0, h: 0 }"><div v-resize.visual="w = $width; h = $height"></div></div>`
    );
    await tick();
    expect((root as any).__ctx.scope.h).toBe(800);

    // the on-screen keyboard shrinks the visual viewport, not innerHeight
    view.height = 460;
    view.dispatchEvent(new Event('resize'));
    await tick();
    expect((root as any).__ctx.scope.w).toBe(390);
    expect((root as any).__ctx.scope.h).toBe(460);
    expect(observed).toEqual([]);
  });

  test('.window keeps the layout viewport, so pinch-zoom does not move it', async () => {
    installResizeObserver();
    (window as any).innerWidth = 1024;
    stubVisualViewport(512, 400);
    const { root } = mount(
      `<div v-scope="{ w: 0 }"><div v-resize.window="w = $width"></div></div>`
    );
    await tick();
    expect((root as any).__ctx.scope.w).toBe(1024);
  });

  test('falls back to innerWidth and innerHeight without visualViewport', async () => {
    installResizeObserver();
    delete (window as any).visualViewport;
    (window as any).innerWidth = 1024;
    (window as any).innerHeight = 700;
    const { root } = mount(
      `<div v-scope="{ w: 0, h: 0 }"><div v-resize.visual="w = $width; h = $height"></div></div>`
    );
    await tick();
    expect((root as any).__ctx.scope.w).toBe(1024);
    expect((root as any).__ctx.scope.h).toBe(700);
  });

  test('stops listening when the region unmounts', async () => {
    installResizeObserver();
    const view = stubVisualViewport(390, 800);
    const { app, root } = mount(
      `<div v-scope="{ n: 0 }"><div v-resize.visual="n++"></div></div>`
    );
    await tick();
    const settled = (root as any).__ctx.scope.n;
    app.unmount();
    view.dispatchEvent(new Event('resize'));
    await tick();
    expect((root as any).__ctx.scope.n).toBe(settled);
  });
});
