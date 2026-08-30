import { describe, expect, test, afterEach } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';
afterEach(() => {
  document.body.innerHTML = '';
});

const mount = async (html: string, data?: any) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  createApp(data).mount(root);
  await tick();
  return root;
};

/**
 * The docs teach `v-bind:` / `v-on:` beside the `:` / `@` shorthand, but every
 * example uses shorthand — so nothing else in the suite would catch a parsing
 * change that broke the full spelling.
 */
describe('full directive syntax', () => {
  test('v-bind:attr equals :attr', async () => {
    const r = await mount(`<div v-scope="{ c: 'on', n: 3 }">
      <b v-bind:class="c" v-bind:data-n="n" v-bind:title="c"></b></div>`);
    const b = r.querySelector('b')!;
    expect(b.className).toBe('on');
    expect(b.getAttribute('data-n')).toBe('3');
    expect(b.getAttribute('title')).toBe('on');
  });

  test('v-bind:class object form and merge with static class', async () => {
    const r = await mount(`<div v-scope="{ ok: true }">
      <b class="base" v-bind:class="{ active: ok }"></b></div>`);
    expect(r.querySelector('b')!.className).toBe('base active');
  });

  test('v-bind:style object form', async () => {
    const r = await mount(`<div v-scope="{ c: 'red' }">
      <b v-bind:style="{ color: c }"></b></div>`);
    expect((r.querySelector('b') as HTMLElement).style.color).toBe('red');
  });

  test('v-on:event equals @event, with modifiers', async () => {
    const r = await mount(`<div v-scope="{ n: 0, last: '' }">
      <button id="a" v-on:click="n++"></button>
      <form id="f" v-on:submit.prevent="last = 'submitted'"><button></button></form>
      <span>{{ n }}/{{ last }}</span></div>`);
    r.querySelector<HTMLElement>('#a')!.click();
    const e = new Event('submit', { bubbles: true, cancelable: true });
    r.querySelector('#f')!.dispatchEvent(e);
    await tick();
    expect(r.querySelector('span')!.textContent).toBe('1/submitted');
    expect(e.defaultPrevented).toBe(true);
  });

  test('v-on: with a key filter', async () => {
    const r = await mount(`<div v-scope="{ hit: false }">
      <input v-on:keyup.enter="hit = true" /><span>{{ hit }}</span></div>`);
    r.querySelector('input')!.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })
    );
    await tick();
    expect(r.querySelector('span')!.textContent).toBe('true');
  });

  test('v-bind:ref behaves as the ref directive', async () => {
    const r = await mount(`<div v-scope="{ name: 'box' }">
      <b v-bind:ref="name"></b><span>{{ $refs.box ? 'yes' : 'no' }}</span></div>`);
    await tick();
    expect(r.querySelector('span')!.textContent).toBe('yes');
  });
});
