import { describe, test, afterEach, expect } from 'vitest';
import { createApp } from '../../src';
import { intersect, resize, morph, morphPlugin } from '../../src/plugins';
import { tick, sleep } from '../utils';

/**
 * IntersectionObserver and ResizeObserver do not exist in jsdom, so these
 * directives were previously covered only by stubbing the observer — which
 * tests the stub, not the directive.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

const settle = async (ms = 120) => {
  await tick(4);
  await sleep(ms);
};

describe('v-intersect', () => {
  test('fires when the element is scrolled into view, and .once stops there', async () => {
    document.body.innerHTML = `
      <div id="root" v-scope="{ hits: 0 }">
        <div id="scroller" style="height: 120px; overflow: auto;">
          <div style="height: 600px"></div>
          <div id="target" v-intersect.once="hits++" style="height: 20px">x</div>
          <div style="height: 600px"></div>
        </div>
      </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(intersect).mount(root);
    await settle();

    const scope = (root as any).__ctx.scope;
    expect(scope.hits).toBe(0);

    const scroller = root.querySelector('#scroller') as HTMLElement;
    scroller.scrollTop = 560;
    await settle();
    expect(scope.hits).toBe(1);

    // .once disconnected the observer, so leaving and re-entering adds nothing
    scroller.scrollTop = 0;
    await settle();
    scroller.scrollTop = 560;
    await settle();
    expect(scope.hits).toBe(1);
  });

  test('the observer is disconnected when morph removes the element', async () => {
    document.body.innerHTML = `
      <div id="root" v-scope="{ hits: 0 }">
        <div id="scroller" style="height: 120px; overflow: auto;">
          <div style="height: 600px"></div>
          <section id="r"><div v-intersect="hits++" style="height: 20px">x</div></section>
          <div style="height: 600px"></div>
        </div>
      </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(intersect).use(morphPlugin).mount(root);
    await settle();

    const scope = (root as any).__ctx.scope;
    const scroller = root.querySelector('#scroller') as HTMLElement;
    scroller.scrollTop = 560;
    await settle();
    expect(scope.hits).toBeGreaterThan(0);

    const seen = scope.hits;
    morph(
      document.querySelector('#r')!,
      `<section id="r"><span>gone</span></section>`
    );
    await settle();
    scroller.scrollTop = 0;
    await settle();
    scroller.scrollTop = 560;
    await settle();

    expect(scope.hits).toBe(seen);
  });
});

describe('v-resize', () => {
  test('reports the element box, and again when it actually changes', async () => {
    document.body.innerHTML = `
      <div id="root" v-scope="{ w: 0, h: 0 }">
        <div id="box" v-resize="w = $width; h = $height" style="width: 200px; height: 50px"></div>
      </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(resize).mount(root);
    await settle();

    const scope = (root as any).__ctx.scope;
    expect(Math.round(scope.w)).toBe(200);
    expect(Math.round(scope.h)).toBe(50);

    (root.querySelector('#box') as HTMLElement).style.width = '320px';
    await settle();
    expect(Math.round(scope.w)).toBe(320);
  });

  test('the observer is disconnected when morph removes the element', async () => {
    document.body.innerHTML = `
      <div id="root" v-scope="{ calls: 0 }">
        <section id="r"><div id="box" v-resize="calls++" style="width: 200px; height: 50px"></div></section>
      </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(resize).use(morphPlugin).mount(root);
    await settle();

    const scope = (root as any).__ctx.scope;
    expect(scope.calls).toBeGreaterThan(0);

    const box = root.querySelector('#box') as HTMLElement;
    morph(
      document.querySelector('#r')!,
      `<section id="r"><span>gone</span></section>`
    );
    await settle();

    const seen = scope.calls;
    // the node is detached but still referenced; resizing it must not report
    box.style.width = '400px';
    document.body.appendChild(box);
    await settle();
    box.remove();

    expect(scope.calls).toBe(seen);
  });
});
