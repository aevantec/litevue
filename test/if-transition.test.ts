import { describe, expect, test, vi } from 'vitest';
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

  // the enter is queued a microtask after insertion; running it after the
  // leave has begun made the leave's end timer stale, so removal never came
  test('removes an element inserted and removed in the same flush', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ open: false, blocked: true }">
      <p id="box" v-if="open" v-transition:fade></p>
      <span v-effect="if (open && blocked) open = false"></span>
    </div>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    (document.querySelector('#app') as any).__ctx.scope.open = true;
    await tick();
    await sleep(20);
    expect(document.getElementById('box')).toBeNull();
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

  test('re-entering while the old element leaves does not warn of a duplicate ref', async () => {
    // a real duration, so the old element is still in the document
    const style = vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          transitionDuration: '0.05s',
          transitionDelay: '0s',
          animationDuration: '0s',
          animationDelay: '0s',
        }) as any
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `<div id="app">
      <p class="box" ref="panel" v-if="show" v-transition:fade></p>
    </div>`;
    const app = createApp({ show: true }).use(transition);
    app.mount('#app');
    await tick();
    app.scope.show = false;
    await tick();
    app.scope.show = true;
    await tick();
    expect(document.querySelectorAll('.box')).toHaveLength(2);
    await sleep(80);
    const warnings = warn.mock.calls.map((c) => String(c[0]));
    style.mockRestore();
    warn.mockRestore();

    expect(document.querySelectorAll('.box')).toHaveLength(1);
    expect(warnings).toEqual([]);
    app.unmount();
  });
});

// The flush that closes a branch stops its effects first, so a leaving block
// must not re-render data that is gone while its animation plays.
describe('a leaving block stops reacting', () => {
  test('v-if="user" closes without an error and keeps its text', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ user: { name: 'Ada' } }">
      <p v-if="user" v-transition:fade>Welcome back, {{ user.name }}</p>
    </div>`;
    const errors: unknown[] = [];
    const app = createApp().use(transition);
    app.onError((e) => errors.push(e));
    app.mount('#app');
    await tick();
    const p = document.querySelector('p')!;
    expect(p.textContent).toBe('Welcome back, Ada');

    (document.querySelector('#app') as any).__ctx.scope.user = null;
    await tick();
    expect(p.isConnected).toBe(true);
    expect(errors).toEqual([]);
    expect(p.textContent).toBe('Welcome back, Ada');
    await sleep(20);
    expect(p.isConnected).toBe(false);
    app.unmount();
  });

  test('a leaving v-for row no longer follows state', async () => {
    document.body.innerHTML = `<ul id="app" v-scope="{ items: [1, 2] }">
      <li v-for="it in items" :key="it" v-transition:fade>{{ it }} of {{ items.length }}</li>
    </ul>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    const second = document.querySelectorAll('li')[1];
    expect(second.textContent).toBe('2 of 2');

    (document.querySelector('#app') as any).__ctx.scope.items = [1];
    await tick();
    expect(second.isConnected).toBe(true);
    expect(second.textContent).toBe('2 of 2');
    await sleep(20);
    expect(second.isConnected).toBe(false);
    app.unmount();
  });
});
