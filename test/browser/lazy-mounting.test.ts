import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../../src';
const tick = async (n = 6) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
afterEach(() => {
  document.body.innerHTML = '';
});

describe('lazy mounting', () => {
  test('visible: inert until scrolled into view', async () => {
    document.body.innerHTML = `
      <div id="root">
        <div id="scroller" style="height:100px;overflow:auto">
          <div style="height:600px"></div>
          <div id="lazy" v-scope.visible="{ n: 7 }"><b>{{ n }}</b></div>
          <div style="height:600px"></div>
        </div>
      </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().mount(root);
    await tick();
    await sleep(120);
    const b = () => root.querySelector('#lazy b')!;
    console.log(
      `  before scroll: ${JSON.stringify(b().textContent)} (expect the raw template)`
    );
    expect(b().textContent).toContain('{{');

    (root.querySelector('#scroller') as HTMLElement).scrollTop = 560;
    await tick();
    await sleep(200);
    console.log(
      `  after scroll:  ${JSON.stringify(b().textContent)} (expect 7)`
    );
    expect(b().textContent).toBe('7');
  });

  test('idle: mounts without interaction', async () => {
    document.body.innerHTML = `<div id="r" v-scope.idle="{ n: 3 }"><b>{{ n }}</b></div>`;
    const root = document.body.querySelector('#r') as HTMLElement;
    createApp().mount(root);
    await tick();
    console.log(
      `  immediately: ${JSON.stringify(root.querySelector('b')!.textContent)}`
    );
    await sleep(300);
    console.log(
      `  after idle:  ${JSON.stringify(root.querySelector('b')!.textContent)}`
    );
    expect(root.querySelector('b')!.textContent).toBe('3');
  });

  test('interaction: mounts on first pointerdown', async () => {
    document.body.innerHTML = `<div id="r" v-scope.interaction="{ n: 5 }"><b>{{ n }}</b></div>`;
    const root = document.body.querySelector('#r') as HTMLElement;
    createApp().mount(root);
    await tick();
    await sleep(80);
    expect(root.querySelector('b')!.textContent).toContain('{{');
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await tick();
    await sleep(80);
    console.log(
      `  after pointerdown: ${JSON.stringify(root.querySelector('b')!.textContent)}`
    );
    expect(root.querySelector('b')!.textContent).toBe('5');
  });

  test('unmount before the trigger releases the observer', async () => {
    document.body.innerHTML = `<div id="r" v-scope.interaction="{ n: 1 }"><b>{{ n }}</b></div>`;
    const root = document.body.querySelector('#r') as HTMLElement;
    const app = createApp().mount(root);
    await tick();
    (app as any).unmount(root);
    await tick();
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await tick();
    await sleep(80);
    console.log(
      `  after unmount + click: ${JSON.stringify(root.querySelector('b')!.textContent)} (expect raw)`
    );
    expect(root.querySelector('b')!.textContent).toContain('{{');
  });
});
