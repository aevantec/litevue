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

// Their content is built by a job that ran after the walk had left the
// v-once region, so it came out reactive.
describe('v-once around directives that build later', () => {
  test.each([
    ['v-if', `<p v-if="true">{{ n }}</p>`, 'p'],
    ['v-for', `<p v-for="i in 1">{{ n }}</p>`, 'p'],
    ['<template v-if>', `<template v-if="true"><p>{{ n }}</p></template>`, 'p'],
  ])('content under %s stays static', async (_, inner, sel) => {
    const { $, root } = await mount(
      `<div v-scope="{ n: 1 }"><div v-once>${inner}</div><b>{{ n }}</b></div>`
    );
    expect($(sel).textContent).toBe('1');

    (root as any).__ctx.scope.n = 2;
    await tick();
    expect($(sel).textContent).toBe('1');
    expect($('b').textContent).toBe('2');
  });

  test('a v-effect inside runs once', async () => {
    const seen: number[] = [];
    const { root } = await mount(
      `<div v-scope="{ n: 1 }"><div v-once><i v-effect="seen.push(n)"></i></div></div>`,
      { seen }
    );
    await tick(4);
    (root as any).__ctx.scope.n = 2;
    await tick(4);
    expect(seen).toEqual([1]);
  });
});
