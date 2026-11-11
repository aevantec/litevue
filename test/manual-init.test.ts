import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp, devtools, store } from '../src';
import { tick } from './utils';

describe('manual initialization of dynamic content (initTree-style)', () => {
  test('injected markup stays inert until explicitly mounted', async () => {
    document.body.innerHTML = `<div id="app" v-scope><span>static</span></div>`;
    const app = createApp();
    app.mount('#app');
    await tick();

    // security property: dynamically added DOM must NOT auto-execute —
    // expressions in injected markup only run after an explicit mount
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="late" v-scope="{ n: 1 }"><i>{{ n }}</i></div>`
    );
    await tick(5);
    expect(document.querySelector('#late i')!.textContent).toBe('{{ n }}');
    expect(document.getElementById('late')!.hasAttribute('v-scope')).toBe(true);

    // explicit opt-in: app.mount(el) initializes the subtree
    app.mount(document.getElementById('late'));
    await tick();
    expect(document.querySelector('#late i')!.textContent).toBe('1');
    app.unmount();
  });

  test('manually mounted fragments join the same app (root scope + $store)', async () => {
    store('manual-store', { hits: 0 });
    document.body.innerHTML = `<div id="app" v-scope><span>static</span></div>`;
    const app = createApp({ shared: 'root-state' });
    app.mount('#app');
    await tick();

    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="late" v-scope="{ n: 1 }">
        <i>{{ n }} / {{ shared }} / {{ $store['manual-store'].hits }}</i>
        <button @click="n++; $store['manual-store'].hits++"></button>
      </div>`
    );
    app.mount(document.getElementById('late'));
    await tick();
    const late = document.getElementById('late')!;
    expect(late.querySelector('i')!.textContent).toBe('1 / root-state / 0');
    (late.querySelector('button') as HTMLElement).click();
    await tick();
    expect(late.querySelector('i')!.textContent).toBe('2 / root-state / 1');
    app.unmount();
  });

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

// What the walker rendered is data: a later walk of the same nodes must not
// read it as template source, while markup added since is still bound.
describe('rendered output stays inert when walked again', () => {
  const payload = '{{ window.__rewalked = 1 }}';
  const ran = () => (window as any).__rewalked;
  const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    delete (window as any).__rewalked;
    vi.restoreAllMocks();
  });

  test('mounting the same element again', async () => {
    document.body.innerHTML = `<div id="app" v-scope><p>{{ c }}</p><b v-text="c"></b></div>`;
    const app = createApp({ c: payload }).mount('#app')!;
    await tick();
    quiet();
    app.mount('#app');
    await tick();
    expect(ran()).toBeUndefined();
    expect(document.querySelector('p')!.textContent).toBe(payload);
    app.unmount();
  });

  test('unmounting an element and mounting it again', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ c: n }"><span>{{ c }}</span></div>`;
    const el = document.getElementById('app')!;
    const app = createApp({ n: payload }).mount(el)!;
    await tick();
    app.unmount(el);
    quiet();
    app.mount(el);
    await tick();
    expect(ran()).toBeUndefined();
    app.unmount();
  });

  test('mounting a container after appending markup without v-scope', async () => {
    document.body.innerHTML = `<ul id="list"><li v-scope="{ m: msgs[0] }">{{ m }}</li></ul>`;
    const app = createApp({ msgs: [payload], shared: 'state' }).mount()!;
    await tick();
    const list = document.getElementById('list')!;
    list.insertAdjacentHTML('beforeend', '<li>{{ shared }}</li>');
    app.mount(list);
    await tick();
    expect(ran()).toBeUndefined();
    expect(list.firstElementChild!.textContent).toBe(payload);
    expect(list.lastElementChild!.textContent).toBe('state');
    app.unmount();
  });

  test('a second app walking the document', async () => {
    document.body.innerHTML = `<div id="a" v-scope="{ name: n }"><p v-text="name"></p><div v-html="html"></div></div>`;
    const first = createApp({
      n: payload,
      html: '<i @click="window.__rewalked = 2">{{ window.__rewalked = 3 }}</i>',
    }).mount('#a')!;
    await tick();
    quiet();
    const second = createApp().mount()!;
    await tick();
    document.querySelector('i')!.click();
    expect(ran()).toBeUndefined();
    second.unmount();
    first.unmount();
  });
});
