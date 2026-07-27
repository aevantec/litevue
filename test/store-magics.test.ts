import { describe, expect, test } from 'vitest';
import { store } from '../src';
import { mount, tick } from './utils';

describe('global store', () => {
  test('$store is shared and reactive across apps', async () => {
    store('cart', {
      items: [] as string[],
      add(item: string) {
        this.items.push(item);
      },
      get count() {
        return this.items.length;
      },
    });
    const a = await mount(
      `<div v-scope><button @click="$store.cart.add('x')"></button><span>{{ $store.cart.count }}</span></div>`
    );
    // second app mounted alongside (mount() wipes body, so nest both)
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="b" v-scope><i>{{ $store.cart.count }}</i></div>`
    );
    const { createApp } = await import('../src');
    const appB = createApp();
    appB.mount('#b');
    await tick();

    a.$('button').click();
    await tick();
    expect(a.$('span').textContent).toBe('1');
    expect(document.querySelector('#b i')!.textContent).toBe('1');

    // JS-side mutation flows everywhere
    store('cart').add('y');
    await tick();
    expect(a.$('span').textContent).toBe('2');
    appB.unmount();
  });

  test('init() runs once at registration', () => {
    let runs = 0;
    store('boot', {
      ready: false,
      init() {
        runs++;
        this.ready = true;
      },
    });
    expect(runs).toBe(1);
    expect(store('boot').ready).toBe(true);
  });

  test('late registration is picked up reactively', async () => {
    const { $ } = await mount(
      `<div v-scope><span>{{ $store.late ? $store.late.msg : 'nope' }}</span></div>`
    );
    expect($('span').textContent).toBe('nope');
    store('late', { msg: 'here' });
    await tick();
    expect($('span').textContent).toBe('here');
  });
});

describe('magic properties', () => {
  test('$dispatch bubbles a custom event with detail', async () => {
    const { $ } = await mount(
      `<div v-scope="{ got: '' }" @notify="got = $event.detail.from">
        <button @click="$dispatch('notify', { from: 'child' })"></button>
        <span>{{ got }}</span>
      </div>`
    );
    $('button').click();
    await tick();
    expect($('span').textContent).toBe('child');
  });

  test('$watch observes changes with (value, oldValue)', async () => {
    const log: any[] = [];
    (window as any).watchLog = log;
    const { $ } = await mount(
      `<div v-scope="{ n: 0 }">
        <i @mounted="$watch('n', (v, o) => watchLog.push([v, o]))"></i>
        <button @click="n++"></button>
      </div>`
    );
    $('button').click();
    await tick();
    expect(log).toEqual([[1, 0]]);
  });

  test('$watch stops when its scope unmounts', async () => {
    const log: any[] = [];
    (window as any).innerWatchLog = log;
    const { $ } = await mount(
      `<div v-scope="{ n: 0, show: true }">
        <div v-if="show" v-scope="{}" @mounted="$watch('n', (v) => innerWatchLog.push(v))"></div>
        <button id="inc" @click="n++"></button>
        <button id="toggle" @click="show = false"></button>
      </div>`
    );
    $('#inc').click();
    await tick();
    expect(log).toEqual([1]);
    $('#toggle').click();
    await tick();
    $('#inc').click();
    await tick();
    expect(log).toEqual([1]);
  });

  test('$id is stable per scope and unique across scopes', async () => {
    const { $$ } = await mount(
      `<div v-scope>
        <div v-scope="{}">
          <label :for="$id('f')"></label>
          <input :id="$id('f')" />
        </div>
        <div v-scope="{}"><input :id="$id('f')" /></div>
      </div>`
    );
    const [label] = $$('label') as HTMLLabelElement[];
    const [inputA, inputB] = $$('input');
    expect(label.htmlFor).toBe(inputA.id);
    expect(inputA.id).toMatch(/^f-\d+$/);
    expect(inputB.id).toMatch(/^f-\d+$/);
    expect(inputA.id).not.toBe(inputB.id);
  });

  test('$nextTick runs after the flush', async () => {
    const { $ } = await mount(
      `<div v-scope="{ n: 0, snap: '' }">
        <span>{{ n }}</span>
        <button @click="n++; $nextTick(() => (snap = $refs.out.textContent))"></button>
        <span ref="out">{{ n }}</span>
      </div>`
    );
    $('button').click();
    await tick(5);
    const scope = (window as any).__LITE_VUE__.getScope($('span'));
    expect(scope.snap).toBe('1');
  });
});
