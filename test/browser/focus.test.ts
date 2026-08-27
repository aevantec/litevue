import { describe, test, afterEach, expect } from 'vitest';
import { createApp } from '../../src';
import { focus, morph, morphPlugin } from '../../src/plugins';
import { mount, tick, sleep } from '../utils';

/**
 * Focus is the clearest case for running in a real engine. jsdom tracks
 * `document.activeElement` as a plain field and never moves it on its own, so
 * every one of these passed there while the browser lost focus outright.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

describe('focus survives node movement', () => {
  test('reordering a keyed v-for keeps focus in the same row', async () => {
    const { root } = await mount(
      `<div v-scope="{ items: [1, 2, 3] }">
         <ul><li v-for="i in items" :key="i"><input :data-k="i"></li></ul>
       </div>`
    );
    await tick(6);

    const second = root.querySelector('[data-k="2"]') as HTMLInputElement;
    second.focus();
    second.value = 'typed';
    expect(document.activeElement).toBe(second);

    // moving a focused element with insertBefore drops focus to <body> in a
    // real engine unless the node itself is reused rather than recreated
    (root as any).__ctx.scope.items = [3, 2, 1];
    await tick(8);

    const after = root.querySelector('[data-k="2"]') as HTMLInputElement;
    expect(after).toBe(second);
    expect(document.activeElement).toBe(after);
    expect(after.value).toBe('typed');
  });

  test('morphing around a focused field leaves it focused and uncleared', async () => {
    document.body.innerHTML = `<div id="root" v-scope="{ n: 0 }">
         <section id="r"><span id="before">a</span><input id="keep"></section>
       </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(morphPlugin).mount(root);
    await tick(6);

    const input = root.querySelector('#keep') as HTMLInputElement;
    input.focus();
    input.value = 'half typed';
    input.setSelectionRange(4, 4);

    morph(
      document.querySelector('#r')!,
      `<section id="r"><span id="before">CHANGED</span><input id="keep"></section>`
    );
    await tick(8);

    expect(root.querySelector('#before')!.textContent).toBe('CHANGED');
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('half typed');
    // caret position is browser state riding on the node; recreating the
    // input would silently reset it to the end
    expect(input.selectionStart).toBe(4);
  });
});

describe('v-focus', () => {
  test('focuses when the expression turns true, and selects with .select', async () => {
    document.body.innerHTML = `<div id="root" v-scope="{ on: false }"><input v-focus.select="on" value="preset"></div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(focus).mount(root);
    await tick(6);

    const input = root.querySelector('input') as HTMLInputElement;
    expect(document.activeElement).not.toBe(input);

    (root as any).__ctx.scope.on = true;
    await tick(8);

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('preset'.length);
  });

  test('does not steal focus for an element torn down inside the same tick', async () => {
    document.body.innerHTML = `<div id="root" v-scope="{ on: true, show: true }">
         <input id="other">
         <section id="r"><input id="grabby" v-focus="on"></section>
       </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(focus).use(morphPlugin).mount(root);
    await tick(2);

    const other = root.querySelector('#other') as HTMLInputElement;
    other.focus();

    // v-focus defers to a microtask; if the node goes first, focusing it would
    // blur whatever the user is actually typing in
    morph(
      document.querySelector('#r')!,
      `<section id="r"><span>gone</span></section>`
    );
    await tick(10);
    await sleep(30);

    expect(document.activeElement).toBe(other);
  });
});
