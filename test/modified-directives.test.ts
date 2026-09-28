import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  document.body.innerHTML = '';
});

// processDirective strips modifiers from the name before binding, and used to
// remove that stripped name — which never existed — so the real attribute
// survived compile.
describe('directives written with modifiers', () => {
  test('are removed from the element once bound', async () => {
    document.body.innerHTML = `
      <div v-scope="{ x: '', vb: '0 0 1 1' }">
        <a id="a" @click.prevent="1" @keyup.enter="1" v-model.trim="x" :view-box.camel="vb"></a>
      </div>`;
    createApp().mount();
    await tick();

    const left = [...document.getElementById('a')!.attributes]
      .map((a) => a.name)
      .filter((n) => /^(@|:|v-)/.test(n));
    expect(left).toEqual([]);
  });

  test('a second mount of the same element does not bind listeners twice', async () => {
    let calls = 0;
    document.body.innerHTML = `<div id="r" v-scope><button @click.stop="hit()"></button></div>`;
    const app = createApp({ hit: () => calls++ });
    app.mount('#r');
    app.mount('#r');
    await tick();

    document.querySelector('button')!.click();

    expect(calls).toBe(1);
  });

  test('v-model with a modifier still waits for :value', async () => {
    // written before :value, which v-model must read to set `checked`
    document.body.innerHTML = `
      <div v-scope="{ picked: 1 }">
        <input type="radio" v-model.number="picked" :value="1" />
        <input type="radio" v-model.number="picked" :value="2" />
      </div>`;
    createApp().mount();
    await tick();

    const [one, two] = document.querySelectorAll('input');
    expect([one.checked, two.checked]).toEqual([true, false]);
  });
});
