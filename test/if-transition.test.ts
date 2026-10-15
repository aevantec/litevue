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

describe('leave transitions inside fragment blocks', () => {
  test('<template v-if> defers removal until its children finish leaving', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ show: true }">
      <template v-if="show">
        <div id="box" v-transition:fade></div>
        <p id="plain"></p>
      </template>
      <button @click="show = false"></button>
    </div>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    document.querySelector('button')!.click();
    await tick();
    // the whole fragment stays until the leave ends, so siblings do not jump
    const box = document.getElementById('box')!;
    expect(box).toBeTruthy();
    expect(box.classList.contains('fade-leave-active')).toBe(true);
    expect(document.getElementById('plain')).toBeTruthy();
    await sleep(20);
    expect(document.getElementById('box')).toBeNull();
    expect(document.getElementById('plain')).toBeNull();
    app.unmount();
  });

  test('<template v-for> rows run their leave when removed', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ items: [1, 2] }">
      <template v-for="i in items" :key="i">
        <div :id="'row' + i" v-transition:fade></div>
      </template>
      <button @click="items = [1]"></button>
    </div>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    document.querySelector('button')!.click();
    await tick();
    const row = document.getElementById('row2')!;
    expect(row).toBeTruthy();
    expect(row.classList.contains('fade-leave-active')).toBe(true);
    await sleep(20);
    expect(document.getElementById('row2')).toBeNull();
    expect(document.getElementById('row1')).toBeTruthy();
    app.unmount();
  });

  test('a fragment with no transitions is still removed synchronously', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ show: true }">
      <template v-if="show"><p id="plain"></p></template>
      <button @click="show = false"></button>
    </div>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    document.querySelector('button')!.click();
    await tick();
    expect(document.getElementById('plain')).toBeNull();
    app.unmount();
  });
});
