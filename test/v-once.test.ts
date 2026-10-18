import { describe, expect, test } from 'vitest';
import { morph, morphPlugin } from '../src/plugins';
import { mount, tick } from './utils';

describe('v-once nested in v-once', () => {
  test('content after the inner region stays static', async () => {
    const { $ } = await mount(
      `<div v-scope="{ x: 1 }">
        <div v-once><p v-once>{{ x }}</p><span>{{ x }}</span></div>
        <b>{{ x }}</b>
        <button @click="x++"></button>
      </div>`
    );
    $('button').click();
    await tick();
    expect($('p').textContent).toBe('1');
    expect($('span').textContent).toBe('1');
    // outside the region, still reactive
    expect($('b').textContent).toBe('2');
  });
});

describe('v-if inside v-once', () => {
  test('a subtree removed by morph is disposed without throwing', async () => {
    document.body.innerHTML = `<div id="root" v-scope="{ on: true }"><section id="r"><div v-once><p v-if="on">x</p></div></section></div>`;
    const { createApp } = await import('../src');
    const app = createApp().use(morphPlugin);
    app.mount('#root');
    await tick();
    const errors: unknown[] = [];
    app.onError((e) => errors.push(e));

    expect(() =>
      morph(document.querySelector('#r')!, `<section id="r"></section>`)
    ).not.toThrow();
    expect(errors).toEqual([]);
    app.unmount();
  });
});
