import { describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { transition } from '../src/plugins';
import { tick, sleep } from './utils';

describe('v-if leave transitions (v-transition unmount mode)', () => {
  test('defers unmount until the leave transition finishes', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ show: true }">
      <div id="box" v-if="show" v-transition:fade></div>
      <button @click="show = !show"></button>
    </div>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    expect(document.getElementById('box')).toBeTruthy();

    // toggle off: the element stays in the DOM with leave classes applied,
    // then unmounts once the (jsdom: zero-duration) transition ends
    document.querySelector('button')!.click();
    await tick();
    const box = document.getElementById('box')!;
    expect(box).toBeTruthy();
    expect(box.classList.contains('fade-leave-active')).toBe(true);
    await sleep(20);
    expect(document.getElementById('box')).toBeNull();

    // toggle back on: a fresh branch mounts and runs enter
    document.querySelector('button')!.click();
    await tick(5);
    expect(document.getElementById('box')).toBeTruthy();
    await sleep(20);
    expect(document.getElementById('box')!.className).toBe('');
    app.unmount();
  });

  test('@unmounted fires only after the leave finishes', async () => {
    const log: string[] = [];
    (window as any).leaveLog = log;
    document.body.innerHTML = `<div id="app" v-scope="{ show: true }">
      <div v-if="show" v-transition:fade @unmounted="leaveLog.push('u')"></div>
      <button @click="show = false"></button>
    </div>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    document.querySelector('button')!.click();
    await tick();
    // still animating: teardown (and the hook) haven't run yet
    expect(log).toEqual([]);
    await sleep(20);
    expect(log).toEqual(['u']);
    app.unmount();
  });
});
