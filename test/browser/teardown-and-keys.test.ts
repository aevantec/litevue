import { describe, test, afterEach, expect } from 'vitest';
import { createApp } from '../../src';
import { morph, morphPlugin } from '../../src/plugins';
import { mount, tick } from '../utils';

/**
 * The remaining two bugs that shipped past a green jsdom suite: an unmounted
 * region still updating from a queued flush, and v-model still writing after
 * teardown. Both need real input events, which jsdom only simulates.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

describe('teardown holds against real user input', () => {
  test('v-model stops writing to the scope after the region unmounts', async () => {
    const { app, root, $ } = await mount(
      `<div v-scope="{ text: 'start' }"><input v-model="text"></div>`
    );
    await tick(6);

    const input = $('input') as HTMLInputElement;
    const scope = (root as any).__ctx.scope;

    input.focus();
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick(6);
    expect(scope.text).toBe('typed');

    app.unmount(root);
    await tick(6);

    // the element is still in the document after unmount, so nothing but the
    // teardown stops the listener
    input.value = 'after teardown';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick(6);
    expect(scope.text).toBe('typed');
  });

  test('a click handler stops firing once its region is unmounted', async () => {
    const { app, root, $ } = await mount(
      `<div v-scope="{ n: 0 }"><button @click="n++">go</button></div>`
    );
    await tick(6);

    const button = $('button');
    const scope = (root as any).__ctx.scope;

    button.click();
    await tick(6);
    expect(scope.n).toBe(1);

    app.unmount(root);
    await tick(6);

    button.click();
    await tick(6);
    expect(scope.n).toBe(1);
  });

  test('a job queued before unmount does not render after it', async () => {
    const { app, root, $ } = await mount(
      `<div v-scope="{ n: 0 }"><b>{{ n }}</b></div>`
    );
    await tick(6);
    const scope = (root as any).__ctx.scope;

    // mutate and unmount inside one tick, so the flush is already scheduled
    scope.n = 99;
    app.unmount(root);
    await tick(8);

    expect($('b').textContent).toBe('0');
  });
});

describe('keyed reconciliation against a live DOM', () => {
  test('reordering, inserting and removing keeps every row', async () => {
    const { root } = await mount(
      `<div v-scope="{ items: [1, 2, 3, 4] }">
         <ul><li v-for="i in items" :key="i">{{ i }}</li></ul>
       </div>`
    );
    await tick(6);
    const scope = (root as any).__ctx.scope;
    const rows = () =>
      [...root.querySelectorAll('li')].map((l) => l.textContent).join(',');
    expect(rows()).toBe('1,2,3,4');

    scope.items = [4, 3, 2, 1];
    await tick(8);
    expect(rows()).toBe('4,3,2,1');

    scope.items = [4, 9, 2];
    await tick(8);
    expect(rows()).toBe('4,9,2');

    // the fault this guards emptied the list entirely on a reorder that also
    // dropped an item
    scope.items = [];
    await tick(8);
    expect(rows()).toBe('');

    scope.items = [7, 8];
    await tick(8);
    expect(rows()).toBe('7,8');
  });

  test('morphing a list preserves scroll position on an untouched row', async () => {
    document.body.innerHTML = `
      <div id="root" v-scope>
        <ul id="r">
          <li id="a">a</li>
          <li id="b" style="height: 60px; overflow: auto"><div style="height: 400px">tall</div></li>
          <li id="c">c</li>
        </ul>
      </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(morphPlugin).mount(root);
    await tick(6);

    const b = root.querySelector('#b') as HTMLElement;
    b.scrollTop = 220;
    expect(b.scrollTop).toBe(220);

    morph(
      document.querySelector('#r')!,
      `<ul id="r">
         <li id="a">a</li>
         <li id="b" style="height: 60px; overflow: auto"><div style="height: 400px">tall</div></li>
         <li id="c">CHANGED</li>
       </ul>`
    );
    await tick(8);

    expect(root.querySelector('#c')!.textContent).toBe('CHANGED');
    // scroll offset lives on the node, not in the markup — it is exactly what
    // a naive innerHTML replacement destroys, and what jsdom cannot measure
    expect(root.querySelector('#b')).toBe(b);
    expect(b.scrollTop).toBe(220);
  });
});
