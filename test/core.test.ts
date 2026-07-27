import { describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { mount, tick } from './utils';

describe('createApp', () => {
  test('interpolation renders and updates reactively', async () => {
    const { $, app } = await mount(
      `<div v-scope="{ n: 1 }">
        <span>{{ n }}</span>
        <button @click="n++"></button>
      </div>`
    );
    expect($('span').textContent).toBe('1');
    $('button').click();
    await tick();
    expect($('span').textContent).toBe('2');
    app.unmount();
  });

  test('root data object is the root scope', async () => {
    const { $ } = await mount(`<div v-scope><span>{{ msg }}</span></div>`, {
      msg: 'hi',
    });
    expect($('span').textContent).toBe('hi');
  });

  test('getters and methods on root data', async () => {
    const { $ } = await mount(
      `<div v-scope>
        <span>{{ plusOne }}</span>
        <button @click="inc"></button>
      </div>`,
      {
        count: 0,
        get plusOne() {
          return this.count + 1;
        },
        inc() {
          this.count++;
        },
      }
    );
    expect($('span').textContent).toBe('1');
    $('button').click();
    await tick();
    expect($('span').textContent).toBe('2');
  });

  test('setup-function style: returned object becomes root scope', async () => {
    const { $ } = await mount(
      `<div v-scope>
        <span>{{ count }}</span>
        <button @click="inc"></button>
      </div>`,
      undefined
    );
    // mount() helper passes data through createApp; test the fn form directly
    document.body.innerHTML = `<div id="s" v-scope><i>{{ n }}</i><button @click="inc"></button></div>`;
    const app = createApp(() => ({
      n: 5,
      inc() {
        this.n++;
      },
    }));
    app.mount('#s');
    await tick();
    const el = document.querySelector('#s') as HTMLElement;
    expect(el.querySelector('i')!.textContent).toBe('5');
    (el.querySelector('button') as HTMLElement).click();
    await tick();
    expect(el.querySelector('i')!.textContent).toBe('6');
    app.unmount();
  });

  test('v-bind: class and attribute', async () => {
    const { $ } = await mount(
      `<div v-scope="{ on: false, url: '/a' }">
        <span :class="{ active: on }" :data-url="url"></span>
        <button @click="on = true; url = '/b'"></button>
      </div>`
    );
    expect($('span').className).toBe('');
    expect($('span').getAttribute('data-url')).toBe('/a');
    $('button').click();
    await tick();
    expect($('span').className).toBe('active');
    expect($('span').getAttribute('data-url')).toBe('/b');
  });

  test('v-show toggles display', async () => {
    const { $ } = await mount(
      `<div v-scope="{ vis: true }">
        <span v-show="vis"></span>
        <button @click="vis = !vis"></button>
      </div>`
    );
    expect($('span').style.display).not.toBe('none');
    $('button').click();
    await tick();
    expect($('span').style.display).toBe('none');
  });

  test('unmount stops effects', async () => {
    const { $, app } = await mount(
      `<div v-scope="{ n: 1 }"><span>{{ n }}</span><button @click="n++"></button></div>`
    );
    const scope = (window as any).__LITE_VUE__.getScope($('span'));
    app.unmount();
    scope.n = 99;
    await tick();
    expect($('span').textContent).toBe('1');
  });
});
