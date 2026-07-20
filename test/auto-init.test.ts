import { describe, expect, test } from 'vitest';
import { createApp, devtools, store } from '../src';
import { autoInit } from '../src/plugins';
import { tick } from './utils';

describe('repeated mount / unmount (auto-init prerequisite)', () => {
  test('unmount tears down every mounted batch, not just the last', async () => {
    document.body.innerHTML = `
      <div id="a" v-scope="{ n: 0 }"><span>{{ n }}</span></div>
      <div id="b" v-scope="{ m: 0 }"><span>{{ m }}</span></div>`;
    const app = createApp();
    app.mount('#a');
    app.mount('#b');
    await tick();
    const scopeA = devtools.getScope(document.querySelector('#a')!)!;
    const scopeB = devtools.getScope(document.querySelector('#b')!)!;
    app.unmount();
    scopeA.n = 9;
    scopeB.m = 9;
    await tick();
    expect(document.querySelector('#a span')!.textContent).toBe('0');
    expect(document.querySelector('#b span')!.textContent).toBe('0');
  });
});

describe('autoInit plugin', () => {
  test('mounts dynamically added v-scope fragments into the same app', async () => {
    store('auto-store', { hits: 0 });
    document.body.innerHTML = `<div id="app" v-scope><span>static</span></div>`;
    const app = createApp({ shared: 'root-state' }).use(autoInit);
    app.mount('#app');
    await tick();

    // simulate an htmx-style swap
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="late" v-scope="{ n: 1 }">
        <i>{{ n }} / {{ shared }} / {{ $store['auto-store'].hits }}</i>
        <button @click="n++; $store['auto-store'].hits++"></button>
      </div>`
    );
    await tick(5);
    const late = document.getElementById('late')!;
    expect(late.querySelector('i')!.textContent).toBe('1 / root-state / 0');
    (late.querySelector('button') as HTMLElement).click();
    await tick();
    expect(late.querySelector('i')!.textContent).toBe('2 / root-state / 1');
    app.unmount();
  });

  test('mounts v-scope descendants of added wrappers', async () => {
    document.body.innerHTML = `<div id="app" v-scope></div>`;
    const app = createApp().use(autoInit);
    app.mount('#app');
    await tick();
    const wrapper = document.createElement('section');
    wrapper.innerHTML = `<div><div id="deep" v-scope="{ ok: true }"><b>{{ ok }}</b></div></div>`;
    document.body.appendChild(wrapper);
    await tick(5);
    expect(document.querySelector('#deep b')!.textContent).toBe('true');
    app.unmount();
  });

  test('does not double-bind framework-inserted nodes', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ show: false, count: 0 }">
      <button id="toggle" @click="show = !show"></button>
      <div v-if="show" v-scope="{}">
        <button id="inc" @click="count++"></button>
      </div>
      <span>{{ count }}</span>
    </div>`;
    const app = createApp().use(autoInit);
    app.mount('#app');
    await tick();
    // insert the v-if branch (observer sees the insertion) …
    document.getElementById('toggle')!.click();
    await tick(5);
    // … then a single click must increment exactly once
    document.getElementById('inc')!.click();
    await tick(5);
    expect(document.querySelector('span')!.textContent).toBe('1');
    app.unmount();
  });
});
